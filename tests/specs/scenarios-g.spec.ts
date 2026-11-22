import { expect, test, type Page } from "@playwright/test"
import {
  driveKeys,
  driveRail,
  driveTouch,
  driveTrackpad,
  driveWheel,
  formatMeasurement,
  formatRestRow,
  GLIDE_DRIFT_PX,
  holdFinger,
  holdStateProblems,
  midTileNotes,
  OPACITY_HIDDEN,
  OPACITY_SHOWN,
  placeReading,
  readPage,
  readStageFit,
  repeatHoldProblems,
  restProblems,
  scrollToCentre,
  settle,
  stayedAtTop,
  touchSwipe,
  visitStops,
  WHEEL_TICK_PX,
  writeMeasurement,
  type PlacedReading,
} from "../rest.ts"

// Scenarios G (docs/spec/TEST-SCENARIOS.md). Live scroll is one language: the rests do not
// depend on the copy. Both languages stay where the copy or its length matters (G2, G7, G9).
//
// Already covered, and not repeated here:
//   G4 keys, G8 sound          tests/specs/tour.spec.ts
//   G5 rail, G11 the mark      tests/specs/rail.spec.ts
//   G10 the blob, G12 its menu tests/specs/blob.spec.ts
//   G9 the finished page with no tour, at 390×664   tests/specs/static-page.spec.ts
//
// This file adds G1, G2, G3, G6, G7, the live half of G9, and G13. The page has no `html[data-stop]`; a rest is
// placed against `.track[data-track]`, and checked against the blob's title and the
// rail's nearest stop. `aria-current` is the chapter (G11), not the hold.
test.use({ contextOptions: { reducedMotion: "no-preference" } })
// The longest walk is 31 wheel ticks (26 on, 5 back). A tick is a glide of at most 900ms,
// the 170ms idle, and the settle poll (9 samples of 50ms once the page is still): about
// 1.6s, so the walk is about 50s before the page load. 60s fails a settle that has slowed
// down. 180s did not.
test.describe.configure({ timeout: 60_000 })

const locales = [
  { path: "/", lang: "en" },
  { path: "/pl/", lang: "pl" },
] as const

/** Live scroll. English only: a rest is geometry, not copy. */
const live = locales[0]

const viewports = [
  { width: 1280, height: 820 },
  { width: 1280, height: 700 },
  { width: 390, height: 664 },
] as const

const payoffMoments = [
  { stage: 0, t: 0, visible: false },
  { stage: 1, t: 1, visible: false },
  { stage: 2, t: 0.78, visible: false },
  { stage: 3, t: 0.32, visible: false },
  { stage: 3, t: 0.9, visible: false },
  { stage: 3, t: 0.91, visible: true },
  { stage: 3, t: 1, visible: true },
] as const

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(`page error: ${error.message}`))
  return errors
}

async function fontsReady(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(async () => {
        await document.fonts.ready
        return [...document.fonts]
          .filter((face) => face.family === "Recursive Variable")
          .map((face) => face.status)
          .join(" ")
      })
    )
    .toContain("loaded")
}

async function openTour(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
  await settle(page)
}

function publish(
  lines: readonly string[],
  problems: readonly string[],
  notes: readonly string[] = []
) {
  const title = test.info().titlePath.join(" / ")
  writeMeasurement(title, formatMeasurement(title, lines, problems, notes))
  const description =
    problems.length === 0 ? `${lines.length} rows, no problem` : problems.slice(0, 3).join(" | ")
  test.info().annotations.push({ type: "measurement", description })
}

function rowsOf(tagged: { tag: string; row: PlacedReading | null }[]): PlacedReading[] {
  return tagged.flatMap((item) => (item.row ? [item.row] : []))
}

