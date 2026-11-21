import { expect, test } from "@playwright/test"

// The finished page: reduced motion, no tour. The server's blob is the last stop.
test.describe("the blob on the finished page", () => {
  test("G10 at rest: the look's number and title, the name folded, the menu inert", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page.locator("html")).not.toHaveAttribute("data-tour", /.*/)
    const current = page.locator(".ui-blob__stop.is-current")
    await expect(current.locator(".ui-blob__num")).toHaveAttribute("data-mark", "3.2")
    await expect(current.locator(".ui-blob__label")).toHaveText("the look")
    await expect(page.locator(".ui-blob")).toHaveClass(/is-slim/)
    await expect(page.locator(".ui-blob__id")).toHaveAttribute("inert", "")
    await expect(page.locator(".ui-blob__menu")).toHaveAttribute("inert", "")
    await expect(page.locator(".ui-blob__menu").locator("button, a")).toHaveCount(3)
    await expect(page.locator(".ui-blob__title")).toHaveAttribute("tabindex", "-1")
  })

  test("Polish keeps the same number and uses the Polish title", async ({ page }) => {
    await page.goto("/pl/")
    const current = page.locator(".ui-blob__stop.is-current")
    await expect(current.locator(".ui-blob__num")).toHaveAttribute("data-mark", "3.2")
    await expect(current.locator(".ui-blob__label")).toHaveText("wygląd")
  })
})

