// Where a scroll comes to rest, and what that hold shows.
//
// Ported from docs/spec/tools/rest.mjs and stops.mjs as helpers the Playwright specs call.
// The prototype tools launch their own browser and print a line per gesture. Here the spec
// owns the browser. The gesture lengths, the settle poll and the twelve-stop walk are the
// prototype's. The hold math is the engine's (`holdAt` in packages/narrative): the page has
// no `html[data-stop]`, so a rest is placed against `.track[data-track]`.
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import type { CDPSession, Page } from "@playwright/test"

/** Screens of slack at a hold's edge. The same value as `HOLD_SLACK` in the engine's `holdAt`. */
export const HOLD_SLACK = 0.004

/** A 100px wheel tick, the gesture scenario G3 names. */
export const WHEEL_TICK_PX = 100

export interface StopDef {
  id: string
  stage: number
  t: number
  travel: number
  hold: number
}

export interface PlacedStop extends StopDef {
  from: number
  to: number
}

/** What the page reports for one settled scroll. `screens` is from the top of the track. */
export interface PageReading {
  y: number
  screens: number
  screenHeight: number
  stops: readonly StopDef[]
  scene: string
  skin: string
  progress: string
  guideStep: string
  guideShown: boolean
  pay: boolean
  payoffOpacity: number
  equationHidden: boolean
  blockOpacities: { block: string; opacity: number }[]
  note: string | null
  whoOpacity: number | null
  callOpacity: number | null
  tileOpacities: number[]
  whoWeights: number[]
  blobStop: string | null
  blobTitle: string
  nearest: string | null
}

export interface PlacedReading extends PageReading {
  length: number
  hold: number
  inside: boolean
  placed: PlacedStop[]
}

export interface TaggedRest {
  tag: string
  /** Null when the control was not there to use (a phone hides the dots). */
  row: PlacedReading | null
}

const measurementDir = fileURLToPath(new URL("./test-results/rest/", import.meta.url))

export function layoutStops(stops: readonly StopDef[]): { stops: PlacedStop[]; length: number } {
  let at = 0
  const placed = stops.map((stop) => {
    const from = at + stop.travel
    const to = from + stop.hold
    at = to
    return { ...stop, from, to }
  })
  return { stops: placed, length: at }
}

export function holdIndex(stops: readonly PlacedStop[], screens: number): number {
  return stops.findIndex(
    (stop) => screens >= stop.from - HOLD_SLACK && screens <= stop.to + HOLD_SLACK
  )
}

export function insideTrack(length: number, screens: number): boolean {
  return screens >= -HOLD_SLACK && screens <= length + HOLD_SLACK
}

export function placeReading(reading: PageReading): PlacedReading {
  const laid = layoutStops(reading.stops)
  return {
    ...reading,
    length: laid.length,
    hold: holdIndex(laid.stops, reading.screens),
    inside: insideTrack(laid.length, reading.screens),
    placed: laid.stops,
  }
}

/**
 * G1. A rest inside the track is inside a hold. The blob's current title and the rail's
 * nearest stop are what the page shows for that hold (`aria-current` is the chapter, G11).
 */
export function restProblems(rows: readonly PlacedReading[]): string[] {
  const problems: string[] = []
  rows.forEach((row, index) => {
    if (!row.inside) return
    if (row.hold < 0) {
      problems.push(
        `${index}: ${row.screens.toFixed(3)} screens is inside the track and not in a hold`
      )
      return
    }
    const shown = row.placed[row.hold]?.id ?? String(row.hold)
    if (row.blobStop !== String(row.hold)) {
      problems.push(`${index}: hold ${shown} but the blob shows ${row.blobStop ?? "nothing"}`)
    }
    if (row.nearest !== String(row.hold)) {
      problems.push(
        `${index}: hold ${shown} but the rail's nearest stop is ${row.nearest ?? "nothing"}`
      )
    }
  })
  return problems
}

