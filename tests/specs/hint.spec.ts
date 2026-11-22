import { expect, test, type Locator } from "@playwright/test"
import { WHEEL_TICK_PX } from "../rest.ts"

// Longer than the prototype's 1400ms pause plus the 500ms fade, so a late appearance fails.
const HIDDEN_FOR_MS = 2500

test.describe("the scroll hint on a desktop", () => {
  test.use({
    viewport: { width: 1280, height: 700 },
    contextOptions: { reducedMotion: "no-preference" },
  })

  test("shown on the first frame, gone after one wheel, not again this session", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    const hint = page.locator(".ui-hint")
    await expect(hint).toHaveAttribute("aria-hidden", "true")
    await expect(hint).toContainText("scroll")

    await expect.poll(async () => opacity(hint), { timeout: 8000 }).toBeGreaterThan(0.9)
    const placed = await hint.evaluate((element) => {
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      const wheel = getComputedStyle(element.querySelector(".ui-hint__mouse")!, "::after")
      return {
        display: style.display,
        shown: element.classList.contains("is-shown"),
        // Prototype line 191: 104px above the bottom edge, centred.
        bottom: style.bottom,
        centerDelta: Math.abs(box.left + box.width / 2 - innerWidth / 2),
        bottomDelta: Math.abs(box.bottom - (innerHeight - Number.parseFloat(style.bottom))),
        wheel: wheel.animationName,
        wheelDuration: wheel.animationDuration,
      }
    })
    expect(placed.display).not.toBe("none")
    expect(placed.shown).toBe(true)
    expect(placed.bottom).toBe("104px")
    expect(placed.centerDelta).toBeLessThan(2)
    expect(placed.bottomDelta).toBeLessThan(2)
    expect(placed.wheel).toBe("ui-hint-wheel")
    expect(placed.wheelDuration).not.toBe("0s")

    const collision = await page.evaluate(() => {
      const boxes = (selector: string) => {
        const box = document.querySelector(selector)?.getBoundingClientRect()
        if (!box) return null
        return { top: box.top, right: box.right, bottom: box.bottom, left: box.left }
      }
      const overlaps = (a: DOMRect | undefined, b: DOMRect | undefined) =>
        !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
      const hintBox = document.querySelector(".ui-hint")?.getBoundingClientRect()
      const blobBox = document.querySelector(".ui-blob")?.getBoundingClientRect()
      const seedBox = document.querySelector(".equation .seed")?.getBoundingClientRect()
      return {
        hint: boxes(".ui-hint"),
        blob: boxes(".ui-blob"),
        seed: boxes(".equation .seed"),
        blobOverlap: overlaps(hintBox, blobBox),
        seedOverlap: overlaps(hintBox, seedBox),
      }
    })
    test.info().annotations.push({
      type: "hint-collision",
      description: JSON.stringify(collision),
    })

    await page.mouse.move(640, 350)
    await page.mouse.wheel(0, WHEEL_TICK_PX)
    await expect.poll(async () => opacity(hint), { timeout: 3000 }).toBeLessThan(0.05)
    await expect(hint).toHaveClass(/is-gone/)
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBe("seen")

    await page.reload()
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    await staysHidden(hint)
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBe("seen")
  })

  test("a 1px wheel during the pause still shows the hint", async ({ page }) => {
    await page.goto("/")
    const hint = page.locator(".ui-hint")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    expect(await opacity(hint)).toBeLessThan(0.05)

    await page.mouse.move(640, 350)
    await page.mouse.wheel(0, 1)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(8)
    await expect.poll(async () => opacity(hint), { timeout: 8000 }).toBeGreaterThan(0.9)
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBeNull()
  })

  test("a lone modifier during the pause still shows the hint", async ({ page }) => {
    await page.goto("/")
    const hint = page.locator(".ui-hint")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    expect(await opacity(hint)).toBeLessThan(0.05)

    await page.evaluate(() => {
      addEventListener(
        "keydown",
        (event) => {
          document.documentElement.dataset.hintKey = event.key
        },
        { capture: true, once: true }
      )
    })
    await page.keyboard.down("Meta")
    await page.keyboard.up("Meta")
    await expect(page.locator("html")).toHaveAttribute("data-hint-key", "Meta")
    await expect.poll(async () => opacity(hint), { timeout: 8000 }).toBeGreaterThan(0.9)
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBeNull()
    expect(await page.evaluate(() => scrollY)).toBeLessThanOrEqual(8)
  })

  test("shown again after a reload when the reader has not moved", async ({ page }) => {
    await page.goto("/")
    const hint = page.locator(".ui-hint")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    await expect.poll(async () => opacity(hint), { timeout: 8000 }).toBeGreaterThan(0.9)
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBeNull()

    await page.reload()
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    await expect.poll(async () => opacity(hint), { timeout: 8000 }).toBeGreaterThan(0.9)
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBeNull()
  })

  test("a load part way down writes nothing", async ({ page }) => {
    // Scroll to the card while the document is still parsing, so the tour reads a
    // position past the first frame (prototype line 659: more than 8px down).
    await page.addInitScript(() => {
      const scrollDown = () => {
        const card = document.getElementById("jan")
        if (!card) return
        const y = card.getBoundingClientRect().top + scrollY
        if (y > 8) scrollTo(0, y)
      }
      new MutationObserver(scrollDown).observe(document, { childList: true, subtree: true })
    })
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(8)
    await staysHidden(page.locator(".ui-hint"))
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBeNull()
  })

  test("the Polish page repeats the English word", async ({ page }) => {
    await page.goto("/pl/")
    await expect(page.locator(".ui-hint")).toContainText("scroll")
  })

  test("not shown at 390 wide", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 664 })
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    await staysHidden(page.locator(".ui-hint"))
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBeNull()
  })
})

test("the scroll hint stays off under reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 })
  await page.goto("/")
  await expect(page.locator("html")).not.toHaveAttribute("data-tour", /./)
  const hint = page.locator(".ui-hint")
  await expect(hint).toHaveCount(1)
  await staysHidden(hint)
  expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBeNull()
})

function opacity(hint: Locator): Promise<number> {
  return hint.evaluate((element) => Number(getComputedStyle(element).opacity))
}

/** Fails if the hint becomes visible before `HIDDEN_FOR_MS` has passed. */
async function staysHidden(hint: Locator): Promise<void> {
  const start = Date.now()
  await expect
    .poll(
      async () => {
        const visible = await hint.evaluate((element) => {
          const style = getComputedStyle(element)
          return style.display !== "none" && Number(style.opacity) > 0.05
        })
        if (visible) return "shown"
        if (Date.now() - start >= HIDDEN_FOR_MS) return "hidden"
        return "waiting"
      },
      { timeout: HIDDEN_FOR_MS + 4000, intervals: [100] }
    )
    .toBe("hidden")
}