/**
 * The smallest frame-to-frame move over the next frames.
 * A wheel is still inside the 170ms idle (`IDLE_MS`): eight frames, and the new glide
 * #122 re-arms has not started. A touch keeps scrolling for a few frames after the
 * finger lifts, the tail of the touch trail; twenty frames is that tail, and it ends
 * still. A glide that was not cancelled writes every frame, so it has no still one.
 * The input's own scroll can still be landing when the call returns, so the check is
 * a still frame, not the first sample.
 */
async function quietFrame(page: Page, frames = 8): Promise<{ quiet: number; steps: number[] }> {
  let previous = await page.evaluate(() => window.scrollY)
  const steps: number[] = []
  let quiet = Number.POSITIVE_INFINITY
  for (let sample = 0; sample < frames; sample++) {
    await page.waitForTimeout(16)
    const now = await page.evaluate(() => window.scrollY)
    const step = Math.abs(now - previous)
    steps.push(Math.round(step))
    quiet = Math.min(quiet, step)
    previous = now
  }
  return { quiet, steps }
}

/** A live glide writes every frame. The idle timer is cleared while the finger is down. */
async function driftWhileHeld(page: Page): Promise<number> {
  const at = await page.evaluate(() => window.scrollY)
  let drift = 0
  for (let sample = 0; sample < 8; sample++) {
    await page.waitForTimeout(30)
    drift = Math.max(drift, Math.abs((await page.evaluate(() => window.scrollY)) - at))
  }
  return drift
}

/** Rail click to a far stop, after resting on the first. The glide is what G6 interrupts. */
async function startGlide(page: Page): Promise<void> {
  const stops = page.locator(".ui-rail__stop")
  const count = await stops.count()
  const visible: number[] = []
  for (let index = 0; index < count; index++) {
    if (await stops.nth(index).isVisible()) visible.push(index)
  }
  expect(visible.length, "two rail stops to glide between").toBeGreaterThan(1)
  const first = visible[0]
  const last = visible[visible.length - 1]
  if (first === undefined || last === undefined) return
  await stops.nth(first).click()
  await settle(page)
  const before = await page.evaluate(() => window.scrollY)
  await stops.nth(last).click()
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 2000 })
    .toBeGreaterThan(before + 15)
}

