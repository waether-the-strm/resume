import { test } from "node:test"
import assert from "node:assert/strict"
import { createSettle, type Clock, type Scroller, type Settle } from "./settle.ts"
import { createStore, type Store } from "./store.ts"
import { defaultStops, layout, type Track } from "./stops.ts"

/** CSS pixels. 1 px is 0.001 screens, and these thresholds round-trip exactly. */
const HEIGHT = 1000

/**
 * Two travels with binary-friendly edges. `b`'s travel is 2 screens and starts at 1, so
 * `f = 0.12` is the position 1.24 exactly (`(1.24 - 1) / 2 === 0.12`).
 * a 0–1, b 3–4, c 4.5–5. Centres 0.5, 3.5, 4.75. The card defaults to length + 1 = 6.
 */
const simple = layout([
  { id: "a", stage: 0, t: 0, travel: 0, hold: 1 },
  { id: "b", stage: 0, t: 0.5, travel: 2, hold: 1 },
  { id: "c", stage: 0, t: 1, travel: 0.5, hold: 0.5 },
])

interface Harness {
  track: Track
  store: Store
  settle: Settle
  writes: number[]
  frames: number
  position: number
  advance(ms: number): void
  flush(): void
}

function setup(options?: {
  track?: Track
  position?: number
  motion?: boolean
  cardAt?: number
  height?: number
  onWrite?: () => void
  /** What the page keeps of a write. A browser keeps whole pixels. */
  keep?: (written: number) => number
}): Harness {
  const track = options?.track ?? simple
  const store = createStore(track)
  let position = options?.position ?? 0
  const writes: number[] = []
  let frames = 0
  let time = 0
  let seq = 1
  const timers = new Map<number, { at: number; fn: () => void }>()
  const queue: { id: number; fn: (now: number) => void }[] = []

  const scroller: Scroller = {
    read: () => position,
    write(next) {
      position = options?.keep ? options.keep(next) : next
      writes.push(next)
      options?.onWrite?.()
    },
  }
  const clock: Clock = {
    now: () => time,
    setTimeout(fn, ms) {
      const id = seq++
      timers.set(id, { at: time + ms, fn })
      return id
    },
    clearTimeout(id) {
      timers.delete(id as number)
    },
    requestFrame(fn) {
      const id = seq++
      frames += 1
      queue.push({ id, fn })
      return id
    },
    cancelFrame(id) {
      const index = queue.findIndex((entry) => entry.id === id)
      if (index >= 0) queue.splice(index, 1)
    },
  }
  const settle = createSettle({
    track,
    store,
    scroller,
    clock,
    motionAllowed: () => options?.motion !== false,
    screenHeight: () => options?.height ?? HEIGHT,
    ...(options?.cardAt !== undefined ? { cardAt: () => options.cardAt as number } : {}),
  })

  return {
    track,
    store,
    settle,
    writes,
    get frames() {
      return frames
    },
    get position() {
      return position
    },
    set position(next: number) {
      position = next
    },
    advance(ms) {
      const target = time + ms
      for (;;) {
        const next = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
        if (!next) break
        timers.delete(next[0])
        time = next[1].at
        next[1].fn()
      }
      time = target
    },
    flush() {
      const batch = queue.splice(0, queue.length)
      for (const entry of batch) entry.fn(time)
    },
  }
}

/** Idle, then enough time for the longest glide, then one frame. `k` is already 1. */
function restAndFinish(h: Harness): void {
  h.advance(170)
  h.advance(900)
  h.flush()
}

const centre = (track: Track, index: number) => {
  const stop = track.stops[index]!
  return (stop.from + stop.to) / 2
}

test("idle in a travel glides to the centre of the hold ahead", () => {
  const h = setup({ position: 1.5 })
  h.position = 2
  h.settle.scroll()
  h.advance(169)
  h.flush()
  assert.equal(h.writes.length, 0, "169 ms is not idle yet")
  restAndFinish(h)
  assert.equal(h.position, 3.5)
  assert.equal(h.store.get().landed, 1)
})