/**
 * Screens a forward walk must reach before its rests count.
 * The prototype's second hold, `what`, ends at 0.37: the start holds 0.05, then a travel
 * of 0.2, then a hold of 0.12. Short of 0.4 the gestures never left the opening, which is
 * what a scroller that did not move looks like.
 */
export const OPENING_SCREENS = 0.4

/**
 * A dead gesture looks like a rest in the first hold. Forward input that never leaves the
 * top of the page did not drive the tour, so the measurement is not evidence.
 */
export function stayedAtTop(rows: readonly PlacedReading[], minimum = OPENING_SCREENS): string[] {
  if (rows.length === 0) return ["no gesture was measured"]
  const furthest = rows.reduce((max, row) => Math.max(max, row.screens), 0)
  if (furthest < minimum) {
    return [`the gestures never left the top of the page (furthest ${furthest.toFixed(2)} screens)`]
  }
  return []
}

/**
 * G3. A tick that comes back to the hold it just left is the wheel trap, unless that hold
 * is wider than the tick, in which case the tick never left it.
 */
export function repeatHoldProblems(rows: readonly PlacedReading[], tickPx: number): string[] {
  const problems: string[] = []
  for (let index = 1; index < rows.length; index++) {
    const previous = rows[index - 1]
    const row = rows[index]
    if (!previous || !row) continue
    if (!previous.inside || !row.inside) continue
    if (previous.hold < 0 || row.hold < 0 || previous.hold !== row.hold) continue
    const stop = row.placed[row.hold]
    if (!stop) continue
    const width = stop.hold * row.screenHeight
    if (width <= tickPx) {
      problems.push(
        `${index}: stayed in ${stop.id} (${width.toFixed(0)}px wide) after a ${tickPx}px tick, at ${row.screens.toFixed(3)} screens`
      )
    }
  }
  return problems
}

const skins = ["none", "words", "structure", "look"] as const

/**
 * Words, the look and the payoff are opacity 0 or 1 in `tour.css`. Under 0.05 has not
 * started; over 0.95 has arrived. The band between is the half-shown frame G2 notes
 * and G7 rejects.
 */
export const OPACITY_HIDDEN = 0.05
export const OPACITY_SHOWN = 0.95

/**
 * A stop that must be fully in (the words, the finished look). Two hundredths off 1:
 * the CSS value is 1, and a computed style that has arrived can sit just under it.
 * Tighter than {@link OPACITY_SHOWN} on purpose, so a frame at 0.96 is still half shown.
 */
const FULLY_IN = 0.98

/**
 * A heading block has come up. Below {@link FULLY_IN}, so a block at 0.95 means the
 * page is not empty and is still half shown where the stop must be fully in.
 */
const BLOCK_UP = 0.9

/**
 * The look's weight wave rests at 400, and at 800 for a name the wave has passed
 * (`400 + 450 * near * (1 - nm * kept) + 400 * nm * kept` in `tour.css`). The visual
 * language asks for 800 against 400. The wave adds 450 at its crest, so a word within
 * 40 of a rest has arrived and a word still on the wave has not. 40 also covers the
 * rounding of a computed `wght` axis.
 */
const WEIGHT_REST = 400
const WEIGHT_NAME = 800
const WEIGHT_TOLERANCE = 40

/**
 * G2. Each hold is one finished state of its stop: the scene agrees with the guide, a
 * heading is not standing over an empty stage, and the frames the research called half-built
 * (the words, the weight wave, the finished look) are fully in or fully out.
 *
 * The tiles stop is t=0.32 on purpose, the frame where the last tile is still entering.
 * A mid opacity there is reported by {@link midTileNotes}, not failed here.
 */
