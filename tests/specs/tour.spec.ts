import { expect, test } from "@playwright/test"

// The tour runs only when motion is allowed.
test.use({ contextOptions: { reducedMotion: "no-preference" } })

const locales = ["/", "/pl/"] as const

for (const path of locales) {
  test.describe(`the tour at ${path}`, () => {
    // Rows A to E live in scenarios-a-e.spec.ts. What stays here is the live scroll,
    // and below the file, reduced motion and no JavaScript.
    test("scrolling takes the same message through the scenes, heading first", async ({ page }) => {
      await page.goto(path)
      const message = page.locator(".message")
      const stage = page.locator(".stage")
      await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
      await expect(stage).toHaveAttribute("data-scene", "0")
      const words = await message.locator(".ui-w").count()

      const screen = await page.evaluate(() => innerHeight)
      // Into the hold of "the words", then of "the structure", then the end of the track.
      for (const [screens, skin, step] of [
        [1.9, "words", "1"],
        [2.4, "structure", "2"],
        [4.2, "look", "3"],
      ] as const) {
        await page.evaluate((y) => scrollTo(0, y), Math.round(screens * screen))
        await expect(page.locator(".guide")).toHaveAttribute("data-step", step)
        await expect(message).toHaveAttribute("data-skin", skin)
      }
      // One DOM: the same word elements from the first scene to the last.
      expect(await message.locator(".ui-w").count()).toBe(words)

      await page.evaluate(() => scrollTo(0, 0))
      await expect(stage).toHaveAttribute("data-scene", "0")
    })
  })
}

test.describe("keys and sound", () => {
  /** The stop the page has come to rest on, as the guide and the stage show it. */
  const scene = (page: import("@playwright/test").Page) =>
    page.locator(".stage").getAttribute("data-scene")
  const settled = async (page: import("@playwright/test").Page) => {
    let last = -1
    await expect
      .poll(
        async () => {
          const now = await page.evaluate(() => Math.round(scrollY))
          const still = now === last
          last = now
          return still
        },
        { intervals: [400], timeout: 8000 }
      )
      .toBe(true)
    return last
  }

  test("G4: the keys step from stop to stop, forward and back", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    const start = await settled(page)

    await page.keyboard.press("ArrowDown")
    const first = await settled(page)
    expect(first, "ArrowDown moves on").toBeGreaterThan(start)

    await page.keyboard.press("PageDown")
    const second = await settled(page)
    expect(second, "PageDown moves on").toBeGreaterThan(first)

    await page.keyboard.press("Space")
    const third = await settled(page)
    expect(third, "Space moves on").toBeGreaterThan(second)

    await page.keyboard.press("Shift+Space")
    expect(await settled(page), "Shift+Space goes back one stop").toBe(second)
    await page.keyboard.press("PageUp")
    expect(await settled(page), "PageUp goes back one stop").toBe(first)
    await page.keyboard.press("ArrowUp")
    // A step lands in the middle of a hold, and the first hold is 0.05 of a screen long.
    const back = await settled(page)
    expect(back, "ArrowUp goes back into the first hold").toBeLessThan(first)
    expect(back).toBeLessThanOrEqual(Math.ceil(0.05 * (await page.evaluate(() => innerHeight))))
    expect(await scene(page)).toBe("0")
  })

  test("G4: after the last stop the next key lands on the card", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    await settled(page)

    // Twelve stops: eleven steps reach the last, one more leaves the tour for the card.
    for (let step = 0; step < 11; step++) {
      await page.keyboard.press("ArrowDown")
      await settled(page)
    }
    await expect(page.locator(".message")).toHaveAttribute("data-skin", "look")
    await page.keyboard.press("ArrowDown")
    await settled(page)
    const card = await page.locator("#jan").boundingBox()
    expect(Math.abs(card?.y ?? 999), "the card is at the top of the screen").toBeLessThan(12)
  })

  test("G8: a stop clicks once it is entered, but never before a gesture, and not when sound is off", async ({
    page,
  }) => {
    // Count the oscillators the page starts instead of listening.
    await page.addInitScript(() => {
      const counter = { started: 0 }
      ;(window as unknown as { __clicks: typeof counter }).__clicks = counter
      const Real = window.AudioContext
      window.AudioContext = class extends Real {
        override createOscillator() {
          const oscillator = super.createOscillator()
          const start = oscillator.start.bind(oscillator)
          oscillator.start = (when?: number) => {
            counter.started += 1
            start(when)
          }
          return oscillator
        }
      }
    })
    const clicks = () =>
      page.evaluate(() => (window as unknown as { __clicks: { started: number } }).__clicks.started)

    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    const screen = await page.evaluate(() => innerHeight)

    // No gesture yet: entering a hold is silent.
    await page.evaluate((y) => scrollTo(0, y), Math.round(0.3 * screen))
    await settled(page)
    expect(await clicks(), "silent before the first gesture").toBe(0)

    // A key is a gesture; the step it makes enters a hold.
    await page.keyboard.press("ArrowDown")
    await settled(page)
    const afterKey = await clicks()
    expect(afterKey, "a click on entering a hold").toBeGreaterThan(0)

    // Sound off in the reader's preferences: the next hold is silent.
    await page.evaluate(() => localStorage.setItem("strm-sound", "0"))
    await page.keyboard.press("ArrowDown")
    await settled(page)
    expect(await clicks(), "silent while sound is off").toBe(afterKey)
  })
})

test("reduced motion never starts the tour", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" })
  const page = await context.newPage()
  await page.goto("/")
  await expect(page.locator("html")).not.toHaveAttribute("data-tour")
  await expect(page.locator(".message")).toHaveAttribute("data-skin", "look")
  await expect(page.locator(".guide")).toBeHidden()
  await context.close()
})

test("without JavaScript the page is the finished look", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto("/")
  await expect(page.locator(".message a.ui-pill")).toBeVisible()
  await expect(page.locator(".equation")).toBeHidden()
  await expect(page.locator(".message .note").first()).toBeHidden()
  await context.close()
})
