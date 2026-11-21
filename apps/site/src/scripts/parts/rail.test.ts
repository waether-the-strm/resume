import { test } from "node:test"
import assert from "node:assert/strict"
import { defaultStops, layout } from "@strm/narrative"
import { landingChange, railFrame } from "./rail.ts"

const track = layout(defaultStops)
const at = (id: string) => track.stops.findIndex((stop) => stop.id === id)

const sample = {
  stage: 2 as const,
  nearest: at("tokens"),
  landed: -1,
  position: 3.4,
  after: false,
}

test("G11: the chapter is the stage, and the nearest stop is marked on its own", () => {
  const frame = railFrame(track.stops, sample, track.length, true)
  assert.equal(track.stops[frame.current]!.id, "structure")
  assert.equal(frame.nearest, at("tokens"))
  assert.equal(frame.landed, -1)
  assert.equal(frame.prevOff, false)
  assert.equal(frame.nextOff, false)
  assert.equal(frame.after, false)
})

test("the arrows are off at the ends, and off entirely when the moment is frozen", () => {
  const atStart = railFrame(track.stops, { ...sample, position: 0 }, track.length, true)
  assert.equal(atStart.prevOff, true)
  assert.equal(atStart.nextOff, false)

  const past = railFrame(
    track.stops,
    { ...sample, position: track.length + 0.03, after: true },
    track.length,
    true
  )
  assert.equal(past.prevOff, false)
  assert.equal(past.nextOff, true)
  assert.equal(past.after, true)

  const frozen = railFrame(track.stops, sample, track.length, false)
  assert.equal(frozen.prevOff, true)
  assert.equal(frozen.nextOff, true)
})

test("G5: the landing cue restarts only when the landed stop changes", () => {
  assert.deepEqual(landingChange(-1, -1), { clear: false, restart: -1 })
  assert.deepEqual(landingChange(4, -1), { clear: true, restart: 4 })
  assert.deepEqual(landingChange(4, 4), { clear: false, restart: -1 })
  assert.deepEqual(landingChange(6, 4), { clear: true, restart: 6 })
  assert.deepEqual(landingChange(-1, 4), { clear: true, restart: -1 })
})