/** One step of the stop walk: `index` is the stop the step was meant to land on. */
export function describeHold(row: PlacedReading, index: number): string[] {
  const problems: string[] = []
  const stop = row.placed[index]
  const where = stop ? `${index} ${stop.id}` : String(index)
  if (!stop) {
    problems.push(`${where}: the track has no stop at this step`)
    return problems
  }
  if (row.hold !== index) {
    const landed = row.hold < 0 ? "no hold" : (row.placed[row.hold]?.id ?? String(row.hold))
    problems.push(
      `${where}: rested on ${landed} at ${row.screens.toFixed(3)} screens, not in this hold`
    )
  }
  if (row.scene !== String(stop.stage)) {
    problems.push(`${where}: scene ${row.scene}, the stop is stage ${stop.stage}`)
  }
  if (stop.stage === 0) {
    if (row.guideStep !== "0" || row.guideShown) {
      problems.push(`${where}: a scene heading is up during the equation`)
    }
    if (row.equationHidden) problems.push(`${where}: the equation is hidden`)
    if (row.pay) problems.push(`${where}: the payoff is up`)
  } else {
    const skin = skins[stop.stage] ?? "none"
    if (row.guideStep !== String(stop.stage)) {
      problems.push(`${where}: guide step ${row.guideStep} over scene ${stop.stage}`)
    }
    if (row.skin !== skin) problems.push(`${where}: skin ${row.skin}, expected ${skin}`)
    const shown = row.blockOpacities.some((block) => block.opacity >= BLOCK_UP)
    if (!shown) problems.push(`${where}: heading over an empty page`)
    if (stop.stage < 3 && row.pay) problems.push(`${where}: the payoff is up before the look`)
    const progress = Number(row.progress)
    // `--t` is the stop's t. 0.002 is the slack of writing it through a CSS variable and reading it back.
    if (!Number.isFinite(progress) || Math.abs(progress - stop.t) > 0.002) {
      problems.push(`${where}: progress ${row.progress}, the stop holds ${stop.t}`)
    }
  }
  if (stop.id === "words") {
    for (const block of row.blockOpacities) {
      if (block.opacity < FULLY_IN) {
        problems.push(`${where}: ${block.block} is half shown (${block.opacity.toFixed(2)})`)
      }
    }
  }
  if (stop.id === "look") {
    if ((row.whoOpacity ?? 0) < FULLY_IN)
      problems.push(`${where}: the name line is not fully there`)
    if ((row.callOpacity ?? 0) < FULLY_IN) problems.push(`${where}: the call is not fully there`)
    row.tileOpacities.forEach((opacity, tile) => {
      if (opacity < FULLY_IN) {
        problems.push(`${where}: tile ${tile + 1} is half shown (${opacity.toFixed(2)})`)
      }
    })
    row.whoWeights.forEach((weight, word) => {
      const settled =
        Math.abs(weight - WEIGHT_REST) < WEIGHT_TOLERANCE ||
        Math.abs(weight - WEIGHT_NAME) < WEIGHT_TOLERANCE
      if (!settled) problems.push(`${where}: word ${word} is mid-wave (${Math.round(weight)})`)
    })
    if (!row.pay || row.payoffOpacity < OPACITY_SHOWN)
      problems.push(`${where}: the payoff is not visible`)
  }
  if (stop.stage === 2) {
    const note = stop.t < 0.2 ? "0" : stop.t < 0.4 ? "1" : stop.t < 0.7 ? "2" : "3"
    if (row.note !== note) problems.push(`${where}: note ${row.note ?? "none"}, expected ${note}`)
  }
  if (stop.id === "tiles" && row.pay) {
    problems.push(`${where}: the payoff is up before the look is finished`)
  }
  return problems
}

export function holdStateProblems(rows: readonly PlacedReading[]): string[] {
  return rows.flatMap((row, index) => describeHold(row, index))
}

/** Tiles still entering at the tiles hold. Recorded, not failed: the stop is that frame. */
export function midTileNotes(rows: readonly PlacedReading[]): string[] {
  const notes: string[] = []
  for (const row of rows) {
    const stop = row.hold >= 0 ? row.placed[row.hold] : undefined
    if (stop?.id !== "tiles") continue
    row.tileOpacities.forEach((opacity, tile) => {
      if (opacity > OPACITY_HIDDEN && opacity < OPACITY_SHOWN) {
        notes.push(
          `tiles: tile ${tile + 1} opacity ${opacity.toFixed(2)} at t=${stop.t} (the hold is this frame)`
        )
      }
    })
  }
  return notes
}