for (const viewport of viewports) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test.describe(live.lang, () => {
      test("G1 G3: a 100px wheel tick comes to rest in a hold", async ({ page }) => {
        // The assertion is G3. At 820px it fails, and the failure is the finding: a 100px
        // tick from "the answer, alone" returns to that hold. The hold is 0.12 screens,
        // 98px, so the exemption (wider than the tick) does not cover it, by two pixels.
        // Marked expected, the way C6 was: the day the page is fixed, this goes red.
        test.fail(
          viewport.height === 820,
          'G3 at 1280×820: a 100px wheel tick from the hold of "the answer, alone" returns to the same hold. That hold is 0.12 screens, 98px, so the exemption does not cover it, by two pixels.'
        )
        const errors = watchErrors(page)
        await openTour(page, live.path)
        await page.mouse.move(viewport.width / 2, viewport.height / 2)
        const { down, up } = await driveWheel(page)
        const lines = [
          ...down.map((row) => formatRestRow("tick+100", row)),
          ...up.map((row) => formatRestRow("tick-100", row)),
        ]
        const problems = [
          ...restProblems(down),
          ...restProblems(up),
          ...repeatHoldProblems(down, WHEEL_TICK_PX),
          ...repeatHoldProblems(up, WHEEL_TICK_PX),
          ...stayedAtTop(down),
          ...errors,
        ]
        publish(lines, problems)
        expect(problems, problems.join("\n")).toEqual([])
      })

      test("G1: a trackpad drag comes to rest in a hold", async ({ page }) => {
        const errors = watchErrors(page)
        await openTour(page, live.path)
        await page.mouse.move(viewport.width / 2, viewport.height / 2)
        const rows = await driveTrackpad(page)
        const problems = [...restProblems(rows), ...stayedAtTop(rows), ...errors]
        publish(
          rows.map((row, index) => formatRestRow(`drag ${index}`, row)),
          problems
        )
        expect(problems, problems.join("\n")).toEqual([])
      })

      test.describe("touch", () => {
        test.use({ hasTouch: true })

        test("G1: a touch swipe comes to rest in a hold", async ({ page }) => {
          const errors = watchErrors(page)
          await openTour(page, live.path)
          const rows = await driveTouch(page)
          const problems = [...restProblems(rows), ...stayedAtTop(rows), ...errors]
          publish(
            rows.map((row) => formatRestRow("swipe", row)),
            problems
          )
          expect(problems, problems.join("\n")).toEqual([])
        })
      })

      test("G1: keys come to rest in a hold", async ({ page }) => {
        // Which key steps where is G4, in tour.spec.ts. Here the keys only have to rest.
        const errors = watchErrors(page)
        await openTour(page, live.path)
        const rows = await driveKeys(page)
        const problems = [...restProblems(rows), ...stayedAtTop(rows), ...errors]
        publish(
          rows.map((row, index) => formatRestRow(`key ${index}`, row)),
          problems
        )
        expect(problems, problems.join("\n")).toEqual([])
      })

      test("G1: a rail click comes to rest in a hold", async ({ page }) => {
        // Where a tick, a dot or an arrow goes is G5, in rail.spec.ts.
        const errors = watchErrors(page)
        await openTour(page, live.path)
        const tagged = await driveRail(page)
        const rows = rowsOf(tagged)
        const lines = tagged.map((item) =>
          item.row ? formatRestRow(item.tag, item.row) : `${item.tag}  (not on this page)`
        )
        const problems = [...restProblems(rows), ...stayedAtTop(rows), ...errors]
        publish(lines, problems)
        expect(problems, problems.join("\n")).toEqual([])
      })

      test.describe("G6", () => {
        test.use({ hasTouch: true })

        test("any input cancels a glide, and a finger is not fought", async ({ page }) => {
          const errors = watchErrors(page)
          await openTour(page, live.path)
          await page.mouse.move(viewport.width / 2, viewport.height / 2)

          // 1px is under the 3px diverge check, so only the wheel listener cancels the glide.
          await startGlide(page)
          await page.mouse.wheel(0, 1)
          const wheel = await quietFrame(page)
          expect(
            wheel.quiet,
            `the glide keeps writing after the wheel (${wheel.steps.join(",")})`
          ).toBeLessThanOrEqual(GLIDE_DRIFT_PX)
          await settle(page)

          // The prototype's shortest touch, 180px. touchstart cancels; the finger then moves.
          await startGlide(page)
          await touchSwipe(page, 180)
          const touch = await quietFrame(page, 20)
          expect(
            touch.quiet,
            `the glide keeps writing after the touch (${touch.steps.join(",")})`
          ).toBeLessThanOrEqual(GLIDE_DRIFT_PX)
          await settle(page)

          // Home is the binding whose action is cancel: it does not start another glide.
          // The page does not prevent the browser's own Home scroll, so the check is that
          // once that scroll has landed the glide does not pull the page away.
          await startGlide(page)
          await page.keyboard.press("Home")
          await expect
            .poll(() => page.evaluate(() => window.scrollY), { timeout: 2000 })
            .toBeLessThanOrEqual(GLIDE_DRIFT_PX)
          const home = await quietFrame(page)
          expect(
            home.quiet,
            `the glide keeps writing after Home (${home.steps.join(",")})`
          ).toBeLessThanOrEqual(GLIDE_DRIFT_PX)

          await startGlide(page)
          await page.mouse.move(viewport.width / 2, viewport.height / 2)
          await page.mouse.down()
          const pointer = await quietFrame(page)
          expect(
            pointer.quiet,
            `the glide keeps writing after the pointer went down (${pointer.steps.join(",")})`
          ).toBeLessThanOrEqual(GLIDE_DRIFT_PX)
          await page.mouse.up()

          await startGlide(page)
          const lift = await holdFinger(page)
          try {
            expect(
              await driftWhileHeld(page),
              "the page moved by itself while a finger was down"
            ).toBeLessThanOrEqual(GLIDE_DRIFT_PX)
          } finally {
            await lift()
          }
          expect(errors, errors.join("\n")).toEqual([])
        })
      })
    })

    for (const locale of locales) {
      test.describe(locale.lang, () => {
        test("G2: each hold is a complete state", async ({ page }) => {
          const errors = watchErrors(page)
          await openTour(page, locale.path)
          await fontsReady(page)
          const rows = await visitStops(page)
          const problems = [...holdStateProblems(rows), ...errors]
          const notes = midTileNotes(rows)
          publish(
            rows.map((row, index) => formatRestRow(`stop ${index}`, row)),
            problems,
            notes
          )
          expect(problems, problems.join("\n")).toEqual([])
        })

        test("G7: the payoff is visible only on the finished look", async ({ page }) => {
          const errors = watchErrors(page)
          const lines: string[] = []
          const problems: string[] = []
          for (const moment of payoffMoments) {
            await page.goto(`${locale.path}?stage=${moment.stage}&t=${moment.t}`)
            await expect(page.locator("html")).toHaveAttribute("data-tour", "moment")
            let row = await page.evaluate(readPage)
            const deadline = Date.now() + 4000
            while (Date.now() < deadline) {
              const shown = row.payoffOpacity > OPACITY_SHOWN
              const hidden = row.payoffOpacity < OPACITY_HIDDEN
              if (row.pay === moment.visible && (moment.visible ? shown : hidden)) break
              await page.waitForTimeout(50)
              row = await page.evaluate(readPage)
            }
            const where = `stage ${moment.stage} t=${moment.t}`
            lines.push(
              `${where}  pay=${row.pay} opacity=${row.payoffOpacity.toFixed(2)} scene=${row.scene}`
            )
            if (row.pay !== moment.visible) problems.push(`${where}: data-pay is ${row.pay}`)
            if (moment.visible) {
              if (row.scene !== "3") problems.push(`${where}: scene ${row.scene}`)
              if (row.payoffOpacity <= OPACITY_SHOWN)
                problems.push(`${where}: payoff opacity ${row.payoffOpacity.toFixed(2)}`)
            } else if (row.payoffOpacity >= OPACITY_HIDDEN) {
              problems.push(`${where}: payoff opacity ${row.payoffOpacity.toFixed(2)}`)
            }
          }
          publish(lines, [...problems, ...errors])
          expect([...problems, ...errors], [...problems, ...errors].join("\n")).toEqual([])
        })
      })
    }
  })
}

