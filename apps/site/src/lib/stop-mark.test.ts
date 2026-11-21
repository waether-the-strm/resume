import { test } from "node:test"
import assert from "node:assert/strict"
import { defaultStops } from "@strm/narrative"
import { stopMark } from "./stop-mark.ts"

const mark = (id: string) =>
  stopMark(
    defaultStops,
    defaultStops.findIndex((stop) => stop.id === id)
  )

test("the marks of the twelve stops are the table of ADR 0011", () => {
  assert.deepEqual(
    defaultStops.map((stop) => [stop.id, mark(stop.id)]),
    [
      ["start", "0"],
      ["what", "+"],
      ["why", "+"],
      ["who", "+"],
      ["equation", "="],
      ["answer", "="],
      ["words", "1"],
      ["structure", "2.1"],
      ["components", "2.2"],
      ["tokens", "2.3"],
      ["tiles", "3.1"],
      ["look", "3.2"],
    ]
  )
})

test("the question has no number: only the scenes of the answer are counted", () => {
  const marks = defaultStops.filter((stop) => stop.stage === 0).map((stop) => mark(stop.id))
  assert.equal(
    marks.some((value) => /[1-9]/.test(value)),
    false
  )
})

test("a scene with one stop is its number alone; with several, the place follows", () => {
  const track = [{ stage: 0 }, { stage: 1, chapter: 1 }, { stage: 2, chapter: 2 }, { stage: 2 }]
  assert.deepEqual(
    track.map((_, index) => stopMark(track, index)),
    ["0", "1", "2.1", "2.2"]
  )
})

test("scene 0 without a chapter stop is the start and its terms", () => {
  const track = [{ stage: 0 }, { stage: 0 }, { stage: 0 }]
  assert.deepEqual(
    track.map((_, index) => stopMark(track, index)),
    ["0", "+", "+"]
  )
})

test("an index outside the track is refused", () => {
  assert.throws(() => stopMark(defaultStops, -1), /No stop at index -1/)
  assert.throws(() => stopMark(defaultStops, defaultStops.length), /No stop at index 12/)
})