export function formatRestRow(tag: string, row: PlacedReading): string {
  const place = !row.inside
    ? "outside"
    : row.hold < 0
      ? "travel"
      : `hold ${row.hold} ${row.placed[row.hold]?.id ?? "?"}`
  return [
    tag.padEnd(16),
    `y=${String(row.y).padStart(5)}`,
    `${row.screens.toFixed(2)}sc`,
    place.padEnd(18),
    `scene=${row.scene}`,
    `blob=${row.blobStop ?? "—"} ${row.blobTitle}`,
  ].join("  ")
}

export function formatMeasurement(
  title: string,
  lines: readonly string[],
  problems: readonly string[],
  notes: readonly string[] = []
): string {
  const body = [
    `### ${title}`,
    "",
    ...lines,
    "",
    problems.length === 0
      ? "Problems: none"
      : `Problems:\n${problems.map((item) => `- ${item}`).join("\n")}`,
  ]
  if (notes.length > 0) body.push("", `Notes:\n${notes.map((item) => `- ${item}`).join("\n")}`)
  return `${body.join("\n")}\n`
}

/** One file per test. The teardown concatenates them into the job summary. */
export function writeMeasurement(name: string, markdown: string): void {
  mkdirSync(measurementDir, { recursive: true })
  const file = name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180)
  writeFileSync(join(measurementDir, `${file}.md`), markdown)
}

export function measurementDirectory(): string {
  return measurementDir
}

/**
 * Stillness, as rest.mjs polls it: 50ms samples, nine in a row, at most six seconds.
 * Long enough that the idle (170ms) and a glide (at most 900ms) finish before the poll does.
 */
export async function settle(page: Page): Promise<void> {
  const settled = await page.evaluate(async () => {
    let last = -1
    let same = 0
    for (let sample = 0; sample < 120; sample++) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      const y = Math.round(window.scrollY)
      if (y === last) {
        same += 1
        if (same >= 9) return true
      } else {
        same = 0
        last = y
      }
    }
    return false
  })
  if (!settled) throw new Error("scroll did not settle")
}

