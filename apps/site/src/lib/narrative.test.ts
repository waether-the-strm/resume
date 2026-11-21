import { test } from "node:test"
import assert from "node:assert/strict"
import { defaultStops, layout } from "@strm/narrative"
import { nameStops } from "./narrative.ts"

const names = Object.fromEntries(defaultStops.map((stop) => [stop.id, `the ${stop.id}`]))
const rail = { equation: "equation", words: "words", structure: "structure", look: "look" }

test("every stop gets its name, in track order, and chapter stops get a rail label", () => {
  const named = nameStops(defaultStops, { names, rail }, "stops/en")
  assert.deepEqual(
    named.map((stop) => stop.id),
    defaultStops.map((stop) => stop.id)
  )
  assert.equal(named[0]!.name, "the start")
  assert.equal(named[0]!.label, undefined)
  assert.deepEqual(
    named.filter((stop) => stop.label !== undefined).map((stop) => [stop.chapter, stop.label]),
    [
      [0, "equation"],
      [1, "words"],
      [2, "structure"],
      [3, "look"],
    ]
  )
})

test("named stops are still stops: the engine lays them out unchanged", () => {
  const named = nameStops(defaultStops, { names, rail }, "stops/en")
  assert.equal(layout(named).length, layout(defaultStops).length)
})

test("a stop without a name, and a name without a stop, are both refused", () => {
  const { tiles: _dropped, ...missing } = names
  assert.throws(
    () => nameStops(defaultStops, { names: { ...missing, tile: "the tile" }, rail }, "stops/pl"),
    /stops\/pl: no name for "tiles"; a name for "tile", which is not a stop\./
  )
})

test("rail labels belong to the chapter stops, all of them and only them", () => {
  const { look: _dropped, ...short } = rail
  assert.throws(
    () => nameStops(defaultStops, { names, rail: { ...short, tiles: "tiles" } }, "stops/en"),
    /no rail label for "look"; a rail label for "tiles", which is not a chapter stop\./
  )
})
