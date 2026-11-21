import { test } from "node:test"
import assert from "node:assert/strict"
import { oracle } from "./fixtures/prototype-v016.ts"
import { holdAt, nearest, place, reached, stopFor } from "./map.ts"
import { defaultStops, layout, type Stage } from "./stops.ts"

const track = layout(defaultStops)
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6

test("the track is as long as the prototype's, with the same holds", () => {
  assert.ok(close(track.length, oracle.length))
  track.stops.forEach((stop, index) => {
    const [from, to] = oracle.bounds[index]!
    assert.ok(close(stop.from, from) && close(stop.to, to), `stop ${stop.id}`)
  })
})

test("every sampled position maps as the prototype maps it", () => {
  for (const [position, stage, t, hold, reach, near] of oracle.rows) {
    const at = place(track, position)
    assert.equal(at.stage, stage, `stage at ${position}`)
    assert.ok(close(at.t, t), `t at ${position}: ${at.t} vs ${t}`)
    assert.equal(holdAt(track, position), hold, `holdAt ${position}`)
    assert.equal(reached(track, position), reach, `reached ${position}`)
    assert.equal(nearest(track, position), near, `nearest ${position}`)
  }
})

test("a frozen state resolves to the stop the prototype picks", () => {
  for (const [stage, t, stop] of oracle.frozen) {
    assert.equal(stopFor(track, stage as Stage, t), stop, `stage ${stage} t ${t}`)
  }
})

test("inside a hold nothing changes: the stop's own state at both edges and the middle", () => {
  track.stops.forEach((stop, index) => {
    for (const position of [stop.from, (stop.from + stop.to) / 2, stop.to]) {
      assert.deepEqual(place(track, position), { stage: stop.stage, t: stop.t })
      assert.equal(holdAt(track, position), index)
    }
  })
})

test("every seam between scenes lies inside a travel", () => {
  for (let index = 1; index < track.stops.length; index++) {
    const prev = track.stops[index - 1]!
    const next = track.stops[index]!
    if (prev.stage === next.stage) continue
    assert.ok(next.travel > 0)
    assert.equal(holdAt(track, (prev.to + next.from) / 2), -1)
  }
})

test("the story never runs backwards as the position grows", () => {
  let last = -1
  for (let position = 0; position <= track.length; position += 0.005) {
    const { stage, t } = place(track, position)
    const order = stage + t / 2
    assert.ok(order >= last - 1e-9, `went back at ${position}`)
    last = order
  }
})

test("positions outside the track clamp to its ends", () => {
  assert.deepEqual(place(track, -1), { stage: 0, t: 0 })
  assert.deepEqual(place(track, track.length + 3), { stage: 3, t: 1 })
  assert.equal(nearest(track, track.length + 3), track.stops.length - 1)
})

test("the table is data: another table gives another track", () => {
  const short = layout([
    { id: "a", stage: 0, t: 0, travel: 0, hold: 0.1 },
    { id: "b", stage: 0, t: 1, travel: 0.4, hold: 0.2 },
  ])
  assert.ok(close(short.length, 0.7))
  assert.ok(close(place(short, 0.3).t, 0.5))
})
