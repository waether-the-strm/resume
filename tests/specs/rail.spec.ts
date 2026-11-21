import { expect, test, type Page } from "@playwright/test"

async function chapterDigits(page: Page): Promise<string[]> {
  return page
    .locator(".ui-rail__num")
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node, "::before").content))
}

// Reduced motion is the suite default: the rail is in the HTML and stays hidden,
// because the tour is what shows it.

test.describe("the rail on the finished page", () => {
  test("the server renders every stop, and the tour is what shows them", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("html")).not.toHaveAttribute("data-tour", /.+/)
    await expect(page.locator(".ui-rail")).toBeHidden()
    await expect(page.locator(".ui-rail__stop")).toHaveCount(12)
    await expect(page.locator(".ui-rail__stop.is-chapter")).toHaveCount(4)
    await expect(page.locator(".ui-rail__stop.is-dot")).toHaveCount(8)
    expect(await chapterDigits(page)).toEqual(['"0"', '"1"', '"2"', '"3"'])
    await expect(page.locator(".ui-rail__stop.is-chapter .ui-rail__label")).toHaveText([
      "equation",
      "words",
      "structure",
      "look",
    ])
    await expect(page.locator('.ui-rail__stop[data-number="0.5"]')).toHaveAttribute(
      "aria-label",
      "the equation"
    )
    await expect(page.locator('.ui-rail__stop[data-number="2.3"]')).toHaveAttribute(
      "aria-label",
      "tokens"
    )
    await expect(page.locator(".ui-rail__arrow")).toHaveCount(2)
  })

  test("Polish names come from the content", async ({ page }) => {
    await page.goto("/pl/")
    await expect(page.locator('.ui-rail__stop[data-number="2.3"]')).toHaveAttribute(
      "aria-label",
      "tokeny"
    )
    await expect(page.locator(".ui-rail__stop.is-chapter .ui-rail__label")).toHaveText([
      "równanie",
      "słowa",
      "struktura",
      "wygląd",
    ])
    expect(await chapterDigits(page)).toEqual(['"0"', '"1"', '"2"', '"3"'])
  })
})

test("reduced motion stops the landing cue", async ({ page }) => {
  await page.goto("/ui/primitives/")
  const duration = await page
    .locator(".specimen .ui-rail__stop.is-landed .ui-rail__dot")
    .evaluate((mark) => getComputedStyle(mark).animationDuration)
  expect(duration).toBe("0s")
})

test.describe("the rail in the tour", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } })

  test("a frozen moment shows the chapter and the nearest stop, and does not steer", async ({
    page,
  }) => {
    await page.goto("/?stage=2&t=0.78")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "moment")
    await expect(page.locator(".ui-rail")).toBeVisible()
    await expect(page.locator('.ui-rail__stop[data-number="2.1"]')).toHaveAttribute(
      "aria-current",
      "true"
    )
    await expect(page.locator('.ui-rail__stop[data-number="2.3"]')).toHaveClass(/is-nearest/)
    await expect(page.locator(".ui-rail__stop.is-landed")).toHaveCount(0)
    await expect(page.locator('.ui-rail__arrow[data-dir="-1"]')).toBeDisabled()
    await expect(page.locator('.ui-rail__arrow[data-dir="1"]')).toBeDisabled()
  })

  test("G11: the rail marks the chapter and the nearest stop before the scene renders", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    const sample = await page.evaluate(async () => {
      const stage = document.querySelector<HTMLElement>(".stage")
      const track = document.querySelector<HTMLElement>(".track")
      if (!stage || !track) return null
      const top = track.getBoundingClientRect().top + window.scrollY
      // Inside the hold of "the words" (stage 1). The scene beat is 480ms, so the
      // page is still showing the equation when the rail has already moved.
      window.scrollTo(0, top + 2.2 * stage.offsetHeight)
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined)))
      })
      return {
        chapter: document
          .querySelector(".ui-rail__stop[aria-current='true']")
          ?.getAttribute("data-number"),
        nearest: document.querySelector(".ui-rail__stop.is-nearest")?.getAttribute("data-number"),
        skin: document.querySelector(".message")?.getAttribute("data-skin"),
      }
    })
    expect(sample).toEqual({ chapter: "1.1", nearest: "1.1", skin: "none" })
  })

  test("G5: ticks, dots and arrows go to a stop, and the landed marker animates once", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    await expect(page.locator(".ui-rail")).toBeVisible()

    const next = page.locator('.ui-rail__arrow[data-dir="1"]')
    const previous = page.locator('.ui-rail__arrow[data-dir="-1"]')
    await expect(previous).toBeDisabled()
    await next.click()
    const what = page.locator('.ui-rail__stop[data-index="1"]')
    await expect(what).toHaveClass(/is-landed/, { timeout: 5_000 })
    await expect(page.locator('.ui-rail__stop[data-index="2"]')).not.toHaveClass(/is-landed/)

    await previous.click()
    await expect(page.locator('.ui-rail__stop[data-index="0"]')).toHaveClass(/is-landed/, {
      timeout: 5_000,
    })

    const before = await page.evaluate(() => window.scrollY)
    const tokens = page.locator('.ui-rail__stop[data-number="2.3"]')
    await tokens.click()
    await expect(tokens).toHaveClass(/is-landed/, { timeout: 5_000 })
    await expect(page.locator('.ui-rail__stop[data-number="2.1"]')).toHaveAttribute(
      "aria-current",
      "true"
    )
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before)

    const dot = await tokens.locator(".ui-rail__dot").evaluate((mark) => {
      const style = getComputedStyle(mark)
      return {
        name: style.animationName,
        count: style.animationIterationCount,
        duration: style.animationDuration,
      }
    })
    expect(dot).toEqual({ name: "ui-rail-land-dot", count: "1", duration: "0.5s" })

    const words = page.locator('.ui-rail__stop[data-number="1.1"]')
    await words.click()
    await expect(words).toHaveClass(/is-landed/, { timeout: 5_000 })
    const tick = await words.locator(".ui-rail__tick").evaluate((mark) => {
      const style = getComputedStyle(mark)
      return { name: style.animationName, count: style.animationIterationCount }
    })
    expect(tick).toEqual({ name: "ui-rail-land", count: "1" })
  })

  test("on a phone the rail is a 44px gutter of ticks", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 664 })
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    const box = await page.locator(".ui-rail").boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeCloseTo(44, 0)
    expect(box!.x + box!.width).toBeCloseTo(390, 0)
    await expect(page.locator(".ui-rail__stop.is-dot").first()).toBeHidden()
    await expect(page.locator(".ui-rail__num").first()).toBeHidden()
    await expect(page.locator(".ui-rail__stop.is-chapter").first()).toBeVisible()
    await expect(page.locator(".ui-rail__arrow").first()).toBeVisible()
  })
})
