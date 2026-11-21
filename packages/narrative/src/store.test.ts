import { test } from "node:test"
import assert from "node:assert/strict"
import { createStore } from "./store.ts"
import { defaultStops, layout } from "./stops.ts"
import { parseFrozen } from "./url.ts"

const track = layout(defaultStops)
const stop = (id: string) => {
  const index = track.stops.findIndex((s) => s.id === id)
  return { index, ...track.stops[index]! }
}
const middle = (id: string) => (stop(id).from + stop(id).to) / 2

test("it starts at the first stop", () => {
  const state = createStore(track).get()
  assert.equal(state.mode, "live")
  assert.equal(state.stage, 0)
  assert.equal(state.t, 0)
  assert.equal(state.stop, 0)
  assert.equal(state.nearest, 0)
  assert.equal(state.landed, -1)
  assert.equal(state.after, false)
  assert.equal(state.named, false)
})

test("the position is the only input: everything else follows", () => {
  const store = createStore(track)
  store.setPosition(middle("structure"))
  const state = store.get()
  assert.equal(state.stage, 2)
  assert.equal(state.stop, stop("structure").index)
  assert.equal(state.nearest, stop("structure").index)
})

test("in a travel there is no stop, but there is a nearest one", () => {
  const store = createStore(track)
  const a = stop("words")
  const b = stop("structure")
  store.setPosition(a.to + (b.from - a.to) * 0.25)
  assert.equal(store.get().stop, -1)
  assert.equal(store.get().nearest, a.index)
  store.setPosition(a.to + (b.from - a.to) * 0.75)
  assert.equal(store.get().nearest, b.index)
})

test("landing needs a hold, and is lost on leaving it", () => {
  const store = createStore(track)
  const a = stop("words")
  store.setPosition(a.to + 0.1)
  store.land()
  assert.equal(store.get().landed, -1, "no landing in a travel")
  store.setPosition(middle("words"))
  store.land()
  assert.equal(store.get().landed, a.index)
  store.setPosition(middle("words") + 0.01)
  assert.equal(store.get().landed, a.index, "still inside the same hold")
  store.setPosition(a.to + 0.1)
  assert.equal(store.get().landed, -1)
})

test("named only with the finished look", () => {
  const store = createStore(track)
  store.setPosition(middle("tiles"))
  assert.equal(store.get().named, false)
  store.setPosition(middle("look"))
  assert.equal(store.get().named, true)
})

test("after: once the track is most of the way out", () => {
  const store = createStore(track)
  store.setPosition(track.length + 0.4)
  assert.equal(store.get().after, false)
  assert.equal(store.get().stage, 3, "the look holds until the track ends")
  store.setPosition(track.length + 0.5)
  assert.equal(store.get().after, true)
  assert.equal(store.get().position, track.length + 0.5, "the position is not clamped")
})

test("subscribers hear changes, once each, and can stop listening", () => {
  const store = createStore(track)
  const seen: number[] = []
  const stopListening = store.subscribe((state, previous) => {
    assert.notEqual(state, previous)
    seen.push(state.position)
  })
  store.setPosition(0.3)
  store.setPosition(0.3)
  store.setPosition(0.4)
  stopListening()
  store.setPosition(0.5)
  assert.deepEqual(seen, [0.3, 0.4])
})

test("a frozen moment sets the state the URL names", () => {
  const store = createStore(track)
  store.freeze(parseFrozen("?stage=2&t=0.5"))
  const state = store.get()
  assert.equal(state.mode, "moment")
  assert.equal(state.stage, 2)
  assert.equal(state.t, 0.5)
  assert.equal(state.nearest, stop("structure").index)
  assert.equal(state.stop, -1, "between two stops")
  assert.equal(state.after, false)
})

test("a frozen moment that is exactly a stop is that stop", () => {
  const store = createStore(track)
  store.freeze(parseFrozen("?stage=3&t=1"))
  assert.equal(store.get().stop, stop("look").index)
  assert.equal(store.get().named, true)
})

test("frozen states ignore scrolling", () => {
  const store = createStore(track)
  store.freeze(parseFrozen("?stage=1&t=0.3"))
  store.setPosition(4)
  assert.equal(store.get().stage, 1)
  assert.equal(store.get().t, 0.3)
})

test("?stage=jan is the card alone", () => {
  const store = createStore(track)
  store.freeze(parseFrozen("?stage=jan"))
  const state = store.get()
  assert.equal(state.mode, "card")
  assert.equal(state.after, true)
  assert.equal(state.named, true)
  assert.equal(state.nearest, track.stops.length - 1)
})

test("the URL contract: defaults, clamping and nonsense", () => {
  assert.deepEqual(parseFrozen(""), { kind: "live" })
  assert.deepEqual(parseFrozen("?stage=2"), { kind: "moment", stage: 2, t: 1 })
  assert.deepEqual(parseFrozen("?stage=0&t=0.13"), { kind: "moment", stage: 0, t: 0.13 })
  assert.deepEqual(parseFrozen("?stage=3&t=7"), { kind: "moment", stage: 3, t: 1 })
  assert.deepEqual(parseFrozen("?stage=9"), { kind: "live" })
  assert.deepEqual(parseFrozen("?stage=1&t=abc"), { kind: "live" })
})