test("the same glide on the prototype's stops, from words toward structure", () => {
  const track = layout(defaultStops)
  const words = track.stops.findIndex((stop) => stop.id === "words")
  const structure = track.stops[words + 1]!
  const at = track.stops[words]!.to + structure.travel * 0.5
  const h = setup({ track, position: at - 0.1 })
  h.position = at
  h.settle.scroll()
  restAndFinish(h)
  assert.equal(h.position, (structure.from + structure.to) / 2)
  assert.equal(h.store.get().landed, words + 1)
})

test("12% of the travel returns or continues, depending on direction", () => {
  // f is the share of b's travel. The downward test is `f > 0.12`, so 0.12 itself returns.
  // Upward, returning to b is `f >= 0.88`. 0.87 stays under that; 0.9 is over it.
  const cases: { dir: 1 | -1; f: number; position: number; lands: number; stop: number }[] = [
    { dir: 1, f: 0.05, position: 1.1, lands: 1 - 0.025, stop: 0 },
    { dir: 1, f: 0.12, position: 1.24, lands: 1 - 0.025, stop: 0 },
    { dir: 1, f: 0.13, position: 1.26, lands: 3.5, stop: 1 },
    { dir: 1, f: 0.5, position: 2, lands: 3.5, stop: 1 },
    { dir: -1, f: 0.5, position: 2, lands: 0.5, stop: 0 },
    { dir: -1, f: 0.87, position: 2.74, lands: 0.5, stop: 0 },
    { dir: -1, f: 0.9, position: 2.8, lands: 3 + 0.025, stop: 1 },
    { dir: -1, f: 0.95, position: 2.9, lands: 3 + 0.025, stop: 1 },
  ]
  for (const row of cases) {
    const h = setup({ position: row.dir > 0 ? row.position - 0.5 : row.position + 0.5 })
    h.position = row.position
    h.settle.scroll()
    restAndFinish(h)
    assert.equal(h.position, row.lands, `f ${row.f} dir ${row.dir}`)
    assert.equal(h.store.get().landed, row.stop, `landed f ${row.f} dir ${row.dir}`)
  }
})

test("idle inside a hold lands there and writes nothing", () => {
  const h = setup({ position: 0.5 })
  h.settle.scroll()
  restAndFinish(h)
  assert.deepEqual(h.writes, [])
  assert.equal(h.store.get().landed, 0)
})

test("the exact top and the exact end of the track do not settle", () => {
  for (const position of [0, simple.length]) {
    const h = setup({ position })
    h.settle.scroll()
    restAndFinish(h)
    assert.deepEqual(h.writes, [], `writes at ${position}`)
    assert.equal(h.store.get().landed, -1, `landed at ${position}`)
  }
})

test("a glide's duration is min(900, 260 + screens * 700)", () => {
  // 1.25 → 0.5 is 0.75 screens: 260 + 525 = 785, under the cap.
  const h = setup({ position: 1.25 })
  h.settle.goTo(0)
  h.flush()
  h.advance(784)
  h.flush()
  assert.notEqual(h.position, 0.5)
  h.advance(1)
  h.flush()
  assert.equal(h.position, 0.5)
  assert.equal(h.store.get().landed, 0)

  // 0.5 → 3.5 is 3 screens: 260 + 2100 = 2360, which the cap cuts to 900.
  const capped = setup({ position: 0.5 })
  capped.settle.goTo(1)
  capped.flush()
  capped.advance(899)
  capped.flush()
  assert.notEqual(capped.position, 3.5)
  capped.advance(1)
  capped.flush()
  assert.equal(capped.position, 3.5)
})

