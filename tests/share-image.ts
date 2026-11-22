/**
 * Redraws the share images from the finished home page, in the light theme.
 *
 * The page has to be a build of this repo, already being served:
 *
 *   pnpm --filter @strm/site exec astro preview --host 127.0.0.1 --port 4355
 *   SHARE_ORIGIN=http://127.0.0.1:4355 pnpm --filter @strm/tests exec node share-image.ts
 *
 * Writes apps/site/public/share/en.png and pl.png. The pixel size is
 * `shareWidth` × `shareHeight` in apps/site/src/lib/share.ts (1200×630, the
 * card issue #144 asks for). It is not a number from the prototype.
 *
 * The capture is the finished message, centred on the page's own paper. The
 * blob, the rail and the footer are navigation, and at 630px tall they crowd
 * the card. Nothing in the product stylesheet is changed for the picture.
 */
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"
import { shareHeight, shareWidth } from "../apps/site/src/lib/share.ts"

const origin = process.env.SHARE_ORIGIN ?? "http://127.0.0.1:4355"
const directory = join(dirname(fileURLToPath(import.meta.url)), "../apps/site/public/share")

const pages = [
  { path: "/", file: "en.png" },
  { path: "/pl/", file: "pl.png" },
] as const

const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: shareWidth, height: shareHeight },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    colorScheme: "light",
  })
  await page.addInitScript(() => {
    localStorage.setItem("strm-theme", "light")
    localStorage.setItem("strm-motion", "reduced")
  })
  mkdirSync(directory, { recursive: true })
  for (const entry of pages) {
    await page.goto(new URL(entry.path, origin).href, { waitUntil: "networkidle" })
    await page.evaluate(async () => {
      await document.fonts.ready
    })
    await page.evaluate(() => {
      const style = document.createElement("style")
      style.textContent = `
        .blob, footer, .skip, .guide, .rail, .jan, .exit-map, .equation, .equation-filter {
          display: none !important;
        }
        main { max-width: 1040px; }
        .stage {
          min-height: 100svh !important;
          height: 100svh;
          padding-block: 48px !important;
          display: grid;
          align-items: center;
        }
      `
      document.head.append(style)
    })
    const box = await page.locator(".message").boundingBox()
    if (!box) throw new Error(`No message on ${entry.path}`)
    if (box.y < 0 || box.y + box.height > shareHeight) {
      throw new Error(
        `${entry.path} message does not fit the card: y ${box.y}, height ${box.height}, card ${shareHeight}`
      )
    }
    const file = join(directory, entry.file)
    await page.screenshot({ path: file, type: "png", animations: "disabled" })
    console.log(
      `${entry.file} ${box.width.toFixed(0)}×${box.height.toFixed(0)} at y ${box.y.toFixed(0)}`
    )
  }
} finally {
  await browser.close()
}
