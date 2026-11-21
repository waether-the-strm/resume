import { test } from "node:test"
import assert from "node:assert/strict"
import { defaultStops } from "@strm/narrative"
import { stopNumber } from "./stop-number.ts"

const at = (id: string) => defaultStops.findIndex((stop) => stop.id === id)

test("a stop is numbered by its stage and its place in that stage", () => {
  assert.equal(stopNumber(defaultStops, at("start")), "0.1")
  assert.equal(stopNumber(defaultStops, at("equation")), "0.5")
  assert.equal(stopNumber(defaultStops, at("answer")), "0.6")
  assert.equal(stopNumber(defaultStops, at("words")), "1.1")
  assert.equal(stopNumber(defaultStops, at("structure")), "2.1")
  assert.equal(stopNumber(defaultStops, at("components")), "2.2")
  assert.equal(stopNumber(defaultStops, at("tokens")), "2.3")
  assert.equal(stopNumber(defaultStops, at("tiles")), "3.1")
  assert.equal(stopNumber(defaultStops, at("look")), "3.2")
})

test("the number follows the track order, not the id", () => {
  const swapped = [defaultStops[6]!, defaultStops[0]!]
  assert.equal(stopNumber(swapped, 0), "1.1")
  assert.equal(stopNumber(swapped, 1), "0.1")
})

test("an index outside the track is refused", () => {
  assert.throws(() => stopNumber(defaultStops, -1), /No stop at index -1/)
  assert.throws(() => stopNumber(defaultStops, defaultStops.length), /No stop at index 12/)
})
