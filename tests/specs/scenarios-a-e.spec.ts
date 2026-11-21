import { expect, test, type Locator, type Page } from "@playwright/test"

// Scenarios A to E (docs/spec/TEST-SCENARIOS.md). One test per row, named by its id.
// The page is frozen with `?stage=S&t=T` or `?stage=jan`, except A13 and D7, which are
// live scroll. Assertions read the hooks the tour writes, not pixels:
// `html[data-tour]`, `.stage[data-scene]`, `.message[data-skin]`, `--t` on `.message`,
// `.message[data-note]`, `.guide[data-step|data-pay|data-after|data-how]`, and on
// `.equation` the flags `equationAt` sets (packages/narrative/src/equation.ts).
// A clause with no hook yet is a `test.fixme`, not a missing test.
test.use({ contextOptions: { reducedMotion: "no-preference" } })

const locales = [
  { path: "/", lang: "en" },
  { path: "/pl/", lang: "pl" },
] as const

const viewports = [
  { width: 1280, height: 820 },
  { width: 1280, height: 700 },
  { width: 390, height: 664 },
] as const

const guideCopy = {
  "/": {
    words: "First, only words.",
    look: "Now the look.",
    payoff: "Same words, read twice.",
    kicker: "the same question, answered",
    how: "how?",
    label: "how",
    who: "someone deciding whether to build with me.",
    titles: ["LetsReg sign-in", "GSR", "One design system, both products"],
  },
  "/pl/": {
    words: "Najpierw same słowa.",
    look: "Teraz wygląd.",
    payoff: "Te same słowa, czytane dwa razy.",
    kicker: "to samo pytanie, z odpowiedzią",
    how: "how?",
    label: "how",
    who: "ktoś, kto decyduje, czy ze mną budować.",
    titles: ["Logowanie LetsReg", "GSR", "Jeden design system, oba produkty"],
  },
} as const

interface EquationSample {
  line: boolean
  plus: boolean
  asked: number
  answered: number
  how: boolean
  left: boolean
  warped: boolean
  alone: boolean
  gone: boolean
  hidden: boolean
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

async function openMoment(page: Page, path: string, stage: number, t: number) {
  await page.goto(`${path}?stage=${stage}&t=${t}`)
  await expect(page.locator("html")).toHaveAttribute("data-tour", "moment")
  await expect(page.locator(".stage")).toHaveAttribute("data-scene", String(stage))
  await fontsReady(page)
}

async function openLive(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator("html")).toHaveAttribute("data-tour", "on")
  await fontsReady(page)
}

async function openCard(page: Page, path: string) {
  await page.goto(`${path}?stage=jan`)
  await expect(page.locator("html")).not.toHaveAttribute("data-tour")
  await expect(page.locator("#jan")).toBeInViewport()
  await fontsReady(page)
}

async function expectFlag(locator: Locator, name: string, on: boolean) {
  if (on) await expect(locator).toHaveAttribute(name, "")
  else await expect(locator).not.toHaveAttribute(name)
}

async function expectEquation(
  page: Page,
  flags: {
    line?: boolean
    plus?: boolean
    pulsed?: boolean
    how?: boolean
    left?: boolean
    warped?: boolean
    alone?: boolean
    gone?: boolean
    hidden?: boolean
  }
) {
  const root = page.locator(".equation")
  for (const [name, on] of Object.entries(flags)) {
    if (on === undefined) continue
    await expectFlag(root, `data-${name}`, on)
  }
}

async function expectRows(page: Page, asked: boolean[], answered: boolean[]) {
  const rows = page.locator(".equation .above .row")
  await expect(rows).toHaveCount(3)
  for (let index = 0; index < 3; index++) {
    const row = rows.nth(index)
    await expectFlag(row, "data-asked", asked[index] ?? false)
    const answer = row.locator(".a")
    if (answered[index]) await expect(answer).toHaveAttribute("data-melt", "in")
    else await expect(answer).not.toHaveAttribute("data-melt")
  }
}

