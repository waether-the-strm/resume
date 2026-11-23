import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test, type APIRequestContext, type Page } from "../fixture.ts"
import { emitsNoindex } from "../../apps/site/src/lib/indexing.ts"
import { shareHeight, shareWidth } from "../../apps/site/src/lib/share.ts"

const root = fileURLToPath(new URL("../../", import.meta.url))

const pages = [
  { path: "/", image: "https://strm.dev/share/en.png" },
  { path: "/pl/", image: "https://strm.dev/share/pl.png" },
  { path: "/cv/", image: "https://strm.dev/share/en.png" },
  { path: "/pl/cv/", image: "https://strm.dev/share/pl.png" },
] as const

interface SitemapUrl {
  loc: string
  lastmod: string
  links: { hreflang: string; href: string }[]
}

function sitemapUrls(xml: string): SitemapUrl[] {
  return xml
    .split("<url>")
    .slice(1)
    .map((block) => {
      const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]
      const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]
      const links = [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((match) => ({
        hreflang: match[1] ?? "",
        href: match[2] ?? "",
      }))
      if (!loc || !lastmod) throw new Error(`Sitemap url is missing loc or lastmod: ${block}`)
      return { loc, lastmod, links }
    })
}

async function sitemap(request: APIRequestContext): Promise<SitemapUrl[]> {
  const response = await request.get("/sitemap-0.xml")
  expect(response.status()).toBe(200)
  return sitemapUrls(await response.text())
}

function commitLastmod(): string {
  const iso = execFileSync("git", ["log", "-1", "--format=%cI"], {
    cwd: root,
    encoding: "utf8",
  }).trim()
  return new Date(iso).toISOString()
}

function pngSize(body: Buffer): { width: number; height: number } {
  expect(body.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
  expect(body.subarray(12, 16).toString("ascii")).toBe("IHDR")
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) }
}

async function jsonLd(page: Page): Promise<Record<string, unknown>> {
  const raw = await page.locator('script[type="application/ld+json"]').textContent()
  expect(raw, "JSON-LD block").toBeTruthy()
  return JSON.parse(raw ?? "") as Record<string, unknown>
}

function personOf(data: Record<string, unknown>): Record<string, unknown> {
  if (data["@type"] === "ProfilePage") return data.mainEntity as Record<string, unknown>
  const graph = data["@graph"] as { "@type": string }[]
  const person = graph.find((node) => node["@type"] === "Person")
  expect(person, "Person node").toBeTruthy()
  return person as Record<string, unknown>
}