/** Read the track and the hooks the tour writes. Runs in the page. */
export function readPage(): PageReading {
  const trackEl = document.querySelector(".track")
  const stage = document.querySelector(".stage")
  const message = document.querySelector(".message")
  const guide = document.querySelector(".guide")
  if (
    !(trackEl instanceof HTMLElement) ||
    !(stage instanceof HTMLElement) ||
    !(message instanceof HTMLElement) ||
    !(guide instanceof HTMLElement)
  ) {
    throw new Error("the track is missing")
  }
  const parsed: unknown = JSON.parse(trackEl.dataset.track ?? "null")
  if (typeof parsed !== "object" || parsed === null || !("stops" in parsed)) {
    throw new Error("the track has no stops")
  }
  const rawStops = parsed.stops
  if (!Array.isArray(rawStops)) throw new Error("the track has no stops")
  const stops = rawStops.map((item: unknown) => {
    if (typeof item !== "object" || item === null) throw new Error("a stop is missing")
    const stop = item as Record<string, unknown>
    return {
      id: String(stop.id),
      stage: Number(stop.stage),
      t: Number(stop.t),
      travel: Number(stop.travel),
      hold: Number(stop.hold),
    }
  })
  const screenHeight = stage.offsetHeight
  const origin = trackEl.getBoundingClientRect().top + window.scrollY
  const screens = screenHeight === 0 ? 0 : (window.scrollY - origin) / screenHeight
  const blob = document.querySelector(".ui-blob__stop.is-current")
  const nearest = document.querySelector(".ui-rail__stop.is-nearest")
  const pay = guide.querySelector(".pay")
  const who = message.querySelector("[data-block='who']")
  const call = message.querySelector("[data-block='call']")
  const opacityOf = (element: Element | null) =>
    element ? Number(getComputedStyle(element).opacity) : null
  const weightOf = (element: Element) => {
    const raw = getComputedStyle(element).fontVariationSettings
    const match = /["']?wght["']?\s+([\d.]+)/.exec(raw)
    return match?.[1] ? Number(match[1]) : Number.NaN
  }
  return {
    y: Math.round(window.scrollY),
    screens,
    screenHeight,
    stops,
    scene: stage.dataset.scene ?? "",
    skin: message.dataset.skin ?? "",
    progress: message.style.getPropertyValue("--t").trim(),
    guideStep: guide.dataset.step ?? "",
    guideShown: getComputedStyle(guide).display !== "none",
    pay: guide.hasAttribute("data-pay"),
    payoffOpacity: opacityOf(pay) ?? 0,
    equationHidden: document.querySelector(".equation")?.hasAttribute("data-hidden") ?? false,
    blockOpacities: [...message.querySelectorAll(".blk")].map((element) => ({
      block: element.getAttribute("data-block") ?? "",
      opacity: Number(getComputedStyle(element).opacity),
    })),
    note: message.dataset.note ?? null,
    whoOpacity: opacityOf(who),
    callOpacity: opacityOf(call),
    tileOpacities: [...message.querySelectorAll(".ui-tiles li")].map((element) =>
      Number(getComputedStyle(element).opacity)
    ),
    whoWeights:
      message.dataset.skin === "look"
        ? [...message.querySelectorAll(".who .ui-w")].map((element) => weightOf(element))
        : [],
    blobStop: blob instanceof HTMLElement ? (blob.dataset.stop ?? null) : null,
    blobTitle: blob?.querySelector(".ui-blob__label")?.textContent?.trim() ?? "",
    nearest: nearest instanceof HTMLElement ? (nearest.dataset.index ?? null) : null,
  }
}

async function readPlaced(page: Page): Promise<PlacedReading> {
  return placeReading(await page.evaluate(readPage))
}

/** Wheel ticks of 100px, then a few back. rest.mjs, mode `wheel`. */
export async function driveWheel(
  page: Page
): Promise<{ down: PlacedReading[]; up: PlacedReading[] }> {
  const down: PlacedReading[] = []
  for (let tick = 0; tick < 26; tick++) {
    await page.mouse.wheel(0, WHEEL_TICK_PX)
    await settle(page)
    down.push(await readPlaced(page))
  }
  const up: PlacedReading[] = []
  for (let tick = 0; tick < 5; tick++) {
    await page.mouse.wheel(0, -WHEEL_TICK_PX)
    await settle(page)
    up.push(await readPlaced(page))
  }
  return { down, up }
}

/** Trackpad drags: bursts of 9px wheels at 16ms, three lengths. rest.mjs, mode `trackpad`. */
export async function driveTrackpad(page: Page): Promise<PlacedReading[]> {
  const bursts = [12, 25, 40]
  const rows: PlacedReading[] = []
  for (let drag = 0; drag < 14; drag++) {
    const count = bursts[drag % 3] ?? 12
    for (let step = 0; step < count; step++) {
      await page.mouse.wheel(0, 9)
      await page.waitForTimeout(16)
    }
    await settle(page)
    rows.push(await readPlaced(page))
  }
  return rows
}

/**
 * One finger swipe. `distance` is how far the finger travels, in px: positive moves the
 * page down (the finger goes up). `Input.synthesizeScrollGesture` with `gestureSourceType:
 * "touch"` does not scroll this page: the stage is `overflow: hidden`, and that gesture
 * stops on it. A trail of touch events is a real swipe, which is what rest.mjs was driving.
 */
async function swipe(client: CDPSession, page: Page, distance: number): Promise<void> {
  const viewport = page.viewportSize()
  const height = viewport?.height ?? 664
  const x = Math.round((viewport?.width ?? 390) / 2)
  const margin = 24
  const room = height - margin * 2
  const travel = Math.min(Math.abs(distance), room)
  const startY = distance > 0 ? height - margin : margin
  const endY = distance > 0 ? startY - travel : startY + travel
  const steps = Math.max(6, Math.round(travel / 24))
  const point = (y: number) => [{ x, y: Math.round(y), id: 0 }]
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(startY) })
  for (let step = 1; step <= steps; step++) {
    const y = startY + ((endY - startY) * step) / steps
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(y) })
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
}

