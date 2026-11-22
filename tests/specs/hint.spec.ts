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