test("half way through a glide is the cubic ease-out, and stopping there does not land", () => {
  // 0.5 → 3.5 is 3 screens, so the duration is the 900 ms cap.
  // At half the duration, k = 0.5 and 1 - (1 - 0.5) ** 3 = 7/8 of the distance.
  const h = setup({ position: 0.5 })
  h.settle.goTo(1)
  h.flush()
  h.advance(450)
  h.flush()
  assert.equal(h.position, 0.5 + 3 * 0.875)
  assert.equal(h.store.get().landed, -1)
  const writes = h.writes.length
  h.settle.wheel()
  h.flush()
  h.advance(169)
  h.flush()
  assert.equal(h.writes.length, writes, "the cancelled glide writes nothing more")
  assert.equal(h.position, 0.5 + 3 * 0.875)
  assert.equal(h.store.get().landed, -1)
})

test("each cancel path stops the glide", () => {
  function running(): Harness {
    const h = setup({ position: 0.5 })
    h.settle.goTo(1)
    h.flush()
    return h
  }

  // A glide that has not left the travel. Wheel and a lifted finger arm the idle again,
  // so the settle then runs from where the cancel happened. Pointer and keys do not.
  const byWheel = setup({ position: 2 })
  byWheel.settle.goTo(1)
  byWheel.flush()
  byWheel.settle.wheel()
  byWheel.flush()
  byWheel.advance(169)
  byWheel.flush()
  assert.equal(byWheel.position, 2)
  byWheel.advance(1)
  byWheel.advance(900)
  byWheel.flush()
  assert.equal(byWheel.position, 3.5, "wheel re-arms, and the idle then settles onward")

  const byPointer = running()
  byPointer.settle.pointerDown()
  byPointer.advance(1200)
  byPointer.flush()
  assert.equal(byPointer.position, 0.5)
  assert.equal(byPointer.store.get().landed, -1)

  const byKey = running()
  byKey.settle.cancel()
  byKey.advance(1200)
  byKey.flush()
  assert.equal(byKey.position, 0.5)
  assert.equal(byKey.store.get().landed, -1)

  const byTouch = setup({ position: 2 })
  byTouch.settle.goTo(1)
  byTouch.flush()
  byTouch.settle.touchStart()
  byTouch.advance(1200)
  byTouch.flush()
  assert.equal(byTouch.position, 2, "a finger down writes nothing")
  byTouch.settle.touchEnd()
  byTouch.advance(170)
  byTouch.advance(900)
  byTouch.flush()
  assert.equal(byTouch.position, 3.5, "lifting the finger arms the idle")
})

test("a scroll that arrives while a finger is down never writes", () => {
  const h = setup({ position: 1.5 })
  h.settle.touchStart()
  h.position = 2
  h.settle.scroll()
  h.advance(500)
  h.flush()
  assert.deepEqual(h.writes, [])
  assert.equal(h.store.get().landed, -1)
})

test("a drift of 3 px is pulled back; more than 3 px cancels the glide", () => {
  // Origin 0 keeps `px / 1000 * 1000` exact. 3 px must not cancel (`>` , not `>=`).
  const within = setup({ position: 0 })
  within.settle.goTo(1)
  within.position = 3 / HEIGHT
  within.flush()
  assert.equal(within.position, 0, "3 px is still the glide's write")

  const taken = setup({ position: 0 })
  taken.settle.goTo(1)
  taken.position = 4 / HEIGHT
  taken.flush()
  assert.equal(taken.position, 4 / HEIGHT)
  taken.advance(900)
  taken.flush()
  assert.equal(taken.position, 4 / HEIGHT, "a cancelled glide does not resume")
  // Not the prototype: the move that cancelled the glide is settled like any other scroll.
  // Here it left the reader inside the first hold, so the page lands there and writes nothing.
  assert.equal(taken.store.get().landed, 0)
  assert.deepEqual(taken.writes, [])
})

