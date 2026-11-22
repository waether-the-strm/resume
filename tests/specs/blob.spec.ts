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
    await expect(page.locator(".ui-blob__grid").locator("button, a")).toHaveCount(3)
    await expect(page.locator(".ui-blob__strip").locator("button, a")).toHaveCount(3)
    await expect(page.locator(".ui-blob__settings")).toHaveAttribute("inert", "")
    // The server renders the title out of the tab order; the script that starts the menu
    // (the tour, or on its own under reduced motion) makes it a button. This was
    // `tabindex -1` for good on the finished page, before #147.
    await expect(page.locator(".ui-blob__title")).toHaveAttribute("tabindex", "0")
  })

  test("the menu works without the tour: Enter opens, settings unfold, theme steps, Escape folds", async ({
    page,
  }) => {
    await page.goto("/")
    const html = page.locator("html")
    await expect(html).not.toHaveAttribute("data-tour", /.*/)
    const blob = page.locator(".ui-blob")
    const title = page.locator(".ui-blob__title")
    const menu = page.locator(".ui-blob__menu")
    const strip = page.locator(".ui-blob__settings")
    await expect(title).toHaveAttribute("tabindex", "0")

    await title.focus()
    await page.keyboard.press("Enter")
    await expect(title).toHaveAttribute("aria-expanded", "true")
    await expect(menu).not.toHaveAttribute("inert", "")

    await page.locator("[data-blob='settings']").click()
    await expect(blob).toHaveClass(/is-settings/)
    await expect(strip).not.toHaveAttribute("inert", "")

    const theme = page.locator("[data-blob='theme']")
    await expect(theme.locator(".is-on")).toHaveText("system")
    await theme.click()
    await expect(theme.locator(".is-on")).toHaveText("light")
    await expect(html).toHaveAttribute("data-theme", "light")
    expect(await page.evaluate(() => localStorage.getItem("strm-theme"))).toBe("light")

    const sound = page.locator("[data-blob='sound']")
    await sound.click()
    await expect(sound).toHaveAttribute("aria-pressed", "false")
    expect(await page.evaluate(() => localStorage.getItem("strm-sound"))).toBe("0")

    // The title keeps what the server rendered, and the name row stays folded.
    await expect(page.locator(".ui-blob__stop.is-current .ui-blob__label")).toHaveText("the look")
    await expect(blob).toHaveClass(/is-slim/)

    await page.keyboard.press("Escape")
    await expect(menu).toHaveAttribute("inert", "")
    await expect(blob).not.toHaveClass(/is-settings/)
    await expect(title).toBeFocused()
  })

  test("the language link goes to the other language", async ({ page }) => {
    await page.goto("/")
    await page.locator(".ui-blob__title").focus()
    await page.keyboard.press("Enter")
    await page.locator("[data-blob='settings']").click()
    await page.locator("[data-blob='language']").click()
    await expect(page).toHaveURL(/\/pl\/$/)
    await expect(page.locator("html")).toHaveAttribute("lang", "pl")
  })

  test("the start scrolls the finished page to the top", async ({ page }) => {
    await page.goto("/")
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
    await page.locator(".ui-blob__title").focus()
    await page.keyboard.press("Enter")
    await page.locator("[data-blob='start']").click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(page.locator(".ui-blob__menu")).toHaveAttribute("inert", "")
  })

  test("a raised surface, and two columns with settings across the next row", async ({ page }) => {
    await page.goto("/")
    await page.locator(".ui-blob").evaluate((el) => el.classList.add("is-open"))
    const surface = await page.locator(".ui-blob").evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        background: style.backgroundColor,
        borderWidth: style.borderTopWidth,
        borderStyle: style.borderTopStyle,
        borderColor: style.borderTopColor,
        backdrop: style.backdropFilter,
      }
    })
    expect(surface.background).not.toBe("rgba(0, 0, 0, 0)")
    expect(surface.borderWidth).toBe("1px")
    expect(surface.borderStyle).toBe("solid")
    expect(surface.borderColor).not.toBe("rgba(0, 0, 0, 0)")
    expect(surface.backdrop).toBe("none")

    const clip = page.locator(".ui-blob__grid")
    const columns = await clip.evaluate((el) => getComputedStyle(el).gridTemplateColumns)
    expect(columns.trim().split(/\s+/)).toHaveLength(2)
    const boxes = await clip.locator(":scope > *").evaluateAll((els) =>
      els.map((el) => {
        const box = el.getBoundingClientRect()
        return {
          left: Math.round(box.left),
          top: Math.round(box.top),
          right: Math.round(box.right),
        }
      })
    )
    expect(boxes).toHaveLength(3)
    expect(boxes[0]?.top).toBe(boxes[1]?.top)
    expect(boxes[0]?.left).toBeLessThan(boxes[1]?.left ?? 0)
    expect(boxes[2]?.top).toBeGreaterThan(boxes[0]?.top ?? 0)
    expect(boxes[2]?.left).toBe(boxes[0]?.left)
    expect(boxes[2]?.right).toBe(boxes[1]?.right)
  })

  test("the strip: one line at desktop width, quieter than the grid, in a well of its own", async ({
    page,
  }) => {
    await page.goto("/ui/primitives/")
    const blob = page.locator(".ui-blob.is-settings")
    const strip = blob.locator(".ui-blob__strip")
    const tops = await strip
      .locator(":scope > *")
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
    expect(tops).toHaveLength(3)
    expect(new Set(tops).size).toBe(1)

    const sizes = await blob.evaluate((el) => {
      const px = (selector: string) =>
        parseFloat(getComputedStyle(el.querySelector(selector)!).fontSize)
      const ground = (selector: string) =>
        getComputedStyle(el.querySelector(selector) ?? el).backgroundColor
      return {
        grid: px(".ui-blob__grid > *"),
        strip: px(".ui-blob__strip > *"),
        surface: getComputedStyle(el).backgroundColor,
        well: ground(".ui-blob__strip"),
      }
    })
    expect(sizes.strip).toBeLessThan(sizes.grid)
    expect(sizes.well).not.toBe(sizes.surface)

    // Every row starts on the same inner edge: the grid, the strip, the title, the name.
    const edges = await blob.evaluate((el) =>
      [
        ".ui-blob__grid > * > span",
        ".ui-blob__strip > * > span",
        ".ui-blob__stop.is-current",
        ".ui-blob__id-clip > span",
      ].map((selector) => Math.round(el.querySelector(selector)!.getBoundingClientRect().left))
    )
    expect(new Set(edges).size, `left edges ${edges.join(", ")}`).toBe(1)
  })

  test("the strip's targets are 44 px on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 664 })
    await page.goto("/ui/primitives/")
    const heights = await page
      .locator(".ui-blob.is-settings .ui-blob__strip > *")
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))
    expect(heights).toHaveLength(3)
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44)
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

  test("G12: the grid leads somewhere, sound is the preference, and the menu folds back", async ({
    page,
  }) => {
    await page.clock.install()
    await page.goto("/?stage=2&t=0.78")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "moment")
    const menu = page.locator(".ui-blob__menu")
    const title = page.locator(".ui-blob__title")
    await expect(menu).toHaveAttribute("inert", "")
    const grid = menu.locator(".ui-blob__grid")
    await expect(grid.locator("button, a")).toHaveCount(3)
    await expect(grid.locator("[data-blob='start']")).toContainText("the start")
    await expect(grid.locator("[data-blob='work']")).toHaveAttribute("href", "#work")
    await expect(grid.locator("[data-blob='settings']")).toContainText("settings")

    await title.focus()
    await page.keyboard.press("Enter")
    await expect(title).toHaveAttribute("aria-expanded", "true")
    await expect(menu).not.toHaveAttribute("inert", "")

    await grid.locator("[data-blob='settings']").click()
    const sound = menu.locator(".ui-blob__strip [data-blob='sound']")
    await expect(sound).toContainText("sound")
    await expect(sound.locator(".is-on")).toHaveText("on")
    await sound.click()
    await expect(sound).toHaveAttribute("aria-pressed", "false")
    await expect(sound.locator(".is-on")).toHaveText("off")
    await expect(page.locator(".ui-blob")).toHaveAttribute("data-sound", "off")
    // Sound off quiets the note: fainter and smaller, and not struck through.
    const note = page.locator(".ui-blob__note")
    await expect(note).toHaveCSS("opacity", "0.3")
    await expect(note).toHaveCSS("scale", "0.8")
    expect(await note.evaluate((el) => getComputedStyle(el, "::after").content)).toBe("none")
    expect(await page.evaluate(() => localStorage.getItem("strm-sound"))).toBe("0")
    await sound.click()
    await expect(sound).toHaveAttribute("aria-pressed", "true")
    await expect(note).toHaveCSS("opacity", "1")
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

  test("settings unfold a strip under the grid, and the grid stays where it is", async ({
    page,
  }) => {
    await page.goto("/?stage=2&t=0.78")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "moment")
    const blob = page.locator(".ui-blob")
    const more = blob.locator("[data-blob='settings']")
    const strip = blob.locator(".ui-blob__settings")
    await blob.locator(".ui-blob__title").focus()
    await page.keyboard.press("Enter")
    await expect(more).toHaveAttribute("aria-expanded", "false")
    await expect(more).toHaveAttribute("aria-controls", (await strip.getAttribute("id")) ?? "")
    await expect(strip).toHaveAttribute("inert", "")
    await expect(strip).toHaveCSS("height", "0px")

    await more.click()
    await expect(more).toHaveAttribute("aria-expanded", "true")
    await expect(blob).toHaveClass(/is-settings/)
    await expect(strip).not.toHaveAttribute("inert", "")
    await expect(strip.locator("[data-blob='sound']")).toBeVisible()
    // The blob is fixed to the bottom, so it grows upwards: the grid keeps its place in
    // the surface, above the strip.
    const order = await blob.evaluate((el) => {
      const top = (selector: string) => el.querySelector(selector)!.getBoundingClientRect().top
      return top(".ui-blob__grid") < top(".ui-blob__strip")
    })
    expect(order).toBe(true)

    await more.click()
    await expect(more).toHaveAttribute("aria-expanded", "false")
    await expect(strip).toHaveAttribute("inert", "")

    // Folding the blob folds the settings: it opens on its navigation next time.
    await more.click()
    await page.keyboard.press("Escape")
    await expect(blob).not.toHaveClass(/is-settings/)
    await expect(strip).toHaveAttribute("inert", "")
  })

  test("the theme steps through system, light and dark, and is the stored preference", async ({
    page,
  }) => {
    await page.goto("/?stage=2&t=0.78")
    const html = page.locator("html")
    await expect(html).toHaveAttribute("data-tour", "moment")
    await page.locator(".ui-blob__title").focus()
    await page.keyboard.press("Enter")
    await page.locator("[data-blob='settings']").click()
    const theme = page.locator("[data-blob='theme']")
    await expect(theme).toContainText("theme")
    await expect(theme.locator(".is-on")).toHaveText("system")
    await expect(html).not.toHaveAttribute("data-theme", /.*/)

    await theme.click()
    await expect(theme.locator(".is-on")).toHaveText("light")
    await expect(html).toHaveAttribute("data-theme", "light")
    expect(await page.evaluate(() => localStorage.getItem("strm-theme"))).toBe("light")

    await theme.click()
    await expect(theme.locator(".is-on")).toHaveText("dark")
    await expect(html).toHaveAttribute("data-theme", "dark")

    await theme.click()
    await expect(theme.locator(".is-on")).toHaveText("system")
    await expect(html).not.toHaveAttribute("data-theme", /.*/)
    expect(await page.evaluate(() => localStorage.getItem("strm-theme"))).toBeNull()
  })

  test("a stored theme is the value the strip shows", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("strm-theme", "dark"))
    await page.goto("/?stage=2&t=0.78")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "moment")
    await expect(page.locator("[data-blob='theme'] .is-on")).toHaveText("dark")
  })

  test("language is a link to the other language, and says so in its name", async ({ page }) => {
    await page.goto("/?stage=2&t=0.78")
    const english = page.locator("[data-blob='language']")
    await expect(english).toHaveAttribute("href", "/pl/")
    await expect(english).toHaveAttribute("hreflang", "pl")
    await expect(english.locator(".is-on")).toHaveText("English")
    await expect(english).toHaveText(/language\s*English\s*Polski/)

    await page.goto("/pl/?stage=2&t=0.78")
    const polish = page.locator("[data-blob='language']")
    await expect(polish).toHaveAttribute("href", "/")
    await expect(polish).toHaveAttribute("hreflang", "en")
    await expect(polish.locator(".is-on")).toHaveText("Polski")
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

test.describe("the blob without JavaScript", () => {
  test.use({ javaScriptEnabled: false })

  test("the other language is one visible link, and the title is not in the tab order", async ({
    page,
  }) => {
    await page.goto("/")
    const link = page.locator("footer nav a")
    await expect(link).toBeVisible()
    await expect(link).toHaveText("Polski")
    await expect(link).toHaveAttribute("href", "/pl/")
    await expect(page.locator(".ui-blob__title")).not.toHaveAttribute("tabindex", "0")
    await expect(page.locator(".ui-blob__menu")).toHaveAttribute("inert", "")

    await page.goto("/pl/")
    await expect(page.locator("footer nav a")).toHaveText("English")
    await expect(page.locator("footer nav a")).toHaveAttribute("href", "/")
  })
})
