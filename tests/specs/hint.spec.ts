import { expect, test, type Locator, type Page } from "@playwright/test"
import { holdFinger, touchSwipe, WHEEL_TICK_PX } from "../rest.ts"

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
    expect(await display(page.locator(".ui-hint__mouse"))).not.toBe("none")
    expect(await display(page.locator(".ui-hint__finger"))).toBe("none")

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
})

test.describe("the scroll hint on a phone", () => {
  test.use({
    viewport: { width: 390, height: 664 },
    hasTouch: true,
    contextOptions: { reducedMotion: "no-preference" },
  })

  test.beforeEach(async ({ page }) => {
    const client = await page.context().newCDPSession(page)
    await client.send("Emulation.setEmulatedMedia", {
      features: [
        { name: "pointer", value: "coarse" },
        { name: "prefers-reduced-motion", value: "no-preference" },
      ],
    })
  })

  test("shown on the first frame, gone after one swipe, not again this session", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true)
    const hint = page.locator(".ui-hint")
    const finger = page.locator(".ui-hint__finger")
    await expect(hint).toContainText("swipe up")
    await expect.poll(async () => opacity(hint), { timeout: 8000 }).toBeGreaterThan(0.9)
    expect(await display(page.locator(".ui-hint__mouse"))).toBe("none")
    expect(await display(finger)).not.toBe("none")
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBeNull()

    const placed = await hint.evaluate((element) => {
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      const dot = element.querySelector(".ui-hint__finger")
      const dotStyle = dot ? getComputedStyle(dot) : null
      return {
        bottom: style.bottom,
        width: style.width,
        height: style.height,
        centerDelta: Math.abs(box.left + box.width / 2 - innerWidth / 2),
        dot: dotStyle ? { width: dotStyle.width, height: dotStyle.height } : null,
        duration: dotStyle?.animationDuration ?? "",
        name: dotStyle?.animationName ?? "",
      }
    })
    expect(placed.width).toBe("100px")
    expect(placed.height).toBe("90px")
    expect(placed.centerDelta).toBeLessThan(2)
    expect(placed.dot).toEqual({ width: "26px", height: "26px" })
    expect(placed.name).toBe("ui-hint-swipe")
    expect(placed.duration).not.toBe("0s")
    await sitsAboveBlob(page)

    const collision = await page.evaluate(() => {
      const boxes = (selector: string) => {
        const box = document.querySelector(selector)?.getBoundingClientRect()
        if (!box || box.width === 0 || box.height === 0) return null
        return { top: box.top, right: box.right, bottom: box.bottom, left: box.left }
      }
      const overlaps = (a: DOMRect | undefined, b: DOMRect | undefined) =>
        !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
      const hintBox = document.querySelector(".ui-hint")?.getBoundingClientRect()
      const word = document.querySelector(".ui-hint__swipe")?.getBoundingClientRect()
      return {
        hint: boxes(".ui-hint"),
        word: boxes(".ui-hint__swipe"),
        blob: boxes(".ui-blob"),
        seed: boxes(".equation .seed"),
        rail: boxes(".ui-rail"),
        blobOverlap: overlaps(hintBox, document.querySelector(".ui-blob")?.getBoundingClientRect()),
        wordOverlap: overlaps(word, document.querySelector(".ui-blob")?.getBoundingClientRect()),
        seedOverlap: overlaps(
          hintBox,
          document.querySelector(".equation .seed")?.getBoundingClientRect()
        ),
        railOverlap: overlaps(hintBox, document.querySelector(".ui-rail")?.getBoundingClientRect()),
      }
    })
    test.info().annotations.push({
      type: "finger-collision",
      description: JSON.stringify(collision),
    })

    // A finger that never moves the page leaves the hint up, and writes nothing.
    const lift = await holdFinger(page)
    await lift()
    await expect.poll(async () => opacity(hint)).toBeGreaterThan(0.9)
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBeNull()

    await touchSwipe(page, 120)
    await expect.poll(async () => opacity(hint), { timeout: 3000 }).toBeLessThan(0.05)
    await expect(hint).toHaveClass(/is-gone/)
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBe("seen")

    await page.reload()
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    await staysHidden(hint)
    expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBe("seen")
  })

  test("sits above the blob on a taller phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true)
    await sitsAboveBlob(page)
  })

  test("the Polish page repeats the English words", async ({ page }) => {
    await page.goto("/pl/")
    await expect(page.locator(".ui-hint__swipe")).toContainText("swipe up")
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

test("the swipe finger stays off under reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 })
  await page.goto("/")
  await expect(page.locator("html")).not.toHaveAttribute("data-tour", /./)
  await staysHidden(page.locator(".ui-hint"))
  expect(await page.evaluate(() => sessionStorage.getItem("strm-hint"))).toBeNull()
})

/**
 * The words are the lowest part of the hint. They sit the desktop's 12.5px above
 * the blob. The finger travels up from its rest (lab line 60), so that rest is
 * the lowest the dot reaches, and it stays above the blob too.
 */
async function sitsAboveBlob(page: Page): Promise<void> {
  const hint = page.locator(".ui-hint")
  await expect.poll(async () => opacity(hint), { timeout: 8000 }).toBeGreaterThan(0.9)
  await page.locator(".ui-hint__finger").evaluate((element) => {
    element.style.animationPlayState = "paused"
    element.style.animationDelay = "-0.66s"
  })
  const boxes = await page.evaluate(() => {
    const word = document.querySelector(".ui-hint__swipe")?.getBoundingClientRect()
    const dot = document.querySelector(".ui-hint__finger")?.getBoundingClientRect()
    const blob = document.querySelector(".ui-blob")?.getBoundingClientRect()
    const travel = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--hint-finger-travel")
    )
    return {
      wordBottom: word?.bottom ?? 0,
      dotBottom: dot?.bottom ?? 0,
      dotTop: dot?.top ?? 0,
      blobTop: blob?.top ?? 0,
      travel,
    }
  })
  expect(boxes.blobTop - boxes.wordBottom).toBeGreaterThan(12)
  expect(boxes.blobTop - boxes.wordBottom).toBeLessThan(13.5)
  expect(boxes.travel).toBe(70)
  expect(boxes.dotBottom).toBeLessThan(boxes.blobTop)
  expect(boxes.dotTop - boxes.travel).toBeLessThan(boxes.wordBottom)
}

function opacity(hint: Locator): Promise<number> {
  return hint.evaluate((element) => Number(getComputedStyle(element).opacity))
}

function display(hint: Locator): Promise<string> {
  return hint.evaluate((element) => getComputedStyle(element).display)
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