test("a move that takes the page from a glide is settled: it does not strand the reader in a travel", () => {
  // From the first hold, glide to the second stop (centre 3.5). One frame in, something else
  // puts the page at 2.0, the middle of the travel between the two holds (1 to 3).
  const h = setup({ position: 0.5 })
  h.settle.goTo(1)
  h.advance(100)
  h.flush()
  const written = h.writes.length
  assert.ok(written > 0, "the glide has started")

  h.position = 2.0
  // The adapter hears that scroll while the glide is still running: both are ignored.
  h.settle.scroll()
  h.settle.scrollEnd()
  h.flush()
  assert.equal(h.position, 2.0, "the glide gave way and did not write over the move")
  assert.equal(h.writes.length, written)

  // Idle, then the page settles forward from where it was put, as after any scroll.
  restAndFinish(h)
  assert.equal(h.position, centre(h.track, 1))
  assert.equal(h.store.get().landed, 1)
})

test("a move against the glide settles the other way", () => {
  // Gliding forward to the second stop; the page is pulled back to 1.1, just past the first
  // hold. Moving back, 5% into the travel is within the returning fraction: back to the hold.
  const h = setup({ position: 1.6 })
  h.settle.goTo(1)
  h.advance(100)
  h.flush()
  h.position = 1.1
  h.flush()
  restAndFinish(h)
  assert.equal(h.store.get().landed, 0)
  assert.ok(h.position <= 1, "back inside the first hold")
})

test("with motion off, a glide is a single write", () => {
  const h = setup({ position: 0.5, motion: false })
  h.settle.goTo(1)
  h.flush()
  h.advance(900)
  assert.deepEqual(h.writes, [3.5])
  assert.equal(h.frames, 0)
  assert.equal(h.store.get().landed, 1)
})

test("step at both ends", () => {
  const start = setup({ position: 0.5 })
  assert.equal(start.settle.step(-1), false)
  assert.deepEqual(start.writes, [])

  const end = setup({ position: 4.75 })
  assert.equal(end.settle.step(1), true)
  end.advance(900)
  end.flush()
  assert.equal(end.position, simple.length + 1, "the next stop after the last is the card")
  assert.equal(end.store.get().landed, -1)

  const card = setup({ position: simple.length + 1 })
  assert.equal(card.settle.step(1), false)
  assert.equal(card.settle.step(-1), true)
  card.advance(900)
  card.flush()
  assert.equal(card.position, 4.75)

  const past = setup({ position: simple.length + 1 + 8 / HEIGHT + 1 / HEIGHT })
  assert.equal(past.settle.step(1), false)
  assert.equal(past.settle.step(-1), false)
  assert.deepEqual(past.writes, [])
})

test("step from a travel goes to the stop ahead or the one just left", () => {
  const forward = setup({ position: 2 })
  assert.equal(forward.settle.step(1), true)
  forward.advance(900)
  forward.flush()
  assert.equal(forward.position, 3.5)

  const back = setup({ position: 2 })
  assert.equal(back.settle.step(-1), true)
  back.advance(900)
  back.flush()
  assert.equal(back.position, 0.5)
})

test("step during a glide follows the glide's target, not the hold underneath", () => {
  // The first frame is still on `a`. The glide is aimed at `b`, so step(+1) goes to `c`.
  // Reading the hold instead would have stepped from `a` to `b`.
  const h = setup({ position: 0.5 })
  h.settle.goTo(1)
  h.flush()
  assert.equal(h.position, 0.5)
  assert.equal(h.settle.step(1), true)
  h.advance(900)
  h.flush()
  assert.equal(h.position, 4.75)
  assert.equal(h.store.get().landed, 2)
})

test("step returning false does not cancel a glide", () => {
  const h = setup({ position: 3.5 })
  h.settle.goTo(0)
  h.flush()
  assert.equal(h.settle.step(-1), false)
  h.advance(900)
  h.flush()
  assert.equal(h.position, 0.5)
  assert.equal(h.store.get().landed, 0)
})