async function expectProgress(page: Page, t: number) {
  await expect(page.locator(".message")).toHaveAttribute(
    "style",
    new RegExp(`--t:\\s*${t.toFixed(3)}`)
  )
}

async function opacity(locator: Locator): Promise<number> {
  return locator.evaluate((el) => Number(getComputedStyle(el).opacity))
}

async function expectOpacity(locator: Locator, expected: number) {
  await expect
    .poll(async () => opacity(locator), { message: `opacity near ${expected}` })
    .toBeCloseTo(expected, 1)
}

function tileOpacity(t: number, index: number): number {
  return Math.min(1, Math.max(0, (t - 0.06 - index * 0.09) * 9))
}

async function variationAxis(locator: Locator, axis: string): Promise<number> {
  const raw = await locator.evaluate((el) => getComputedStyle(el).fontVariationSettings)
  const match = new RegExp(`["']?${axis}["']?\\s+([\\d.]+)`).exec(raw)
  if (!match?.[1]) throw new Error(`no ${axis} in ${raw}`)
  return Number(match[1])
}

async function scrollToScreens(page: Page, position: number) {
  await page.evaluate((position) => {
    const track = document.querySelector<HTMLElement>(".track")
    const stage = document.querySelector<HTMLElement>(".stage")
    if (!track || !stage) throw new Error("the track is missing")
    const origin = track.getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, origin + position * stage.offsetHeight)
  }, position)
}

function rank(sample: EquationSample): number {
  if (sample.hidden) return 14
  if (sample.gone) return 13
  if (sample.alone) return 12
  if (sample.warped) return 11
  if (sample.left) return 10
  if (sample.how) return 9
  if (sample.answered >= 3) return 8
  if (sample.asked >= 3) return 7
  if (sample.answered >= 2) return 6
  if (sample.asked >= 2) return 5
  if (sample.answered >= 1) return 4
  if (sample.asked >= 1) return 3
  if (sample.plus) return 2
  if (sample.line) return 1
  return 0
}

function expectMonotonic(ranks: number[], direction: 1 | -1) {
  for (let index = 1; index < ranks.length; index++) {
    const delta = (ranks[index] ?? 0) - (ranks[index - 1] ?? 0)
    expect(
      delta * direction,
      `rank ${ranks[index - 1]} → ${ranks[index]} at ${index}`
    ).toBeGreaterThanOrEqual(0)
  }
}

