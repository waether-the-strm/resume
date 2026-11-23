import { expect, test, type Page } from "../fixture.ts"

function tickScale(tick: Element): number {
  const raw = getComputedStyle(tick).scale
  return raw === "none" ? 1 : Number(raw.split(" ")[0])
}

const marks = ["0", "+", "+", "+", "=", "=", "1", "2.1", "2.2", "2.3", "3.1", "3.2"]
const ids = [
  "start",
  "what",
  "why",
  "who",
  "equation",
  "answer",
  "words",
  "structure",
  "components",
  "tokens",
  "tiles",
  "look",
]

async function expectMarks(page: Page) {
  await expect(page.locator(".ui-rail__stop")).toHaveCount(12)
  for (const [index, id] of ids.entries()) {
    const stop = page.locator(`.ui-rail__stop[data-id="${id}"]`)
    await expect(stop).toHaveAttribute("data-index", String(index))
    const badge = stop.locator(".ui-rail__label .ui-badge")
    await expect(badge).toHaveCount(1)
    await expect(badge).toHaveAttribute("data-mark", marks[index]!)
    await expect(badge).toHaveText("")
    await expect(badge).toHaveAttribute("aria-hidden", "true")
  }
  // Nothing is painted on the tick or the dot, and no chapter number is left.
  await expect(page.locator(".ui-rail__num")).toHaveCount(0)
  await expect(page.locator(".ui-rail__tick")).toHaveText(["", "", "", ""])
  await expect(page.locator(".ui-rail__dot")).toHaveText(["", "", "", "", "", "", "", ""])
  const painted = await page
    .locator(".ui-rail__tick, .ui-rail__dot")
    .evaluateAll((nodes) =>
      nodes.map(
        (node) =>
          getComputedStyle(node, "::before").content + getComputedStyle(node, "::after").content
      )
    )
  for (const content of painted) expect(content).toMatch(/^(none|normal)+$/)
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
    await expectMarks(page)
    await expect(
      page.locator(".ui-rail__stop.is-chapter .ui-rail__label > span:not(.ui-badge)")
    ).toHaveText(["equation", "words", "structure", "look"])
    await expect(page.locator('.ui-rail__stop[data-id="equation"]')).toHaveAttribute(
      "aria-label",
      "the equation"
    )
    await expect(page.locator('.ui-rail__stop[data-id="tokens"]')).toHaveAttribute(
      "aria-label",
      "tokens"
    )
    await expect(page.locator(".ui-rail__arrow")).toHaveCount(2)
    await expect(page.locator(".ui-rail")).toHaveAttribute("aria-label", "Tour steps")
    await expect(page.locator('.ui-rail__arrow[data-dir="-1"]')).toHaveAttribute(
      "aria-label",
      "previous stop"
    )
    await expect(page.locator('.ui-rail__arrow[data-dir="1"]')).toHaveAttribute(
      "aria-label",
      "next stop"
    )
  })

  test("Polish names come from the content", async ({ page }) => {
    await page.goto("/pl/")
    await expect(page.locator('.ui-rail__stop[data-id="tokens"]')).toHaveAttribute(
      "aria-label",
      "tokeny"
    )
    await expect(
      page.locator(".ui-rail__stop.is-chapter .ui-rail__label > span:not(.ui-badge)")
    ).toHaveText(["równanie", "słowa", "struktura", "wygląd"])
    await expectMarks(page)
    await expect(page.locator(".ui-rail")).toHaveAttribute("aria-label", "Tour steps")
    await expect(page.locator('.ui-rail__arrow[data-dir="-1"]')).toHaveAttribute(
      "aria-label",
      "previous stop"
    )
    await expect(page.locator('.ui-rail__arrow[data-dir="1"]')).toHaveAttribute(
      "aria-label",
      "next stop"
    )
  })

  test("on the Polish page the notation titles are English, the others are not", async ({
    page,
  }) => {
    await page.goto("/pl/")
    const notation = ["start", "what", "why", "who"]
    for (const id of ids) {
      const stop = page.locator(`.ui-rail__stop[data-id="${id}"]`)
      const title = stop.locator(".ui-rail__label > span:not(.ui-badge)")
      if (notation.includes(id)) await expect(title).toHaveAttribute("lang", "en")
      else await expect(title).not.toHaveAttribute("lang", /.*/)
    }
    await expect(page.locator('.ui-rail__stop[data-id="what"]')).toHaveAttribute(
      "aria-label",
      "what?"
    )
    await expect(page.locator('.ui-rail__stop[data-id="start"]')).toHaveAttribute(
      "aria-label",
      "w+w+w"
    )

    await page.goto("/pl/?stage=0&t=0")
    const labels = page.locator(".ui-blob__stop[data-stop] .ui-blob__label")
    for (const [index, id] of ids.entries()) {
      const label = labels.nth(index)
      if (notation.includes(id)) await expect(label).toHaveAttribute("lang", "en")
      else await expect(label).not.toHaveAttribute("lang", /.*/)
    }
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
    await expect(page.locator('.ui-rail__stop[data-id="structure"]')).toHaveAttribute(
      "aria-current",
      "true"
    )
    await expect(page.locator('.ui-rail__stop[data-id="tokens"]')).toHaveClass(/is-nearest/)
    await expect(page.locator(".ui-rail__stop.is-landed")).toHaveCount(0)
    const currentTick = page.locator('.ui-rail__stop[aria-current="true"] .ui-rail__tick')
    await expect
      .poll(async () => currentTick.evaluate(tickScale), { timeout: 1_000 })
      .toBeCloseTo(22 / 12, 2)
    expect(await currentTick.evaluate((tick) => getComputedStyle(tick).width)).toBe("12px")
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
          ?.getAttribute("data-index"),
        nearest: document.querySelector(".ui-rail__stop.is-nearest")?.getAttribute("data-index"),
        skin: document.querySelector(".message")?.getAttribute("data-skin"),
      }
    })
    expect(sample).toEqual({ chapter: "6", nearest: "6", skin: "none" })
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
    const startAttr = await page.locator(".ui-rail__stop.is-nearest").getAttribute("data-index")
    expect(startAttr).not.toBeNull()
    const start = Number(startAttr)
    await next.click()
    await expect(page.locator(".ui-rail__stop.is-landed")).toHaveAttribute(
      "data-index",
      String(start + 1),
      { timeout: 5_000 }
    )
    await expect(page.locator(`.ui-rail__stop[data-index="${start + 2}"]`)).not.toHaveClass(
      /is-landed/
    )

    await previous.click()
    await expect(page.locator(".ui-rail__stop.is-landed")).toHaveAttribute(
      "data-index",
      String(start),
      { timeout: 5_000 }
    )

    const before = await page.evaluate(() => window.scrollY)
    const tokens = page.locator('.ui-rail__stop[data-id="tokens"]')
    await tokens.evaluate((button) => {
      const mark = button.querySelector(".ui-rail__dot")
      if (!mark) throw new Error("tokens has no dot")
      let starts = 0
      mark.addEventListener("animationstart", () => {
        starts += 1
      })
      Object.assign(button, { starts: () => starts })
    })
    await tokens.click()
    await expect(tokens).toHaveClass(/is-landed/, { timeout: 5_000 })
    await expect(page.locator('.ui-rail__stop[data-id="structure"]')).toHaveAttribute(
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

    // At rest the cue must not start again. A loop would fire animationstart once more.
    await page.waitForTimeout(2_000)
    const starts = await tokens.evaluate((button) => {
      const read = (button as { starts?: () => number }).starts
      return read ? read() : -1
    })
    expect(starts).toBe(1)

    const words = page.locator('.ui-rail__stop[data-id="words"]')
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
    // The labels carry the badges, and a phone shows no label (--rail-caption: none).
    await expect(page.locator(".ui-rail__stop.is-chapter .ui-rail__label").first()).toBeHidden()
    await expect(page.locator(".ui-rail__stop.is-chapter .ui-badge").first()).toBeHidden()
    for (const label of await page.locator(".ui-rail__label").all()) {
      await expect(label).toBeHidden()
    }
    await expect(page.locator(".ui-rail__stop.is-chapter").first()).toBeVisible()
    await expect(page.locator(".ui-rail__arrow").first()).toBeVisible()
    await expect(page.locator('.ui-rail__stop[aria-current="true"]')).toHaveCount(1)
    const phoneTick = page.locator('.ui-rail__stop[aria-current="true"] .ui-rail__tick')
    await expect
      .poll(async () => phoneTick.evaluate(tickScale), { timeout: 1_000 })
      .toBeCloseTo(18 / 10, 2)
    expect(await phoneTick.evaluate((tick) => getComputedStyle(tick).width)).toBe("10px")
  })
})