test("scrollend settles after 40 ms, and another scroll starts the 170 ms again", () => {
  const ended = setup({ position: 1.5 })
  ended.position = 2
  ended.settle.scroll()
  ended.advance(20)
  ended.settle.scrollEnd()
  ended.advance(39)
  ended.flush()
  assert.equal(ended.writes.length, 0)
  ended.advance(1)
  ended.advance(900)
  ended.flush()
  assert.equal(ended.position, 3.5)

  const again = setup({ position: 1.5 })
  again.position = 2
  again.settle.scroll()
  again.advance(100)
  again.position = 2.1
  again.settle.scroll()
  again.advance(169)
  again.flush()
  assert.equal(again.writes.length, 0)
  again.advance(1)
  again.advance(900)
  again.flush()
  assert.equal(again.position, 3.5)
})

test("under 2 px the glide is skipped; 2 px still glides", () => {
  const close = setup({ position: 0.5 + 1 / HEIGHT })
  close.settle.goTo(0)
  close.flush()
  assert.deepEqual(close.writes, [])
  assert.equal(close.store.get().landed, 0)

  const two = setup({ position: 0.5 + 2 / HEIGHT })
  two.settle.goTo(0)
  assert.equal(two.frames, 1)
})

test("goTo glides to that stop, and an unknown index does nothing", () => {
  const h = setup({ position: 0.5 })
  h.settle.goTo(2)
  h.advance(900)
  h.flush()
  assert.equal(h.position, centre(simple, 2))
  assert.equal(h.store.get().landed, 2)
  const writes = h.writes.length
  h.settle.goTo(-1)
  h.settle.goTo(9)
  h.flush()
  assert.equal(h.writes.length, writes)
})

test("the card position can be injected", () => {
  const h = setup({ position: 4.75, cardAt: 8 })
  assert.equal(h.settle.step(1), true)
  h.advance(900)
  h.flush()
  assert.equal(h.position, 8)
})

test("a write that cancels the glide does not schedule the next frame", () => {
  let settle: Settle | undefined
  const h = setup({
    position: 0.5,
    onWrite: () => settle?.cancel(),
  })
  settle = h.settle
  h.settle.goTo(1)
  h.flush()
  h.advance(900)
  h.flush()
  assert.equal(h.position, 0.5)
  assert.equal(h.store.get().landed, -1)
})

test("dispose drops a pending settle and a running glide", () => {
  const pending = setup({ position: 2 })
  pending.settle.scroll()
  pending.settle.dispose()
  pending.advance(1200)
  pending.flush()
  assert.deepEqual(pending.writes, [])

  const gliding = setup({ position: 0.5 })
  gliding.settle.goTo(1)
  gliding.settle.dispose()
  gliding.advance(900)
  gliding.flush()
  assert.deepEqual(gliding.writes, [])
})

test("the store is told what the page kept of a write, never the fraction that was written", () => {
  // The page keeps whole pixels. A glide writes fractions of one.
  const pixel = 1 / HEIGHT
  const h = setup({ position: 0.5, keep: (written) => Math.round(written / pixel) * pixel })
  const told: number[] = []
  h.store.subscribe((state) => told.push(state.position))
  h.settle.goTo(1)
  // A frame every 16 ms until the glide is done: each one writes a fraction of a pixel.
  for (let frame = 0; frame < 60; frame++) {
    h.flush()
    h.advance(16)
  }
  h.flush()
  assert.ok(told.length > 10, "the glide told the store of its frames")
  assert.ok(
    h.writes.some((written) => Math.abs(written / pixel - Math.round(written / pixel)) > 0.01),
    "the glide did write fractions of a pixel"
  )
  for (const position of told) {
    const pixels = position / pixel
    assert.ok(
      Math.abs(pixels - Math.round(pixels)) < 1e-6,
      `${position} is not a whole pixel: the store saw a position the page never held`
    )
  }
  assert.equal(h.store.get().position, h.position)
})