for (const viewport of viewports) {
  test.describe(`${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const locale of locales) {
      const copy = guideCopy[locale.path]
      const cardWide = viewport.width >= 900
      const messageWide = viewport.width > 760

      test.describe(locale.lang, () => {
        test("A1: empty paper, no guide", async ({ page }) => {
          await openMoment(page, locale.path, 0, 0)
          await expectEquation(page, {
            line: false,
            plus: false,
            how: false,
            hidden: false,
          })
          await expectRows(page, [false, false, false], [false, false, false])
          await expect(page.locator(".guide")).toBeHidden()
          await expect(page.locator(".message")).toBeHidden()
          await expect(page.locator(".message")).toHaveAttribute("data-skin", "none")
        })

        test.fixme("A1: the blob and the dots are not built", async () => {
          // #35 has no blob to sit bottom-centre, #34 no rail whose dots could be off.
        })

        test("A2: the line is drawn", async ({ page }) => {
          await openMoment(page, locale.path, 0, 0.05)
          await expectEquation(page, { line: true, plus: false, how: false })
          await expectRows(page, [false, false, false], [false, false, false])
        })

        test("A3: the plus, and nothing above the line", async ({ page }) => {
          await openMoment(page, locale.path, 0, 0.09)
          await expectEquation(page, { line: true, plus: true, how: false })
          await expectRows(page, [false, false, false], [false, false, false])
        })

        test("A4: the question comes before its answer", async ({ page }) => {
          await openMoment(page, locale.path, 0, 0.13)
          await expectRows(page, [true, false, false], [false, false, false])
          await expect(page.locator(".equation .how .a")).not.toHaveAttribute("data-melt")
        })

        test("A5: what? is answered, why? is not open", async ({ page }) => {
          await openMoment(page, locale.path, 0, 0.2)
          await expectRows(page, [true, false, false], [true, false, false])
          await expect(page.locator(".equation .above .row").first().locator(".a")).not.toBeEmpty()
        })

        test("A6: three answers, no how?, the line not yet pulsed", async ({ page }) => {
          // The table says the pulse is here. The engine pulses with `how?`, at phase 9.
          await openMoment(page, locale.path, 0, 0.45)
          await expectRows(page, [true, true, true], [true, true, true])
          await expectEquation(page, { how: false, pulsed: false, left: false })
        })

        test("A7: how? centred, no answer, the line pulsed", async ({ page }) => {
          await openMoment(page, locale.path, 0, 0.5)
          await expectEquation(page, { how: true, left: false, pulsed: true, alone: false })
          await expect(page.locator(".equation .how .a")).not.toHaveAttribute("data-melt")
          await expect(page.locator(".guide")).toBeHidden()
        })

        test("A8: how? on the left, with its answer", async ({ page }) => {
          await openMoment(page, locale.path, 0, 0.58)
          await expectEquation(page, {
            how: true,
            left: true,
            pulsed: true,
            alone: false,
            gone: false,
          })
          await expectRows(page, [true, true, true], [true, true, true])
          const answer = page.locator(".equation .how .a")
          await expect(answer).toHaveAttribute("data-melt", "in")
          await expect(answer).not.toBeEmpty()
          await expect(page.locator(".equation .how .op")).toHaveCSS("opacity", "1")
        })

        test("A9: the questions and the line are dissolving, the how row intact", async ({
          page,
        }) => {
          await openMoment(page, locale.path, 0, 0.7)
          await expectEquation(page, {
            warped: true,
            alone: false,
            left: true,
            how: true,
            gone: false,
          })
          await expect(page.locator(".equation .how .a")).toHaveAttribute("data-melt", "in")
          const warp = await page
            .locator(".equation")
            .evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--warp")))
          expect(warp).toBeGreaterThan(0)
          expect(warp).toBeLessThan(1)
        })

        test("A10: the how row stands alone and its answer has left", async ({ page }) => {
          // Phase 12 (t >= 0.80) drops the answer. The table still describes it as on screen.
          await openMoment(page, locale.path, 0, 0.82)
          await expectEquation(page, {
            alone: true,
            how: true,
            gone: false,
            hidden: false,
            warped: false,
          })
          await expect(page.locator(".equation .how .a")).not.toHaveAttribute("data-melt")
          await expect(page.locator(".guide")).toBeHidden()
        })

        test("A11: how is already in the corner, the equation still on the page", async ({
          page,
        }) => {
          // Phase 13 opens at t = 0.86, so this row is past the empty frame the prototype had.
          await openMoment(page, locale.path, 0, 0.88)
          await expectEquation(page, { gone: true, hidden: false, alone: true })
          await expect(page.locator(".equation .how .a")).not.toHaveAttribute("data-melt")
          await expectFlag(page.locator(".guide"), "data-how", true)
          await expect(page.locator(".guide .how")).toBeVisible()
        })

        test("t=0.9: how is already in the corner, so the page is not empty", async ({ page }) => {
          await openMoment(page, locale.path, 0, 0.9)
          await expect(page.locator(".equation")).toHaveAttribute("data-gone", "")
          await expect(page.locator(".equation")).not.toHaveAttribute("data-hidden")
          await expectFlag(page.locator(".guide"), "data-how", true)
          await expect(page.locator(".guide .how")).toBeVisible()
          await expect(page.locator(".guide .how")).toHaveText(copy.label)
        })

        test("A12: how is in the corner and the equation is off the page", async ({ page }) => {
          await openMoment(page, locale.path, 0, 0.95)
          await expectEquation(page, { hidden: true, gone: true })
          await expect(page.locator(".equation")).toBeHidden()
          await expectFlag(page.locator(".guide"), "data-how", true)
          await expect(page.locator(".guide")).toBeVisible()
        })

        test.fixme("A12: the band is not built", async () => {
          // The prototype's band has no element on the page.
        })

        test("A13: scrolling back from the corner replays the equation", async ({ page }) => {
          test.setTimeout(60_000)
          await openLive(page, locale.path)
          const { forward, back } = await page.evaluate(async () => {
            const root = document.querySelector<HTMLElement>(".equation")
            const track = document.querySelector<HTMLElement>(".track")
            const stage = document.querySelector<HTMLElement>(".stage")
            if (!root || !track || !stage) throw new Error("the equation is missing")
            const read = () => ({
              line: root.hasAttribute("data-line"),
              plus: root.hasAttribute("data-plus"),
              asked: root.querySelectorAll(".above .row[data-asked]").length,
              answered: root.querySelectorAll('.above .row .a[data-melt="in"]').length,
              how: root.hasAttribute("data-how"),
              left: root.hasAttribute("data-left"),
              warped: root.hasAttribute("data-warped"),
              alone: root.hasAttribute("data-alone"),
              gone: root.hasAttribute("data-gone"),
              hidden: root.hasAttribute("data-hidden"),
            })
            const origin = track.getBoundingClientRect().top + window.scrollY
            const screen = stage.offsetHeight
            const go = (position: number) => window.scrollTo(0, origin + position * screen)
            // The tour applies a scroll on the next frame. Reading in the same turn sees the old state.
            const flush = () =>
              new Promise<void>((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
              })
            const forward: ReturnType<typeof read>[] = []
            for (let position = 0; position <= 2.6; position += 0.02) {
              go(position)
              await flush()
              forward.push(read())
              if (forward.at(-1)?.hidden) break
            }
            const back: ReturnType<typeof read>[] = []
            const start = (forward.length - 1) * 0.02
            for (let position = start; position >= 0; position -= 0.02) {
              go(position)
              await flush()
              back.push(read())
            }
            return { forward, back }
          })

          expect(
            forward.some((sample) => sample.hidden),
            JSON.stringify(forward.at(-1))
          ).toBe(true)
          const forwardRanks = forward.map(rank)
          const backRanks = back.map(rank)
          expectMonotonic(forwardRanks, 1)
          expectMonotonic(backRanks, -1)
          const seen = new Set([...forwardRanks, ...backRanks])
          for (const needed of [1, 2, 3, 10, 12, 14]) {
            expect(seen, `phase rank ${needed} was not replayed`).toContain(needed)
          }
        })

        test.fixme("A13: sparks at the crossings are not built", async () => {
          // Nothing in the page stands for a spark (#38).
        })

        test("B1: the words heading melts in, the message is not visible yet", async ({ page }) => {
          await openMoment(page, locale.path, 1, 0)
          await expect(page.locator(".message")).toHaveAttribute("data-skin", "words")
          await expect(page.locator(".guide")).toHaveAttribute("data-step", "1")
          await expect(page.locator('.guide .step[data-for="1"]')).toContainText(copy.words)
          await expectProgress(page, 0)
          const blocks = page.locator(".message .blk")
          await expect(blocks).toHaveCount(5)
          for (const block of await blocks.all()) await expectOpacity(block, 0)
        })

        test("B2: the first sentences are in, the later ones still faded", async ({ page }) => {
          await openMoment(page, locale.path, 1, 0.3)
          await expect(page.locator(".message")).toHaveAttribute("data-skin", "words")
          await expectProgress(page, 0.3)
          const blocks = page.locator(".message .blk")
          const values = []
          for (const block of await blocks.all()) values.push(await opacity(block))
          expect(values[0]).toBeCloseTo(1, 1)
          expect(values.at(-1)).toBeCloseTo(0, 1)
          for (let index = 1; index < values.length; index++) {
            expect(values[index] ?? 0).toBeLessThanOrEqual((values[index - 1] ?? 0) + 0.05)
          }
        })

        test("B3: the whole block, monospace, no labels and no boxes", async ({ page }) => {
          await openMoment(page, locale.path, 1, 1)
          const message = page.locator(".message")
          await expect(message).toHaveAttribute("data-skin", "words")
          await expect(page.locator(".guide")).toHaveAttribute("data-step", "1")
          await expectProgress(page, 1)
          await expect(message.locator(".note").first()).toBeHidden()
          const blocks = message.locator(".blk")
          await expect(blocks).toHaveCount(5)
          for (const block of await blocks.all()) {
            await expectOpacity(block, 1)
            await expect(block).toHaveCSS("display", "inline")
          }
          await expect.poll(() => variationAxis(message.locator("h1"), "MONO")).toBeGreaterThan(0.8)
        })

        test("C1: structure is on at its start, with the scene 2 heading", async ({ page }) => {
          // A freeze lands with no beat (scenes.jump). The live hold of scene 1 is not this URL.
          await openMoment(page, locale.path, 2, 0)
          await expect(page.locator(".message")).toHaveAttribute("data-skin", "structure")
          await expect(page.locator(".guide")).toHaveAttribute("data-step", "2")
          await expect(page.locator(".message")).toHaveAttribute("data-note", "0")
          await expectProgress(page, 0)
        })

        test("C2: five boxes, lowercase names, the same words", async ({ page }) => {
          await openMoment(page, locale.path, 2, 0.1)
          const message = page.locator(".message")
          await expect(message).toHaveAttribute("data-skin", "structure")
          await expectProgress(page, 0.1)
          await expect(message).toHaveAttribute("data-note", "0")
          await expect(message.locator(".blk")).toHaveCount(5)
          await expect(message.locator(".note")).toHaveCount(5)
          await expect(message.locator(".note").first()).toBeVisible()
          const note = message.locator(".note").first()
          await expectOpacity(note.locator(".lc"), 1)
          await expectOpacity(note.locator(".uc"), 0)
          await expect(message.locator(".ui-w").first()).not.toBeEmpty()
          const border = await message
            .locator(".blk")
            .first()
            .evaluate((el) => getComputedStyle(el).borderTopWidth)
          expect(border).not.toBe("0px")
        })

        test("C3: the names are capitalised, no syntax yet", async ({ page }) => {
          await openMoment(page, locale.path, 2, 0.3)
          const message = page.locator(".message")
          await expect(message).toHaveAttribute("data-note", "1")
          const note = message.locator(".note").first()
          await expectOpacity(note.locator(".uc"), 1)
          await expectOpacity(note.locator(".lc"), 0)
          await expectOpacity(note.locator(".part.syn").first(), 0)
        })

        test("C4: the element syntax is unfolded", async ({ page }) => {
          await openMoment(page, locale.path, 2, 0.5)
          const message = page.locator(".message")
          await expect(message).toHaveAttribute("data-note", "2")
          const note = message.locator(".note").first()
          await expectOpacity(note.locator(".part.syn").first(), 1)
          await expectOpacity(note.locator(".part.tok"), 0)
          await expect(note).toContainText('as="h1"')
        })

        test("C5: the tokens are unfolded", async ({ page }) => {
          await openMoment(page, locale.path, 2, 0.8)
          const message = page.locator(".message")
          await expect(message).toHaveAttribute("data-note", "3")
          await expectProgress(page, 0.8)
          const note = message.locator(".note").first()
          await expectOpacity(note.locator(".part.tok"), 1)
          await expect(note).toContainText("message-headline-size")
        })

        test("C6: sans, boxes almost gone, labels still readable", async ({ page }) => {
          await openMoment(page, locale.path, 2, 1)
          const message = page.locator(".message")
          await expect(message).toHaveAttribute("data-skin", "structure")
          await expect(message).toHaveAttribute("data-note", "3")
          await expectProgress(page, 1)
          await expect(message.locator(".note").first()).toBeVisible()
          await expect.poll(() => variationAxis(message.locator("h1"), "MONO")).toBeLessThan(0.2)
          const alpha = await message
            .locator(".blk")
            .first()
            .evaluate((el) => {
              const color = getComputedStyle(el).borderTopColor
              const slash = /\/\s*([\d.]+%?)\s*\)/.exec(color)
              if (slash?.[1]) {
                return slash[1].endsWith("%")
                  ? Number(slash[1].slice(0, -1)) / 100
                  : Number(slash[1])
              }
              const rgba = /rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/.exec(
                color
              )
              if (rgba?.[1]) return Number(rgba[1])
              return color.startsWith("rgb(") ? 1 : Number.NaN
            })
          expect(alpha, "box border alpha").toBeLessThan(0.15)
        })

        test("C6: the headline grows", async ({ page }) => {
          await openMoment(page, locale.path, 2, 1)
          const ratio = await page.locator(".message").evaluate((el) => {
            const headline = el.querySelector("h1")
            if (!headline) return 0
            return (
              Number.parseFloat(getComputedStyle(headline).fontSize) /
              Number.parseFloat(getComputedStyle(el).fontSize)
            )
          })
          expect(ratio, "headline size against the message").toBeGreaterThan(1.6)
        })

        test("D1: the look is on at its start, with the scene 3 heading", async ({ page }) => {
          // A freeze lands with no beat. The live hold of scene 2 is not this URL.
          await openMoment(page, locale.path, 3, 0)
          const message = page.locator(".message")
          await expect(message).toHaveAttribute("data-skin", "look")
          await expect(page.locator(".guide")).toHaveAttribute("data-step", "3")
          await expect(page.locator('.guide .step[data-for="3"]')).toContainText(copy.look)
          await expectProgress(page, 0)
          await expectFlag(page.locator(".guide"), "data-pay", false)
        })

        test("D2: the look's hero, the accent on the headline, tiles not in yet", async ({
          page,
        }) => {
          await openMoment(page, locale.path, 3, 0.1)
          const message = page.locator(".message")
          await expect(message).toHaveAttribute("data-skin", "look")
          await expectProgress(page, 0.1)
          const accent = message.locator('.headline [data-role="accent"]')
          await expect(accent.first()).toBeVisible()
          expect(await accent.count()).toBeGreaterThan(0)
          await expect(message.locator(".lead")).toBeVisible()
          const columns = await message.evaluate((el) =>
            getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean)
          )
          expect(columns).toHaveLength(messageWide ? 2 : 1)
          const tiles = message.locator("li")
          await expect(tiles).toHaveCount(3)
          for (let index = 0; index < 3; index++) {
            await expectOpacity(tiles.nth(index), tileOpacity(0.1, index))
          }
        })

        test.fixme("D2: the rule above who is not the equation's travelling line", async () => {
          // The line does not move out of the equation. The who block has its own rule.
        })

        test("D3: tiles 01 and 02 are in, 03 is entering, colour is on", async ({ page }) => {
          await openMoment(page, locale.path, 3, 0.25)
          const message = page.locator(".message")
          await expectProgress(page, 0.25)
          const tiles = message.locator("li")
          for (let index = 0; index < 3; index++) {
            await expectOpacity(tiles.nth(index), tileOpacity(0.25, index))
          }
          const colors = await message.locator(".headline").evaluate((el) => ({
            accent: getComputedStyle(el.querySelector("[data-role='accent']") ?? el).color,
            plain: getComputedStyle(el.querySelector(".ui-w:not([data-role='accent'])") ?? el)
              .color,
          }))
          expect(colors.accent).not.toBe(colors.plain)
        })

        test("D4: the name line is visible and the weight wave is mid-sentence", async ({
          page,
        }) => {
          await openMoment(page, locale.path, 3, 0.5)
          const who = page.locator('.message [data-block="who"]')
          await expectOpacity(who, 1)
          await expectProgress(page, 0.5)
          const weights = await who
            .locator(".ui-w")
            .evaluateAll((els) => els.map((el) => getComputedStyle(el).fontVariationSettings))
          const numbers = weights.map((raw) => {
            const match = /["']?wght["']?\s+([\d.]+)/.exec(raw)
            return match?.[1] ? Number(match[1]) : Number.NaN
          })
          expect(Math.max(...numbers)).toBeGreaterThan(700)
          expect(numbers.at(-1) ?? 0).toBeCloseTo(400, -1)
        })

        test("D5: the name stays heavy, the rest has settled, the call is entering", async ({
          page,
        }) => {
          await openMoment(page, locale.path, 3, 0.75)
          const who = page.locator(".message .who")
          await expectProgress(page, 0.75)
          const names = who.locator('[data-role="name"]')
          const rest = who.locator(".ui-w:not([data-role='name'])")
          for (const word of await names.all()) {
            await expect.poll(() => variationAxis(word, "wght")).toBeCloseTo(800, -2)
          }
          for (const word of await rest.all()) {
            await expect.poll(() => variationAxis(word, "wght")).toBeCloseTo(400, -2)
          }
          await expectOpacity(page.locator('.message [data-block="call"]'), 0.56)
        })

        test("D6: the call and the pill, the payoff under the guide", async ({ page }) => {
          await openMoment(page, locale.path, 3, 1)
          const message = page.locator(".message")
          await expect(message).toHaveAttribute("data-skin", "look")
          await expectProgress(page, 1)
          await expectOpacity(message.locator('[data-block="call"]'), 1)
          await expect(message.locator("a.ui-pill")).toBeVisible()
          const guide = page.locator(".guide")
          await expectFlag(guide, "data-pay", true)
          await expect(guide).toHaveAttribute("data-step", "3")
          await expectOpacity(guide.locator(".pay"), 1)
          await expect(guide.locator(".pay")).toContainText(copy.payoff)
        })

        test("D7: the finished look holds, then the page flows to the card", async ({ page }) => {
          await openLive(page, locale.path)
          const length = await page.locator(".track").evaluate((el) => {
            const data = JSON.parse(el.dataset.track ?? "null") as {
              stops: { travel: number; hold: number }[]
            }
            return data.stops.reduce((sum, stop) => sum + stop.travel + stop.hold, 0)
          })
          const message = page.locator(".message")
          const guide = page.locator(".guide")
          await scrollToScreens(page, length - 0.1)
          await expect(message).toHaveAttribute("data-skin", "look")
          await expect(guide).toHaveAttribute("data-step", "3")
          await expectFlag(guide, "data-pay", true)
          await expectFlag(guide, "data-after", false)
          await expect(page.locator(".card")).not.toBeInViewport()

          await scrollToScreens(page, length + 0.7)
          await expect(message).toHaveAttribute("data-skin", "look")
          await expectFlag(guide, "data-pay", true)
          await expectFlag(guide, "data-after", true)
          await expect(page.locator(".card")).toBeInViewport()
        })

        test("the four questions and the corner word are English notation in every language", async ({
          page,
        }) => {
          await page.goto(locale.path)
          const questions = page.locator(".equation .q")
          await expect(questions).toHaveText(["what?", "why?", "who?", "how?"])
          for (const question of await questions.all()) {
            await expect(question).toHaveAttribute("lang", "en")
          }
          await expect(page.locator(".guide .how")).toHaveText("how")
          await expect(page.locator(".guide .how")).toHaveAttribute("lang", "en")
          await expect(page.locator(".equation .a").nth(2)).toHaveText(copy.who)
        })

        test("E1: the kicker, the monogram, one hairline below", async ({ page }) => {
          await openCard(page, locale.path)
          const kicker = page.locator(".card .ui-kicker")
          await expect(kicker).toBeVisible()
          await expect(kicker).toContainText(copy.how)
          await expect(kicker).toContainText(copy.kicker)
          await expect(kicker.locator(".ui-mark")).toHaveText("JM")
          const line = await kicker.evaluate((el) => {
            const style = getComputedStyle(el)
            return { top: style.borderTopWidth, bottom: style.borderBottomWidth }
          })
          expect(line.bottom).not.toBe("0px")
          expect(line.top).toBe("0px")
        })

        test("E2: the name and the paths, hairlines only between the paths", async ({ page }) => {
          await openCard(page, locale.path)
          const name = page.locator(".card .name")
          const paths = page.locator(".card nav.ui-paths > a")
          await expect(paths).toHaveCount(3)
          const nameBox = await name.boundingBox()
          const firstBox = await paths.first().boundingBox()
          expect(nameBox, "name has a box").not.toBeNull()
          expect(firstBox, "path has a box").not.toBeNull()
          if (!nameBox || !firstBox) return
          if (cardWide) {
            const textTop = await paths.first().evaluate((el) => {
              return (
                el.getBoundingClientRect().top + Number.parseFloat(getComputedStyle(el).paddingTop)
              )
            })
            expect(
              Math.abs(nameBox.y - textTop),
              `name ${nameBox.y}px, path text ${textTop}px`
            ).toBeLessThanOrEqual(4)
          } else {
            expect(firstBox.y).toBeGreaterThan(nameBox.y + nameBox.height)
          }
          const borders = await paths.evaluateAll((els) =>
            els.map((el) => getComputedStyle(el).borderTopWidth)
          )
          expect(borders[0]).toBe("0px")
          expect(borders[1]).not.toBe("0px")
          expect(borders[2]).not.toBe("0px")
          const own = await page
            .locator(".card .role")
            .evaluate((el) => getComputedStyle(el).borderTopWidth)
          expect(own).toBe("0px")
        })

        test("E3: three project cards, a visual each, hover lifts one", async ({ page }) => {
          await openCard(page, locale.path)
          const cards = page.locator("ul.ui-work > li")
          await expect(cards).toHaveCount(3)
          for (const [index, title] of copy.titles.entries()) {
            const card = cards.nth(index)
            await expect(card.locator(".ui-work__visual")).toBeVisible()
            const height = await card
              .locator(".ui-work__visual")
              .evaluate((el) => el.getBoundingClientRect().height)
            expect(height).toBeGreaterThan(80)
            await expect(card).toContainText(title)
          }
          const card = cards.first()
          await card.hover()
          await expect
            .poll(async () =>
              card.evaluate((el) => {
                const value = getComputedStyle(el).translate
                if (!value || value === "none") return 0
                const parts = value.split(" ").map((part) => Number.parseFloat(part))
                return parts.length > 1 ? (parts[1] ?? 0) : 0
              })
            )
            .toBeLessThan(0)
        })

        test("E4: the guide is gone and the card is what is on screen", async ({ page }) => {
          await openCard(page, locale.path)
          await expect(page.locator(".guide")).toBeHidden()
          await expect(page.locator("a.skip")).not.toBeInViewport()
          await expect(page.locator(".card")).toBeInViewport()
        })

        test.fixme("E4: dots, the band, and data-after are not on the card", async () => {
          // The rail and the band are not built. Card mode returns before the tour
          // writes `data-after`; the guide is hidden because `data-tour` is absent.
        })
      })
    }
  })
}