/**
 * A glide the engine skips is shorter than 2px (`ALREADY_THERE_PX` in `settle.ts`).
 * Drift above that means the glide is still writing.
 */
export const GLIDE_DRIFT_PX = 2

/** One finger swipe, for a spec that cancels a glide. The trail is {@link swipe}. */
export async function touchSwipe(page: Page, distance: number): Promise<void> {
  const client = await page.context().newCDPSession(page)
  try {
    await swipe(client, page, distance)
  } finally {
    await client.detach()
  }
}

/**
 * A finger down and not yet up. The glide must not write while this is held.
 * Call the returned function to lift it.
 */
export async function holdFinger(page: Page): Promise<() => Promise<void>> {
  const client = await page.context().newCDPSession(page)
  const viewport = page.viewportSize()
  const x = Math.round((viewport?.width ?? 390) / 2)
  const y = Math.round((viewport?.height ?? 664) / 2)
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 0 }],
  })
  return async () => {
    try {
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    } finally {
      await client.detach()
    }
  }
}

/** Touch swipes of 180, 320 and 520px, then three of 260px back. rest.mjs, mode `touch`. */
export async function driveTouch(page: Page): Promise<PlacedReading[]> {
  const client = await page.context().newCDPSession(page)
  const rows: PlacedReading[] = []
  try {
    const forward = [180, 320, 520]
    for (let index = 0; index < 16; index++) {
      await swipe(client, page, forward[index % 3] ?? 180)
      await settle(page)
      rows.push(await readPlaced(page))
    }
    for (let index = 0; index < 3; index++) {
      await swipe(client, page, -260)
      await settle(page)
      rows.push(await readPlaced(page))
    }
  } finally {
    await client.detach()
  }
  return rows
}

/**
 * Keys, only as a way to come to rest. Which key does what is scenario G4, in tour.spec.ts.
 * Fourteen steps on, four back: the prototype's `keys` mode.
 */
export async function driveKeys(page: Page): Promise<PlacedReading[]> {
  const rows: PlacedReading[] = []
  for (let step = 0; step < 14; step++) {
    await page.keyboard.press(step % 4 === 3 ? "Space" : "ArrowDown")
    await settle(page)
    rows.push(await readPlaced(page))
  }
  for (let step = 0; step < 4; step++) {
    await page.keyboard.press("ArrowUp")
    await settle(page)
    rows.push(await readPlaced(page))
  }
  return rows
}

/**
 * Rail clicks. The prototype's selectors were `.dots`; the product is `.ui-rail`.
 * Dots are `display: none` on a phone, so a hidden control is skipped and the chapter
 * ticks (which stay) are clicked instead. What a click does is scenario G5.
 */
