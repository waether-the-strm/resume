import { test } from "node:test"
import assert from "node:assert/strict"
import {
  BLOB_LEAVE_MS,
  BLOB_STAY_MS,
  blobView,
  createBlobFold,
  nextTheme,
  type BlobClock,
} from "./blob.ts"

function fakeClock(): BlobClock & { fire(): void; ms(): number | null } {
  let queued: { callback: () => void; ms: number } | null = null
  return {
    setTimeout(callback, ms) {
      queued = { callback, ms }
      return 1
    },
    clearTimeout() {
      queued = null
    },
    fire() {
      const pending = queued
      queued = null
      pending?.callback()
    },
    ms: () => queued?.ms ?? null,
  }
}

test("the title is the nearest stop, and the name folds away with the finished look", () => {
  assert.deepEqual(blobView({ nearest: 9, named: false, after: false }), {
    current: 9,
    slim: false,
  })
  assert.deepEqual(blobView({ nearest: 11, named: true, after: false }), {
    current: 11,
    slim: true,
  })
})

test("once the tour is behind the reader the title is after, and the name stays folded", () => {
  assert.deepEqual(blobView({ nearest: 11, named: false, after: true }), {
    current: "after",
    slim: true,
  })
})

test("the blob stays open 4.5 s, then folds", () => {
  assert.equal(BLOB_STAY_MS, 4500)
  const clock = fakeClock()
  const fold = createBlobFold(clock, () => {})
  fold.toggle()
  assert.equal(fold.isOpen(), true)
  assert.equal(clock.ms(), 4500)
  clock.fire()
  assert.equal(fold.isOpen(), false)
  assert.equal(clock.ms(), null)
})

test("a press inside restarts the stay; a press outside folds it", () => {
  const clock = fakeClock()
  const fold = createBlobFold(clock, () => {})
  fold.toggle()
  clock.fire()
  assert.equal(fold.isOpen(), false)
  fold.toggle()
  fold.poke()
  assert.equal(clock.ms(), 4500)
  fold.outside()
  assert.equal(fold.isOpen(), false)
  assert.equal(clock.ms(), null)
})

test("scrolling on folds it, unless the pointer is resting on it", () => {
  const clock = fakeClock()
  const fold = createBlobFold(clock, () => {})
  fold.toggle()
  fold.scroll()
  assert.equal(fold.isOpen(), false)
  fold.enter()
  fold.scroll()
  assert.equal(fold.isOpen(), true)
})

test("under a mouse it stays while the pointer rests, and folds 700 ms after leaving", () => {
  assert.equal(BLOB_LEAVE_MS, 700)
  const clock = fakeClock()
  const fold = createBlobFold(clock, () => {})
  fold.enter()
  assert.equal(fold.isOpen(), true)
  clock.fire()
  assert.equal(fold.isOpen(), true)
  assert.equal(clock.ms(), 4500)
  fold.leave()
  assert.equal(clock.ms(), 700)
  assert.equal(fold.isOpen(), true)
  clock.fire()
  assert.equal(fold.isOpen(), false)
})

test("coming back before the pause cancels the fold", () => {
  const clock = fakeClock()
  const fold = createBlobFold(clock, () => {})
  fold.enter()
  fold.leave()
  fold.enter()
  assert.equal(clock.ms(), 4500)
  assert.equal(fold.isOpen(), true)
})

test("on a coarse pointer the first press on the name only unfolds", () => {
  const clock = fakeClock()
  const fold = createBlobFold(clock, () => {})
  assert.equal(fold.namePressed(true), false)
  assert.equal(fold.isOpen(), true)
  assert.equal(fold.namePressed(true), true)
  assert.equal(fold.isOpen(), false)
})

test("with a fine pointer the name goes to the card at once", () => {
  const fold = createBlobFold(fakeClock(), () => {})
  assert.equal(fold.namePressed(false), true)
  assert.equal(fold.isOpen(), false)
  fold.toggle()
  assert.equal(fold.namePressed(false), true)
  assert.equal(fold.isOpen(), false)
})

test("closing reports the change once", () => {
  const clock = fakeClock()
  const changes: boolean[] = []
  const fold = createBlobFold(clock, (open) => changes.push(open))
  fold.toggle()
  fold.close()
  fold.close()
  assert.deepEqual(changes, [true, false])
})

test("the theme steps from the system's to light, to dark, and back", () => {
  assert.equal(nextTheme(null), "light")
  assert.equal(nextTheme("light"), "dark")
  assert.equal(nextTheme("dark"), null)
})

test("a press on the title under a resting mouse does not fold what the mouse opened", () => {
  const clock = fakeClock()
  const fold = createBlobFold(clock, () => {})
  fold.enter()
  fold.toggle()
  assert.equal(fold.isOpen(), true)
  assert.equal(clock.ms(), 4500)
  fold.leave()
  clock.fire()
  assert.equal(fold.isOpen(), false)
  // Without a mouse over it (a tap, a key) the title still toggles.
  fold.toggle()
  assert.equal(fold.isOpen(), true)
  fold.toggle()
  assert.equal(fold.isOpen(), false)
})