test.describe("the blob on the tour", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } })

  test("G10: the nearest stop, numbered by chapter, and the name leads to the card", async ({
    page,
  }) => {
    const cases = [
      ["0", "0", "0", "w+w+w"],
      ["1", "1", "1", "the words"],
      ["2", "0.78", "2.3", "tokens"],
      ["3", "0.32", "3.1", "the tiles"],
    ] as const
    for (const [stage, t, number, title] of cases) {
      await page.goto(`/?stage=${stage}&t=${t}`)
      const current = page.locator(".ui-blob__stop.is-current")
      await expect(current.locator(".ui-blob__num")).toHaveAttribute("data-mark", number)
      await expect(current.locator(".ui-blob__label")).toHaveText(title)
      await expect(page.locator(".ui-blob")).not.toHaveClass(/is-slim/)
      const name = page.locator(".ui-blob__id")
      await expect(name).toBeVisible()
      await expect(name).toHaveAttribute("href", "#jan")
      await expect(name).not.toHaveAttribute("inert", "")
      await expect(page.locator(".ui-blob__title")).toHaveAttribute("tabindex", "0")
    }
  })

  test("G10: the name folds away on the finished look, and the card reads `the card`", async ({
    page,
  }) => {
    await page.goto("/?stage=3&t=1")
    const look = page.locator(".ui-blob__stop.is-current")
    await expect(look.locator(".ui-blob__num")).toHaveAttribute("data-mark", "3.2")
    await expect(look.locator(".ui-blob__label")).toHaveText("the look")
    await expect(page.locator(".ui-blob")).toHaveClass(/is-slim/)
    await expect(page.locator(".ui-blob__id")).toHaveAttribute("inert", "")

    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const after = page.locator(".ui-blob__stop.is-current")
    await expect(after).toHaveAttribute("data-stop", "after")
    await expect(after.locator(".ui-blob__label")).toHaveText("the card")
    await expect(after.locator(".ui-blob__num")).toHaveCount(0)
    await expect(page.locator(".ui-blob")).toHaveClass(/is-slim/)
    await expect(page.locator(".ui-blob__tldr")).toHaveAttribute("data-after", "")
  })

  test("the name's accessible name contains the signature and says where it goes", async ({
    page,
  }) => {
    await page.goto("/?stage=0&t=0")
    const name = page.locator(".ui-blob__id")
    await expect(name).toContainText("Jan Mirecki · design engineer · Oslo")
    const label = await name.getAttribute("aria-label")
    expect(label).toContain("Jan Mirecki · design engineer · Oslo")
    expect(label).toContain("the card")
    await name.click()
    await expect(page.locator("#jan")).toBeInViewport()

    await page.goto("/pl/?stage=0&t=0")
    const polish = await page.locator(".ui-blob__id").getAttribute("aria-label")
    expect(polish).toContain("Jan Mirecki · design engineer · Oslo")
    expect(polish).toContain("wizytówka")
  })

  test("tldr is a visible link to the card, and its name contains the visible text", async ({
    page,
  }) => {
    await page.goto("/?stage=0&t=0")
    const tldr = page.locator(".ui-blob__tldr")
    await expect(tldr).toBeVisible()
    await expect(tldr).toHaveText("tldr")
    await expect(tldr).toHaveAttribute("href", "#jan")
    const label = await tldr.getAttribute("aria-label")
    expect(label).toContain("tldr")
    expect(label).toContain("card")

    await page.goto("/pl/?stage=0&t=0")
    const polish = page.locator(".ui-blob__tldr")
    await expect(polish).toHaveText("tldr")
    const polishLabel = await polish.getAttribute("aria-label")
    expect(polishLabel).toContain("tldr")
    expect(polishLabel).toContain("wizytówki")
  })

  test("tldr is visible at the desktop widths and hidden at 390", async ({ page }) => {
    const tldr = page.locator(".ui-blob__tldr")
    await page.setViewportSize({ width: 1280, height: 820 })
    await page.goto("/")
    await expect(tldr).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 700 })
    await expect(tldr).toBeVisible()
    await page.setViewportSize({ width: 390, height: 664 })
    await expect(tldr).toBeHidden()
  })

  test("G12: three controls, sound is the preference, and the menu folds back", async ({
    page,
  }) => {
    await page.clock.install()
    await page.goto("/?stage=2&t=0.78")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "moment")
    const menu = page.locator(".ui-blob__menu")
    const title = page.locator(".ui-blob__title")
    await expect(menu).toHaveAttribute("inert", "")
    await expect(menu.locator("button, a")).toHaveCount(3)
    await expect(menu.locator("[data-blob='sound']")).toContainText("sound")
    await expect(menu.locator("[data-blob='start']")).toContainText("the start")
    await expect(menu.locator("[data-blob='work']")).toHaveAttribute("href", "#work")

    await title.focus()
    await page.keyboard.press("Enter")
    await expect(title).toHaveAttribute("aria-expanded", "true")
    await expect(menu).not.toHaveAttribute("inert", "")

    const sound = menu.locator("[data-blob='sound']")
    await sound.click()
    await expect(sound).toHaveAttribute("aria-pressed", "false")
    await expect(page.locator(".ui-blob")).toHaveAttribute("data-sound", "off")
    const struck = await page
      .locator(".ui-blob__note")
      .evaluate((element) => getComputedStyle(element, "::after").content)
    expect(struck).not.toBe("none")
    expect(await page.evaluate(() => localStorage.getItem("strm-sound"))).toBe("0")
    await sound.click()
    await expect(sound).toHaveAttribute("aria-pressed", "true")
    expect(await page.evaluate(() => localStorage.getItem("strm-sound"))).toBe("1")

    await page.keyboard.press("Escape")
    await expect(title).toBeFocused()
    await expect(menu).toHaveAttribute("inert", "")

    await page.keyboard.press("Enter")
    await page.mouse.click(8, 8)
    await expect(menu).toHaveAttribute("inert", "")

    await page.keyboard.press("Enter")
    await page.clock.fastForward(4500)
    await expect(menu).toHaveAttribute("inert", "")
  })

  test("G12: a mouse opens it, and scrolling on folds it", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    const menu = page.locator(".ui-blob__menu")
    await page.locator(".ui-blob").hover()
    await expect(menu).not.toHaveAttribute("inert", "")
    await page.mouse.move(8, 8)
    await page.mouse.wheel(0, 80)
    await expect(menu).toHaveAttribute("inert", "")
  })

  test("the start returns to the first stop", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2))
    await expect(page.locator(".ui-blob__stop.is-current")).not.toHaveAttribute("data-stop", "0")
    // The scroll settles into a hold. Opening before it has stopped folds the blob again.
    await page.waitForFunction(() => {
      const y = window.scrollY
      return new Promise((resolve) => {
        window.setTimeout(() => resolve(Math.abs(window.scrollY - y) < 2), 500)
      })
    })
    await page.locator(".ui-blob__title").focus()
    await page.keyboard.press("Enter")
    await page.locator("[data-blob='start']").click()
    await expect(page.locator(".ui-blob__stop.is-current")).toHaveAttribute("data-stop", "0")
    await expect(page.locator(".ui-blob__menu")).toHaveAttribute("inert", "")
  })
})