test.describe("G9 at 390×664", () => {
  test.use({ viewport: { width: 390, height: 664 } })

  for (const locale of locales) {
    test(`${locale.lang}: the finished look fits the stage, which stays the small viewport`, async ({
      page,
    }) => {
      const errors = watchErrors(page)
      await openTour(page, locale.path)
      await fontsReady(page)
      const first = placeReading(await page.evaluate(readPage))
      const look = first.placed[first.placed.length - 1]
      expect(look, "the track has a last stop").toBeTruthy()
      if (!look) return
      const rested = await scrollToCentre(page, look)
      expect(rested.skin, "the last hold is the look").toBe("look")
      const fit = await page.evaluate(readStageFit)
      const problems: string[] = [...errors]
      if (!fit.headline || !fit.pill) problems.push("the headline or the call has no box")
      else {
        const fitLine = `headline ${fit.headline.top.toFixed(0)}–${fit.headline.bottom.toFixed(0)}  call ${fit.pill.top.toFixed(0)}–${fit.pill.bottom.toFixed(0)}  stage ${fit.stage.top.toFixed(0)}–${fit.stage.bottom.toFixed(0)}  svh=${fit.svh} dvh=${fit.dvh} vh=${fit.vh}`
        if (fit.headline.top < fit.stage.top - 0.5)
          problems.push(`headline above the stage: ${fitLine}`)
        if (fit.pill.bottom > fit.stage.bottom + 0.5)
          problems.push(`call below the stage: ${fitLine}`)
        if (
          fit.headline.left < fit.stage.left - 0.5 ||
          fit.headline.right > fit.stage.right + 0.5
        ) {
          problems.push(`headline outside the stage horizontally: ${fitLine}`)
        }
        if (fit.pill.left < fit.stage.left - 0.5 || fit.pill.right > fit.stage.right + 0.5) {
          problems.push(`call outside the stage horizontally: ${fitLine}`)
        }
      }
      if (!fit.declared.some((rule) => rule.includes("100svh"))) {
        problems.push(`the stage is not 100svh: ${fit.declared.join(" | ") || "no height rule"}`)
      }
      if (fit.declared.some((rule) => rule.includes("100dvh"))) {
        problems.push("the stage uses dvh, so a toolbar would resize it")
      }
      if (Math.abs(fit.stageHeight - fit.svh) > 1) {
        problems.push(`stage height ${fit.stageHeight}px, 100svh is ${fit.svh}px`)
      }
      const lines = [
        `stage ${fit.stageHeight}px, 100svh ${fit.svh}px, 100dvh ${fit.dvh}px, 100vh ${fit.vh}px`,
        ...fit.declared,
        fit.headline && fit.pill
          ? `headline top ${fit.headline.top.toFixed(1)}, call bottom ${fit.pill.bottom.toFixed(1)}, stage ${fit.stage.top.toFixed(1)}–${fit.stage.bottom.toFixed(1)}`
          : "headline or call missing",
      ]
      publish(lines, problems, [
        "Headless Chromium has no mobile toolbar, so svh and dvh are the same height here. The check is the declared unit: 100svh does not follow a toolbar, 100dvh would.",
      ])
      expect(problems, problems.join("\n")).toEqual([])
    })
  }
})

