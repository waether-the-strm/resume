import { expect, test } from "../fixture.ts"

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

test("the first frame holds a seed of the line: it glints once, and coming back is quiet", async ({
  page,
}) => {
  await page.goto("/")
  await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
  const equation = page.locator(".equation")
  const read = () =>
    equation.evaluate((root) => {
      const line = root.querySelector(".line")
      const seed = root.querySelector(".seed")
      const glint = root.querySelector(".glint")
      if (!line || !seed || !glint) return null
      const box = seed.getBoundingClientRect()
      return {
        window: getComputedStyle(line).clipPath,
        seed: getComputedStyle(seed).animationName,
        seedOpacity: Number(getComputedStyle(seed).opacity),
        glint: getComputedStyle(glint).animationName,
        centred: Math.abs(box.left + box.width / 2 - innerWidth / 2) < 2,
      }
    })

  // Before any scroll: the line's window is closed, the seed is at the centre, the glint armed.
  await expect(equation).not.toHaveAttribute("data-line")
  await expect(equation).not.toHaveAttribute("data-met")
  const first = await read()
  expect(first).not.toBeNull()
  expect(first?.window).toBe("inset(-30px 50%)")
  expect(first?.seed).toContain("seed-breathe")
  expect(first?.glint).toBe("seed-glint")
  expect(first?.centred).toBe(true)
  await expect.poll(async () => (await read())?.seedOpacity, { timeout: 5000 }).toBe(1)

  // A little scroll draws the line from that point. It grows; it does not jump to full length.
  const screen = await page.evaluate(() => innerHeight)
  await page.evaluate((y) => scrollTo(0, y), Math.round(0.2 * screen))
  await expect(equation).toHaveAttribute("data-line", "")
  await expect(equation).toHaveAttribute("data-met", "")
  const growing = await read()
  expect(growing?.window, "the window is still opening just after the scroll").not.toBe(
    "inset(-30px)"
  )
  await expect.poll(async () => (await read())?.window).toBe("inset(-30px)")
  await expect.poll(async () => (await read())?.seedOpacity).toBe(0)

  // Back at the top the window closes, and the seed returns with no second glint.
  await page.evaluate(() => scrollTo(0, 0))
  await expect(equation).not.toHaveAttribute("data-line")
  await expect.poll(async () => (await read())?.window).toBe("inset(-30px 50%)")
  const back = await read()
  expect(back?.glint).toBe("none")
  expect(back?.seed).toBe("seed-breathe")
  await expect.poll(async () => (await read())?.seedOpacity, { timeout: 5000 }).toBe(1)
})

test.describe("keys and sound", () => {
  /** The stop the page has come to rest on, as the guide and the stage show it. */
  const scene = (page: import("../fixture.ts").Page) =>
    page.locator(".stage").getAttribute("data-scene")
  const settled = async (page: import("../fixture.ts").Page) => {
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

  test("how? stands in the middle for a beat before it moves left, and fades there going back", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    await settled(page)
    const equation = page.locator(".equation")
    const how = () =>
      equation.evaluate((el) => {
        const label = el.querySelector(".how .q")!
        const box = el.getBoundingClientRect()
        const own = label.getBoundingClientRect()
        return {
          // How far the word is from the middle of the equation.
          off: Math.round(Math.abs(box.left + box.width / 2 - (own.left + own.width / 2))),
          wait: parseFloat((el as HTMLElement).style.getPropertyValue("--how-wait")) || 0,
          shift: parseFloat((el as HTMLElement).style.getPropertyValue("--how-shift")) || 0,
        }
      })

    // Three steps rest on `who`, before `how?` is there.
    for (let step = 0; step < 3; step++) {
      await page.keyboard.press("ArrowDown")
      await settled(page)
    }
    await expect(equation).not.toHaveAttribute("data-how", "")

    // The next step glides to the equation's stop and crosses the centred phase on the way.
    await page.keyboard.press("ArrowDown")
    await expect(equation).toHaveAttribute("data-left", "")
    const moved = await how()
    expect(moved.wait, "the glide crossed the middle faster than the beat").toBeGreaterThan(0)
    expect(moved.off, "the word is still in the middle when the scroll has moved on").toBeLessThan(
      12
    )
    // After the beat it has gone left, and its answer is there.
    await expect.poll(async () => (await how()).off, { timeout: 4000 }).toBeGreaterThan(60)
    await expect(equation.locator(".how .a")).toHaveAttribute("data-melt", "in")
    await settled(page)

    // Going back it returns to the middle and is not sent left again as it fades.
    await page.keyboard.press("ArrowUp")
    await expect(equation).not.toHaveAttribute("data-how", "")
    const left = await how()
    expect(left.wait, "no wait on the way back").toBe(0)
    expect(Math.abs(left.shift), "it keeps the middle while it fades").toBeGreaterThan(60)
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
