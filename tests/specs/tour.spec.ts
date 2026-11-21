import { expect, test } from "@playwright/test"

// The tour runs only when motion is allowed.
test.use({ contextOptions: { reducedMotion: "no-preference" } })

const locales = ["/", "/pl/"] as const

for (const path of locales) {
  test.describe(`the tour at ${path}`, () => {
    test("A8: the equation complete, with `how?` on the left and answered", async ({ page }) => {
      await page.goto(`${path}?stage=0&t=0.58`)
      const equation = page.locator(".equation")
      await expect(equation).toBeVisible()
      await expect(equation).toHaveAttribute("data-left", "")
      await expect(equation.locator(".row[data-asked]")).toHaveCount(3)
      await expect(equation.locator('.a[data-melt="in"]')).toHaveCount(4)
      await expect(page.locator(".guide")).toBeHidden()
    })

    test("A4: the question comes before its answer", async ({ page }) => {
      await page.goto(`${path}?stage=0&t=0.13`)
      const equation = page.locator(".equation")
      await expect(equation.locator(".row[data-asked]")).toHaveCount(1)
      await expect(equation.locator(".a[data-melt]")).toHaveCount(0)
    })

    test("t=0.9 is not an empty page: `how` is already in the corner", async ({ page }) => {
      await page.goto(`${path}?stage=0&t=0.9`)
      await expect(page.locator(".equation")).toHaveAttribute("data-gone", "")
      await expect(page.locator(".guide .how")).toBeVisible()
      await expect(page.locator(".guide .how")).toHaveCSS("opacity", "1")
    })

    test("A12: the equation is off the page and the guide has `how`", async ({ page }) => {
      await page.goto(`${path}?stage=0&t=0.95`)
      await expect(page.locator(".equation")).toBeHidden()
      await expect(page.locator(".guide .how")).toBeVisible()
    })

    test("B3: the words scene is one block, with no notes and no boxes", async ({ page }) => {
      await page.goto(`${path}?stage=1&t=1`)
      const message = page.locator(".message")
      await expect(message).toHaveAttribute("data-skin", "words")
      await expect(page.locator(".guide")).toHaveAttribute("data-step", "1")
      await expect(message.locator(".note").first()).toBeHidden()
      // One paragraph of running text: the headline and the call share a line box flow.
      await expect(message.locator(".blk").first()).toHaveCSS("display", "inline")
      await expect(message.locator(".blk").last()).toHaveCSS("opacity", "1")
    })

    test("B2: later sentences are still faded", async ({ page }) => {
      await page.goto(`${path}?stage=1&t=0.3`)
      const blocks = page.locator(".message .blk")
      await expect(blocks.first()).toHaveCSS("opacity", "1")
      await expect(blocks.last()).toHaveCSS("opacity", "0")
    })

    test("C2 to C5: five boxes, and the notes unfold with progress", async ({ page }) => {
      await page.goto(`${path}?stage=2&t=0.1`)
      const message = page.locator(".message")
      await expect(message).toHaveAttribute("data-skin", "structure")
      await expect(message.locator(".note")).toHaveCount(5)
      await expect(message.locator(".note").first()).toBeVisible()
      await expect(message).toHaveAttribute("data-note", "0")
      for (const [t, step] of [
        ["0.3", "1"],
        ["0.5", "2"],
        ["0.8", "3"],
      ] as const) {
        await page.goto(`${path}?stage=2&t=${t}`)
        await expect(message).toHaveAttribute("data-note", step)
      }
      await expect(message.locator(".note").first()).toContainText('as="h1"')
    })

    test("D6: the look is the finished page, with the payoff under the guide", async ({ page }) => {
      await page.goto(`${path}?stage=3&t=1`)
      const message = page.locator(".message")
      await expect(message).toHaveAttribute("data-skin", "look")
      await expect(message.locator("a.ui-pill")).toBeVisible()
      await expect(message.locator('[data-block="call"]')).toHaveCSS("opacity", "1")
      await expect(page.locator(".guide .pay")).toHaveCSS("opacity", "1")
    })

    test("D3: the tiles arrive one by one", async ({ page }) => {
      await page.goto(`${path}?stage=3&t=0.2`)
      const tiles = page.locator(".message li")
      await expect(tiles.nth(0)).toHaveCSS("opacity", "1")
      expect(
        Number(await tiles.nth(2).evaluate((el) => getComputedStyle(el).opacity))
      ).toBeLessThan(1)
      await expect(page.locator('.message [data-block="call"]')).toHaveCSS("opacity", "0")
    })

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