test.describe("G13", () => {
  test.use({ viewport: { width: 1280, height: 820 } })

  test("leaving the look warps and fades the message, and the rest has neither", async ({
    page,
  }) => {
    await openTour(page, live.path)
    await page.mouse.move(640, 410)
    const stops = page.locator(".ui-rail__stop")
    const count = await stops.count()
    let last = -1
    for (let index = 0; index < count; index++) {
      if (await stops.nth(index).isVisible()) last = index
    }
    expect(last, "a rail stop for the look").toBeGreaterThan(0)
    await stops.nth(last).click()
    await settle(page)

    const rested = await readExit(page)
    expect(rested.inlineFilter, "at rest the inline filter is empty").toBe("")
    expect(rested.inlineOpacity, "at rest the inline opacity is empty").toBe("")
    expect(rested.exit, "at rest the warp is off").toBeNull()
    expect(rested.filter, "at rest the computed filter is none").toBe("none")
    expect(rested.opacity, "at rest the message is fully there").toBe(1)

    // A burst, not a settled tick: the idle is 170ms, and a settled tick from the
    // look would be pulled back into the hold before the warp could show.
    // 140px is about 0.17 of this screen, so the 0.55-screen warp spans a few ticks.
    const leaving = await burst(page, 140)
    expect(leaving.mid, "a frame inside the 0.55 screens is still blurring").not.toBeNull()
    const mid = leaving.mid!
    expect(mid.exit).toBe("on")
    expect(mid.inlineFilter, "the filter is the stylesheet, not an inline style").toBe("")
    expect(mid.inlineOpacity, "the fade is the stylesheet, not an inline style").toBe("")
    const blur = Number(/blur\(([0-9.]+)px\)/.exec(mid.filter)?.[1])
    expect(blur, "the prototype blurs by x * 5px").toBeCloseTo(mid.warp * 5, 1)
    const fade = Math.max(0, 1 - mid.warp * mid.warp * 1.15)
    expect(mid.opacity, "the fade is max(0, 1 - x * x * 1.15)").toBeCloseTo(fade, 1)
    expect(leaving.highest.warp, "the warp keeps going past that frame").toBeGreaterThan(mid.warp)

    const returning = await burst(page, -140)
    expect(returning.lowest.warp, "scrolling back re-forms the message").toBeLessThan(
      leaving.highest.warp
    )

    await stops.nth(last).click()
    await settle(page)
    const again = await readExit(page)
    expect(again.inlineFilter, "back on the look the inline filter is empty").toBe("")
    expect(again.inlineOpacity, "back on the look the inline opacity is empty").toBe("")
    expect(again.exit, "back on the look the warp is off").toBeNull()
    expect(again.filter).toBe("none")
    expect(again.opacity).toBe(1)
  })

  test("a coarse pointer fades and does not blur", async ({ page }) => {
    const client = await page.context().newCDPSession(page)
    await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 })
    await openTour(page, live.path)
    const coarse = await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches)
    expect(coarse, "the emulation is a coarse pointer").toBe(true)
    await page.mouse.move(200, 400)
    const stops = page.locator(".ui-rail__stop")
    const count = await stops.count()
    let last = -1
    for (let index = 0; index < count; index++) {
      if (await stops.nth(index).isVisible()) last = index
    }
    await stops.nth(last).click()
    await settle(page)

    const leaving = await burst(page, 140)
    expect(leaving.mid, "the fade is on while the look is leaving").not.toBeNull()
    expect(leaving.mid!.exit, "coarse is opacity only").toBe("fade")
    expect(leaving.mid!.filter, "no filter until a real phone has shown one").toBe("none")
    expect(leaving.mid!.opacity).toBeLessThan(1)
    expect(leaving.mid!.inlineOpacity).toBe("")
  })
})

