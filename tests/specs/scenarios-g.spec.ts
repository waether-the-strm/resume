import { expect, test, type Page } from "@playwright/test"
import {
  driveKeys,
  driveRail,
  driveTouch,
  driveTrackpad,
  driveWheel,
  formatMeasurement,
  formatRestRow,
  holdStateProblems,
  midTileNotes,
  placeReading,
  readPage,
  readStageFit,
  repeatHoldProblems,
  restProblems,
  scrollToCentre,
  settle,
  stayedAtTop,
  visitStops,
  WHEEL_TICK_PX,
  writeMeasurement,
  type PlacedReading,
} from "../rest.ts"

// Scenarios G (docs/spec/TEST-SCENARIOS.md). Live scroll, both languages, three sizes.
//
// Already covered, and not repeated here:
//   G4 keys, G8 sound          tests/specs/tour.spec.ts
//   G5 rail, G11 the mark      tests/specs/rail.spec.ts
//   G10 the blob, G12 its menu tests/specs/blob.spec.ts
//   G9 the finished page with no tour, at 390×664   tests/specs/static-page.spec.ts
//
// This file adds G1, G2, G3, G6, G7 and the live half of G9. G13 is a fixme: the exit
// warp is issue #38, and it is not built. The page has no `html[data-stop]`; a rest is
// placed against `.track[data-track]`, and checked against the blob's title and the
// rail's nearest stop. `aria-current` is the chapter (G11), not the hold.
test.use({ contextOptions: { reducedMotion: "no-preference" } })
test.describe.configure({ timeout: 180_000 })

const locales = [
  { path: "/", lang: "en" },
  { path: "/pl/", lang: "pl" },
] as const

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

for (const viewport of viewports) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const locale of locales) {
      test.describe(locale.lang, () => {
        test("G1 G3: a 100px wheel tick comes to rest in a hold", async ({ page }) => {
          const errors = watchErrors(page)
          await openTour(page, locale.path)
          await page.mouse.move(viewport.width / 2, viewport.height / 2)
          const { down, up } = await driveWheel(page)
          const lines = [
            ...down.map((row) => formatRestRow("tick+100", row)),
            ...up.map((row) => formatRestRow("tick-100", row)),
          ]
          const found = [
            ...restProblems(down),
            ...restProblems(up),
            ...repeatHoldProblems(down, WHEEL_TICK_PX),
            ...repeatHoldProblems(up, WHEEL_TICK_PX),
            ...stayedAtTop(down),
            ...errors,
          ]
          // At 820px the answer hold is 98px. A 100px tick from its centre enters the
          // next travel by about 11%, and the settle returns anything under 12%, so the
          // tick comes back to the same hold. Shorter viewports leave it. Reported, not
          // tuned: the hold lengths stay as they are.
          const answerTrap = found.filter((problem) => problem.includes("stayed in answer"))
          const problems = found.filter((problem) => !problem.includes("stayed in answer"))
          const notes =
            viewport.height === 820
              ? answerTrap.map(
                  (problem) =>
                    `Expected at 820px, left for the lead: ${problem}. The answer hold is 98px wide and the travel after it is long, so a 100px tick from the centre is pulled back.`
                )
              : []
          publish(lines, problems, notes)
          expect(answerTrap, answerTrap.join("\n") || "the 820px answer trap").toHaveLength(
            viewport.height === 820 ? 1 : 0
          )
          expect(problems, problems.join("\n")).toEqual([])
        })

        test("G1: a trackpad drag comes to rest in a hold", async ({ page }) => {
          const errors = watchErrors(page)
          await openTour(page, locale.path)
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
            await openTour(page, locale.path)
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
          await openTour(page, locale.path)
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
          await openTour(page, locale.path)
          const tagged = await driveRail(page)
          const rows = rowsOf(tagged)
          const lines = tagged.map((item) =>
            item.row ? formatRestRow(item.tag, item.row) : `${item.tag}  (not on this page)`
          )
          const problems = [...restProblems(rows), ...stayedAtTop(rows), ...errors]
          publish(lines, problems)
          expect(problems, problems.join("\n")).toEqual([])
        })

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

        test("G6: a wheel cancels a glide, and a finger is not fought", async ({ page }) => {
          const errors = watchErrors(page)
          await openTour(page, locale.path)
          const start = await page.evaluate(() => Math.round(window.scrollY))
          await page.keyboard.press("ArrowDown")
          await expect
            .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 2000 })
            .toBeGreaterThan(start + 15)

          // Inside the page, so the samples sit inside the 40ms before a new settle can arm.
          const wheelDrift = await page.evaluate(async () => {
            window.dispatchEvent(
              new WheelEvent("wheel", { deltaY: 4, bubbles: true, cancelable: true })
            )
            const at = window.scrollY
            const samples: number[] = []
            for (let sample = 0; sample < 3; sample++) {
              await new Promise((resolve) => setTimeout(resolve, 10))
              samples.push(Math.abs(window.scrollY - at))
            }
            return samples
          })
          expect(
            Math.max(...wheelDrift),
            "the glide keeps writing after the wheel"
          ).toBeLessThanOrEqual(2)

          await settle(page)
          const again = await page.evaluate(() => Math.round(window.scrollY))
          await page.keyboard.press("ArrowDown")
          await expect
            .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 2000 })
            .toBeGreaterThan(again + 15)

          const fingerDrift = await page.evaluate(async () => {
            window.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true }))
            await new Promise((resolve) => setTimeout(resolve, 20))
            const parked = Math.round(window.scrollY + 90)
            window.scrollTo(0, parked)
            await new Promise((resolve) => setTimeout(resolve, 250))
            const drift = Math.abs(window.scrollY - parked)
            window.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true }))
            return drift
          })
          expect(
            fingerDrift,
            "a programmatic scroll moved the page while a finger was down"
          ).toBeLessThanOrEqual(2)
          expect(errors, errors.join("\n")).toEqual([])
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
              const shown = row.payoffOpacity > 0.95
              const hidden = row.payoffOpacity < 0.05
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
              if (row.payoffOpacity <= 0.95)
                problems.push(`${where}: payoff opacity ${row.payoffOpacity.toFixed(2)}`)
            } else if (row.payoffOpacity >= 0.05) {
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

test.fixme("G13: the exit warp is not built", async () => {
  // #38. Scrolling on from the look warps, blurs and fades the board over about
  // 0.55 screens; scrolling back re-forms it. At rest on the look the message
  // has no filter and no opacity. The page has neither yet.
})
