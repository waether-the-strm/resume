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