test.describe("G13, reduced motion", () => {
  test.use({
    viewport: { width: 1280, height: 820 },
    contextOptions: { reducedMotion: "reduce" },
  })

  test("a reduced page does not warp", async ({ page }) => {
    // The tour does not run under reduced motion (tour.ts), so the part never
    // starts. Scrolling the finished page must still leave the message alone.
    await page.goto(live.path)
    await page.mouse.move(640, 410)
    const leaving = await burst(page, 140)
    expect(leaving.highest.exit).toBeNull()
    expect(leaving.highest.inlineFilter).toBe("")
    expect(leaving.highest.inlineOpacity).toBe("")
    expect(leaving.highest.filter).toBe("none")
  })
})

async function burst(page: Page, dy: number) {
  let mid: Awaited<ReturnType<typeof readExit>> | null = null
  let highest = await readExit(page)
  let lowest = highest
  for (let tick = 0; tick < 14; tick++) {
    await page.mouse.wheel(0, dy)
    await page.waitForTimeout(16)
    const now = await readExit(page)
    if ((now.exit === "on" || now.exit === "fade") && mid === null) mid = now
    if (now.warp > highest.warp) highest = now
    if (now.warp < lowest.warp) lowest = now
  }
  return { mid, highest, lowest }
}

async function readExit(page: Page) {
  return page.evaluate(() => {
    const message = document.querySelector(".message")
    if (!(message instanceof HTMLElement)) throw new Error("no message")
    const computed = getComputedStyle(message)
    const warp = Number(message.style.getPropertyValue("--warp"))
    return {
      inlineFilter: message.style.filter,
      inlineOpacity: message.style.opacity,
      warp: Number.isFinite(warp) ? warp : 0,
      exit: message.getAttribute("data-exit"),
      filter: computed.filter,
      opacity: Number(computed.opacity),
    }
  })
}
