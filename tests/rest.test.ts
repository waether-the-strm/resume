import assert from "node:assert/strict"
import { test } from "node:test"
import {
  describeHold,
  layoutStops,
  midTileNotes,
  placeReading,
  repeatHoldProblems,
  restProblems,
  stayedAtTop,
  type PageReading,
  type PlacedReading,
  type StopDef,
} from "./rest.ts"

// The twelve stops of the prototype at v0.16.0. Lengths are screens.
const prototype: readonly StopDef[] = [
  { id: "start", stage: 0, t: 0, travel: 0, hold: 0.05 },
  { id: "what", stage: 0, t: 0.2, travel: 0.2, hold: 0.12 },
  { id: "why", stage: 0, t: 0.32, travel: 0.13, hold: 0.12 },
  { id: "who", stage: 0, t: 0.45, travel: 0.13, hold: 0.12 },
  { id: "equation", stage: 0, t: 0.59, travel: 0.16, hold: 0.2 },
  { id: "answer", stage: 0, t: 0.78, travel: 0.22, hold: 0.12 },
  { id: "words", stage: 1, t: 1, travel: 0.56, hold: 0.22 },
  { id: "structure", stage: 2, t: 0.12, travel: 0.3, hold: 0.18 },
  { id: "components", stage: 2, t: 0.55, travel: 0.22, hold: 0.14 },
  { id: "tokens", stage: 2, t: 0.78, travel: 0.16, hold: 0.14 },
  { id: "tiles", stage: 3, t: 0.32, travel: 0.4, hold: 0.16 },
  { id: "look", stage: 3, t: 1, travel: 0.52, hold: 0.45 },
]

function reading(over: Partial<PageReading> & Pick<PageReading, "screens">): PlacedReading {
  const base: PageReading = {
    y: 0,
    screens: over.screens,
    screenHeight: 820,
    stops: prototype,
    scene: "0",
    skin: "none",
    progress: "",
    guideStep: "0",
    guideShown: false,
    pay: false,
    payoffOpacity: 0,
    equationHidden: false,
    blockOpacities: [],
    note: null,
    whoOpacity: null,
    callOpacity: null,
    tileOpacities: [],
    whoWeights: [],
    blobStop: "0",
    blobTitle: "the start",
    nearest: "0",
  }
  return placeReading({ ...base, ...over })
}

function at(index: number): PlacedReading {
  const stop = layoutStops(prototype).stops[index]
  assert.ok(stop)
  return reading({
    screens: (stop.from + stop.to) / 2,
    scene: String(stop.stage),
    skin: ["none", "words", "structure", "look"][stop.stage] ?? "none",
    progress: stop.stage === 0 ? "" : stop.t.toFixed(3),
    guideStep: String(stop.stage),
    guideShown: stop.stage > 0,
    blockOpacities: [{ block: "headline", opacity: 1 }],
    note: stop.t < 0.2 ? "0" : stop.t < 0.4 ? "1" : stop.t < 0.7 ? "2" : "3",
    blobStop: String(index),
    nearest: String(index),
  })
}

test("the prototype track is 5.02 screens, and a travel is not a hold", () => {
  const laid = layoutStops(prototype)
  assert.equal(Number(laid.length.toFixed(2)), 5.02)
  const start = laid.stops[0]
  const what = laid.stops[1]
  assert.ok(start)
  assert.ok(what)
  assert.equal(start.to, 0.05)
  assert.equal(what.from, 0.25)
  const between = reading({ screens: (start.to + what.from) / 2 })
  assert.equal(between.inside, true)
  assert.equal(between.hold, -1)
  const card = reading({ screens: laid.length + 0.2 })
  assert.equal(card.inside, false)
})

test("G1: a rest inside the track fails only when it is not in a hold", () => {
  const held = reading({ screens: 0.02, blobStop: "0", nearest: "0" })
  assert.deepEqual(restProblems([held]), [])
  const travel = reading({ screens: 0.15 })
  assert.equal(restProblems([travel]).length, 1)
  const outside = reading({ screens: 6, blobStop: "after", nearest: "11" })
  assert.deepEqual(restProblems([outside]), [])
})

test("G1: inside a hold, the blob and the nearest rail stop are that hold", () => {
  const row = reading({ screens: 0.02, blobStop: "1", nearest: "0" })
  const problems = restProblems([row])
  assert.equal(problems.length, 1)
  assert.match(problems[0] ?? "", /blob shows 1/)
})

test("a gesture that never leaves the top of the page is not a measurement", () => {
  const top = reading({ screens: 0.02, blobStop: "0", nearest: "0" })
  assert.equal(stayedAtTop([top]).length, 1)
  assert.deepEqual(stayedAtTop([top, reading({ screens: 1.2 })]), [])
})

test("G3: staying is allowed only when the hold is wider than the tick", () => {
  const narrow = reading({ screens: 0.02, blobStop: "0", nearest: "0" })
  // 0.05 screens at 820px is 41px, narrower than a 100px tick.
  assert.equal(repeatHoldProblems([narrow, narrow], 100).length, 1)
  const wide = at(11)
  const look = wide.placed[11]
  assert.ok(look)
  assert.ok(look.hold * 820 > 100)
  assert.deepEqual(repeatHoldProblems([wide, wide], 100), [])
})

test("G2: a heading over an empty message fails, and a half-shown word fails", () => {
  const words = at(6)
  words.blockOpacities = [
    { block: "headline", opacity: 0.1 },
    { block: "lead", opacity: 0.4 },
  ]
  const problems = describeHold(words, 6)
  assert.ok(problems.some((problem) => problem.includes("empty page")))
  assert.ok(problems.some((problem) => problem.includes("half shown")))
})

test("G2: the finished look must be fully in, including the payoff", () => {
  const look = at(11)
  look.whoOpacity = 1
  look.callOpacity = 1
  look.tileOpacities = [1, 1, 1]
  look.whoWeights = [800, 400]
  look.pay = false
  const problems = describeHold(look, 11)
  assert.deepEqual(problems, ["11 look: the payoff is not visible"])
})

test("G2: a mid tile at the tiles hold is a note, not a failure", () => {
  const tiles = at(10)
  tiles.tileOpacities = [1, 1, 0.72, 0]
  assert.deepEqual(describeHold(tiles, 10), [])
  assert.deepEqual(midTileNotes([tiles]), [
    "tiles: tile 3 opacity 0.72 at t=0.32 (the hold is this frame)",
  ])
})