export async function driveRail(page: Page): Promise<TaggedRest[]> {
  const targets = [
    { name: "next", selector: '.ui-rail__arrow[data-dir="1"]' },
    { name: "next", selector: '.ui-rail__arrow[data-dir="1"]' },
    { name: "stop 2", selector: '.ui-rail__stop[data-index="2"]' },
    { name: "prev", selector: '.ui-rail__arrow[data-dir="-1"]' },
    { name: "stop 3", selector: '.ui-rail__stop[data-index="3"]' },
    { name: "stop 0", selector: '.ui-rail__stop[data-index="0"]' },
    { name: "stop 8", selector: '.ui-rail__stop[data-index="8"]' },
    { name: "prev", selector: '.ui-rail__arrow[data-dir="-1"]' },
  ]
  const rows: TaggedRest[] = []
  let skipped = false
  for (const target of targets) {
    const button = page.locator(target.selector)
    if (!(await button.isVisible()) || (await button.isDisabled())) {
      skipped = true
      rows.push({ tag: `${target.name} skipped`, row: null })
      continue
    }
    await button.click()
    await settle(page)
    rows.push({ tag: target.name, row: await readPlaced(page) })
  }
  if (!skipped) return rows
  const chapters = page.locator(".ui-rail__stop.is-chapter")
  const count = await chapters.count()
  for (let index = 0; index < count; index++) {
    const chapter = chapters.nth(index)
    const number = (await chapter.getAttribute("data-index")) ?? String(index)
    await chapter.click()
    await settle(page)
    rows.push({ tag: `chapter ${number}`, row: await readPlaced(page) })
  }
  return rows
}

/**
 * One reading per stop, in track order. stops.mjs waited a fixed 2300ms and pasted a JPEG
 * sheet; the settle poll replaces the wait, and the reading replaces the sheet.
 */
export async function visitStops(page: Page): Promise<PlacedReading[]> {
  await settle(page)
  const rows = [await readPlaced(page)]
  const count = rows[0]?.placed.length ?? 0
  for (let index = 1; index < count; index++) {
    await page.keyboard.press("ArrowDown")
    await settle(page)
    // The old guide sentence leaves for 400ms before the next one is the step on show.
    // Reading before that looks like a heading over the wrong scene.
    await page.waitForFunction(() => {
      const guide = document.querySelector(".guide")
      return guide instanceof HTMLElement && !guide.hasAttribute("data-leaving")
    })
    rows.push(await readPlaced(page))
  }
  return rows
}

export async function scrollToCentre(page: Page, stop: PlacedStop): Promise<PlacedReading> {
  const centre = (stop.from + stop.to) / 2
  await page.evaluate((position) => {
    const track = document.querySelector(".track")
    const stage = document.querySelector(".stage")
    if (!(track instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
      throw new Error("the track is missing")
    }
    const origin = track.getBoundingClientRect().top + window.scrollY
    window.scrollTo(0, origin + position * stage.offsetHeight)
  }, centre)
  await settle(page)
  return readPlaced(page)
}

/** Declared stage height, so a toolbar (which moves `dvh`, not `svh`) can be checked without one. */
export function readStageFit(): {
  svh: number
  dvh: number
  vh: number
  stageHeight: number
  declared: string[]
  stage: { top: number; right: number; bottom: number; left: number }
  headline: { top: number; right: number; bottom: number; left: number } | null
  pill: { top: number; right: number; bottom: number; left: number } | null
} {
  const stage = document.querySelector(".stage")
  if (!(stage instanceof HTMLElement)) throw new Error("no stage")
  const probe = document.createElement("div")
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  probe.style.height = "100svh"
  document.body.append(probe)
  const svh = probe.offsetHeight
  probe.style.height = "100dvh"
  const dvh = probe.offsetHeight
  probe.style.height = "100vh"
  const vh = probe.offsetHeight
  probe.remove()
  const declared: string[] = []
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSStyleRule)) continue
      if (!rule.selectorText.includes(".stage") || !rule.style.height) continue
      declared.push(`${rule.selectorText} { height: ${rule.style.height} }`)
    }
  }
  const box = (element: Element | null) => {
    if (!element) return null
    const rect = element.getBoundingClientRect()
    return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }
  }
  const stageBox = stage.getBoundingClientRect()
  return {
    svh,
    dvh,
    vh,
    stageHeight: stage.offsetHeight,
    declared,
    stage: {
      top: stageBox.top,
      right: stageBox.right,
      bottom: stageBox.bottom,
      left: stageBox.left,
    },
    headline: box(document.querySelector(".message .headline")),
    pill: box(document.querySelector(".message a.ui-pill")),
  }
}
