import { expect, test, type Page } from "../fixture.ts"

// The theme lives in the blob (ADR 0012, #147). These specs ran on the footer's switch; the
// behaviour is the same, asserted on the blob on the finished page.
const paths = ["/", "/pl/"] as const

async function paper(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor)
}

async function openSettings(page: Page) {
  const title = page.locator(".ui-blob__title")
  await expect(title).toHaveAttribute("tabindex", "0")
  await title.focus()
  await page.keyboard.press("Enter")
  await page.locator("[data-blob='settings']").click()
  return page.locator("[data-blob='theme']")
}

test.describe("theme switch in the blob", () => {
  // Light system scheme, so dark is a visible change and "system" is not already dark.
  // Reduced motion keeps the finished page: the blob's menu starts without the tour.
  test.use({ contextOptions: { reducedMotion: "reduce", colorScheme: "light" } })

  for (const path of paths) {
    test(`${path}: system, light and dark, and dark survives a reload`, async ({ page }) => {
      await page.goto(path)
      const theme = await openSettings(page)
      const html = page.locator("html")

      await expect(html).not.toHaveAttribute("data-theme")
      await expect(theme.locator(".is-on")).toHaveText("system")
      const systemPaper = await paper(page)

      await theme.click()
      await expect(html).toHaveAttribute("data-theme", "light")
      await expect(theme.locator(".is-on")).toHaveText("light")
      expect(await page.evaluate(() => localStorage.getItem("strm-theme"))).toBe("light")

      await theme.click()
      await expect(html).toHaveAttribute("data-theme", "dark")
      await expect(theme.locator(".is-on")).toHaveText("dark")
      expect(await page.evaluate(() => localStorage.getItem("strm-theme"))).toBe("dark")
      await expect(html).toHaveCSS("color-scheme", "dark")
      expect(await paper(page)).not.toBe(systemPaper)

      // theme-init.js, inline in <head>, restores strm-theme before the first paint. The
      // blob's script only reads the attribute, so dark at this point came from that head
      // script, not from a later correction.
      await page.reload({ waitUntil: "domcontentloaded" })
      await expect(html).toHaveAttribute("data-theme", "dark")
      await expect(html).toHaveCSS("color-scheme", "dark")
      expect(await page.evaluate(() => localStorage.getItem("strm-theme"))).toBe("dark")
      const again = await openSettings(page)
      await expect(again.locator(".is-on")).toHaveText("dark")

      await again.click()
      await expect(html).not.toHaveAttribute("data-theme")
      await expect(again.locator(".is-on")).toHaveText("system")
      expect(await page.evaluate(() => localStorage.getItem("strm-theme"))).toBeNull()
    })
  }
})

test.describe("theme without JavaScript", () => {
  test.use({ javaScriptEnabled: false })

  for (const path of paths) {
    test(`${path}: no theme control is offered, and the page keeps the system's`, async ({
      page,
    }) => {
      await page.goto(path)
      await expect(page.locator(".theme-switch")).toHaveCount(0)
      await expect(page.locator("html")).not.toHaveAttribute("data-theme")
      await expect(page.locator(".ui-blob__title")).not.toHaveAttribute("tabindex", "0")
    })
  }
})
