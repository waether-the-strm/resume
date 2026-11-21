import { expect, test, type Locator, type Page } from "@playwright/test"

// Polish at 390×664 does not fit until the short-phone layout lands.
// https://github.com/waether-the-strm/resume/issues/13
const POLISH_PHONE_FIT = "https://github.com/waether-the-strm/resume/issues/13"

const locales = [
  { path: "/", lang: "en" },
  { path: "/pl/", lang: "pl" },
] as const

const viewports = [
  { width: 1280, height: 820 },
  { width: 1280, height: 700 },
  { width: 390, height: 664 },
] as const

const alternates = [
  { hreflang: "en", href: "https://strm.dev/" },
  { hreflang: "pl", href: "https://strm.dev/pl/" },
  { hreflang: "x-default", href: "https://strm.dev/" },
] as const

async function openFinishedPage(page: Page, path: string) {
  await page.goto(path)
  // A fallback face is narrower, so the fit check must not run until a Recursive face
  // has actually loaded. `fonts.check` can be true when the browser gives up and
  // substitutes, which is not the same thing.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        await document.fonts.ready
        return [...document.fonts]
          .filter((face) => face.family === "Recursive Variable")
          .map((face) => face.status)
          .join(" ")
      })
    )
    .toContain("loaded")
}

async function expectFinishedPage(page: Page) {
  const message = page.locator(".message")
  await expect(message.locator(".headline")).toBeVisible()
  await expect(message.locator(".lead")).toBeVisible()
  await expect(message.locator(".ui-tiles")).toBeVisible()
  await expect(message.locator(".who")).toBeVisible()
  await expect(message.locator(".call")).toBeVisible()

  const card = page.locator(".card")
  await expect(card).toBeVisible()
  const paths = card.locator("nav.ui-paths > a")
  await expect(paths).toHaveCount(3)
  for (const path of await paths.all()) await expect(path).toBeVisible()

  const projects = page.locator("ul.ui-work > li")
  await expect(projects).toHaveCount(3)
  for (const project of await projects.all()) await expect(project).toBeVisible()
}

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(
    widths.scrollWidth,
    `horizontal overflow ${widths.scrollWidth - widths.clientWidth}px`
  ).toBeLessThanOrEqual(widths.clientWidth)
}

async function expectLanguage(page: Page, lang: string) {
  await expect(page.locator("html")).toHaveAttribute("lang", lang)
  const links = page.locator('link[rel="alternate"][hreflang]')
  await expect(links).toHaveCount(alternates.length)
  for (const alternate of alternates) {
    await expect(
      page.locator(`link[rel="alternate"][hreflang="${alternate.hreflang}"]`)
    ).toHaveAttribute("href", alternate.href)
  }
}

async function expectVisibleFocus(page: Page, locator: Locator) {
  await expect(locator).toBeFocused()
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()
  expect(box, "focused control has a box").not.toBeNull()
  expect(viewport, "viewport is set").not.toBeNull()
  if (!box || !viewport) return
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
  const ring = await locator.evaluate((el) => {
    const style = getComputedStyle(el)
    return {
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
    }
  })
  expect(ring.style).not.toBe("none")
  expect(ring.width).toBeGreaterThan(0)
}

async function expectMessageFits(page: Page) {
  const viewport = page.viewportSize()
  expect(viewport, "viewport is set").not.toBeNull()
  if (!viewport) return
  const headline = await page.locator(".message .headline").boundingBox()
  const pill = await page.locator(".message a.ui-pill").boundingBox()
  expect(headline, "headline has a box").not.toBeNull()
  expect(pill, "pill has a box").not.toBeNull()
  if (!headline || !pill) return
  const pillBottom = pill.y + pill.height
  const fit = `headline top ${headline.y}px, pill bottom ${pillBottom}px, viewport ${viewport.width}×${viewport.height}`
  test.info().annotations.push({ type: "measurement", description: fit })
  expect(headline.y, fit).toBeGreaterThanOrEqual(0)
  expect(pillBottom, fit).toBeLessThanOrEqual(viewport.height)
  expect(headline.x).toBeGreaterThanOrEqual(0)
  expect(headline.x + headline.width).toBeLessThanOrEqual(viewport.width)
  expect(pill.x).toBeGreaterThanOrEqual(0)
  expect(pill.x + pill.width).toBeLessThanOrEqual(viewport.width)
}

function isZeroDuration(value: string) {
  const match = /^(-?\d*\.?\d+)(ms|s)$/.exec(value)
  if (!match) return false
  const amount = Number(match[1])
  const unit = match[2]
  if (amount === undefined || unit === undefined) return false
  return (unit === "s" ? amount * 1000 : amount) === 0
}

async function expectReducedMotion(page: Page) {
  const motion = await page.evaluate(() =>
    ["--motion-micro", "--motion-enter", "--motion-move", "--motion-scene"].map((name) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    )
  )
  // Chromium serializes a zero time as 0s. The declared value is 0ms.
  expect(motion.every(isZeroDuration), motion.join(", ")).toBe(true)
}

test.describe("static page, JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false })

  for (const viewport of viewports) {
    for (const locale of locales) {
      test.describe(`${locale.lang} ${viewport.width}×${viewport.height}`, () => {
        test.use({ viewport: { width: viewport.width, height: viewport.height } })

        test.beforeEach(async ({ page }) => {
          await openFinishedPage(page, locale.path)
        })

        test("shows the finished page", async ({ page }) => {
          await expectFinishedPage(page)
        })

        test("does not overflow horizontally", async ({ page }) => {
          await expectNoHorizontalOverflow(page)
        })

        test("sets lang and hreflang", async ({ page }) => {
          await expectLanguage(page, locale.lang)
        })

        test("keyboard focus is visible (F5)", async ({ page }) => {
          const skip = page.locator("a.skip")
          const pill = page.locator(".message a.ui-pill")
          const paths = page.locator(".card nav.ui-paths > a")

          await page.keyboard.press("Tab")
          await expectVisibleFocus(page, skip)

          await page.keyboard.press("Tab")
          await expectVisibleFocus(page, pill)

          await expect(paths).toHaveCount(3)
          for (const path of await paths.all()) {
            await page.keyboard.press("Tab")
            await expectVisibleFocus(page, path)
          }
        })
      })
    }
  }

  test.describe("390×664 message fit (G9)", () => {
    test.use({ viewport: { width: 390, height: 664 } })

    test("English message from the headline to the pill is inside the viewport", async ({
      page,
    }) => {
      expect(page.viewportSize()).toEqual({ width: 390, height: 664 })
      await openFinishedPage(page, "/")
      await expectMessageFits(page)
    })

    // Expected to fail until the short-phone layout in #13. The assertion is unchanged;
    // Playwright records the failure and links the issue. Do not weaken the measurement.
    test(
      "Polish message from the headline to the pill is inside the viewport",
      {
        annotation: {
          type: "issue",
          description: POLISH_PHONE_FIT,
        },
      },
      async ({ page }) => {
        test.fail(POLISH_PHONE_FIT)
        expect(page.viewportSize()).toEqual({ width: 390, height: 664 })
        await openFinishedPage(page, "/pl/")
        await expectMessageFits(page)
      }
    )
  })
})

test.describe("reduced motion is the finished page (F1)", () => {
  test.use({ javaScriptEnabled: false, reducedMotion: "reduce" })

  for (const viewport of viewports) {
    for (const locale of locales) {
      test(`${locale.lang} ${viewport.width}×${viewport.height}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await openFinishedPage(page, locale.path)
        await expectReducedMotion(page)
        await expectFinishedPage(page)
      })
    }
  }
})