test.describe("what a crawler and a link preview get", () => {
  test("canonical, hreflang and the sitemap are the trailing-slash URL", async ({
    page,
    request,
  }) => {
    const listed = await sitemap(request)
    const locs = listed.map((entry) => entry.loc)
    const lastmod = commitLastmod()

    for (const entry of pages) {
      await page.goto(entry.path)
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href")
      expect(canonical, entry.path).toBe(`https://strm.dev${entry.path}`)
      expect(locs, entry.path).toContain(canonical)
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        "content",
        canonical ?? ""
      )

      const row = listed.find((item) => item.loc === canonical)
      expect(row, entry.path).toBeTruthy()
      expect(row?.links, entry.path).toHaveLength(2)
      expect(row?.lastmod).toBe(lastmod)
      for (const link of row?.links ?? []) {
        const alternate = page.locator(`link[rel="alternate"][hreflang="${link.hreflang}"]`)
        await expect(alternate).toHaveAttribute("href", link.href)
      }
    }

    expect(new Set(listed.map((entry) => entry.lastmod))).toEqual(new Set([lastmod]))
    for (const loc of locs) {
      expect(emitsNoindex(new URL(loc).pathname, true), loc).toBe(false)
    }
  })

  test("the home page names a person and a website, and the CV points at that person", async ({
    page,
  }) => {
    await page.goto("/cv/")
    const cv = await jsonLd(page)
    expect(cv["@type"]).toBe("ProfilePage")
    const fromCv = personOf(cv)
    expect(fromCv["@type"]).toBe("Person")
    expect(fromCv.name).toBe((await page.locator("h1").innerText()).trim())
    expect(fromCv.jobTitle).toBe(
      (await page.locator("header.cv-head p.type-lead").innerText()).trim()
    )
    expect(fromCv.address).toBe(
      (
        await page
          .locator("address li")
          .filter({ hasNot: page.locator("a") })
          .first()
          .innerText()
      ).trim()
    )
    const mailto = await page.locator('address a[href^="mailto:"]').getAttribute("href")
    expect(`mailto:${fromCv.email}`).toBe(mailto?.split("?")[0])
    const linkedin = await page.locator('address a[href*="linkedin.com"]').getAttribute("href")
    expect(fromCv.sameAs).toEqual([linkedin])
    const web = await page.locator('address a[href^="https://strm.dev"]').getAttribute("href")
    expect(fromCv.url).toBe(new URL("/", web ?? "https://strm.dev").href)
    expect(cv.url).toBe("https://strm.dev/cv/")
    expect(fromCv["@id"]).toBe("https://strm.dev/#jan")

    await page.goto("/")
    const home = await jsonLd(page)
    const graph = home["@graph"] as {
      "@type": string
      name?: string
      url?: string
      inLanguage?: string
    }[]
    expect(graph.map((node) => node["@type"])).toEqual(["Person", "WebSite"])
    const website = graph.find((node) => node["@type"] === "WebSite")
    expect(website?.name).toBe(await page.title())
    expect(website?.url).toBe("https://strm.dev/")
    expect(website?.inLanguage).toBe("en")
    expect(personOf(home)).toEqual(fromCv)

    await page.goto("/pl/")
    const polish = await jsonLd(page)
    const polishSite = (
      polish["@graph"] as { "@type": string; inLanguage?: string; url?: string }[]
    ).find((node) => node["@type"] === "WebSite")
    expect(polishSite?.inLanguage).toBe("pl")
    expect(polishSite?.url).toBe("https://strm.dev/pl/")
    const polishPerson = personOf(polish)
    expect(polishPerson["@id"]).toBe(fromCv["@id"])
    expect(polishPerson.url).toBe(fromCv.url)
    expect(polishPerson.name).toBe(fromCv.name)

    await page.goto("/pl/cv/")
    const polishCv = await jsonLd(page)
    expect(polishCv["@type"]).toBe("ProfilePage")
    expect(polishCv.url).toBe("https://strm.dev/pl/cv/")
    expect(personOf(polishCv)["@id"]).toBe(fromCv["@id"])
  })

  test("every page points at a share image of the declared size", async ({ page, request }) => {
    const seen = new Map<string, { width: number; height: number }>()
    const targets = [
      ...pages,
      { path: "/ui/", image: "https://strm.dev/share/en.png" },
      { path: "/ui/primitives/", image: "https://strm.dev/share/en.png" },
    ]
    for (const entry of targets) {
      await page.goto(entry.path)
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        entry.image
      )
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
        "content",
        String(shareWidth)
      )
      await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
        "content",
        String(shareHeight)
      )
      const alt = await page.locator('meta[property="og:image:alt"]').getAttribute("content")
      expect(alt?.length, entry.path).toBeGreaterThan(0)
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image"
      )
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
        "content",
        entry.image
      )

      const width = Number(
        await page.locator('meta[property="og:image:width"]').getAttribute("content")
      )
      const height = Number(
        await page.locator('meta[property="og:image:height"]').getAttribute("content")
      )
      let size = seen.get(entry.image)
      if (!size) {
        const response = await request.get(new URL(entry.image).pathname)
        expect(response.status(), entry.image).toBe(200)
        expect(response.headers()["content-type"]).toContain("image/png")
        size = pngSize(await response.body())
        seen.set(entry.image, size)
      }
      expect(size, entry.image).toEqual({ width, height })
    }
  })

  test("a production build does not noindex a page the sitemap lists", async ({ request }) => {
    test.setTimeout(60_000)
    const preview = (await sitemap(request)).map((entry) => entry.loc).sort()
    const out = mkdtempSync(join(tmpdir(), "strm-prod-"))
    try {
      execFileSync("pnpm", ["--filter", "@strm/site", "exec", "astro", "build", "--outDir", out], {
        cwd: root,
        env: { ...process.env, STRM_PRODUCTION: "true" },
        stdio: "pipe",
      })
      const xml = readFileSync(join(out, "sitemap-0.xml"), "utf8")
      const listed = sitemapUrls(xml)
      expect(listed.map((entry) => entry.loc).sort()).toEqual(preview)
      for (const entry of listed) {
        const pathname = new URL(entry.loc).pathname
        expect(emitsNoindex(pathname, true), entry.loc).toBe(false)
        const relative = pathname === "/" ? "index.html" : join(pathname.slice(1), "index.html")
        const html = readFileSync(join(out, relative), "utf8")
        expect(html, entry.loc).not.toContain('name="robots" content="noindex"')
      }
      const catalogue = readFileSync(join(out, "ui/index.html"), "utf8")
      expect(catalogue).toContain('name="robots" content="noindex"')
      expect(xml).not.toContain("https://strm.dev/ui/")
      expect(xml).not.toContain("/404")
    } finally {
      rmSync(out, { recursive: true, force: true })
    }
  })
})
