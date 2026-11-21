import { test } from "node:test"
import assert from "node:assert/strict"
import { BEAT_MS, createScenes } from "./scenes.ts"
import type { Stage } from "./stops.ts"

function harness() {
  const log: string[] = []
  const timers: { id: number; at: number; run: () => void }[] = []
  let now = 0
  let ids = 0
  const scenes = createScenes({
    clock: {
      setTimeout(run, ms) {
        const id = ++ids
        timers.push({ id, at: now + ms, run })
        return id
      },
      clearTimeout(id) {
        const index = timers.findIndex((timer) => timer.id === id)
        if (index >= 0) timers.splice(index, 1)
      },
    },
    transition: (change) => {
      log.push("transition")
      change()
    },
    heading: (stage: Stage) => log.push(`heading ${stage}`),
    show: (stage: Stage) => log.push(`show ${stage}`),
    progress: (stage: Stage, t: number) => log.push(`progress ${stage} ${t}`),
  })
  const advance = (ms: number) => {
    now += ms
    for (const timer of timers.filter((entry) => entry.at <= now)) {
      timers.splice(timers.indexOf(timer), 1)
      timer.run()
    }
  }
  const take = () => log.splice(0)
  return { scenes, advance, take, pending: () => timers.length }
}

test("the first sample lands at once: heading, scene, progress, no transition", () => {
  const { scenes, take } = harness()
  scenes.update(1, 0.4)
  assert.deepEqual(take(), ["heading 1", "show 1", "progress 1 0.4"])
  assert.equal(scenes.shown(), 1)
})

test("inside a scene only progress is passed on", () => {
  const { scenes, take } = harness()
  scenes.update(1, 0.4)
  take()
  scenes.update(1, 0.5)
  scenes.update(1, 0.6)
  assert.deepEqual(take(), ["progress 1 0.5", "progress 1 0.6"])
})

test("going forward: heading first, the old scene frozen at its end, the page a beat later", () => {
  const { scenes, advance, take } = harness()
  scenes.update(1, 0.9)
  take()

  scenes.update(2, 0.02)
  assert.deepEqual(take(), ["heading 2", "progress 1 1"])
  assert.equal(scenes.shown(), 1)

  // Still inside the beat: the new scene's progress waits, the old one is not touched.
  scenes.update(2, 0.05)
  assert.deepEqual(take(), [])

  advance(BEAT_MS - 1)
  assert.deepEqual(take(), [])
  advance(1)
  assert.deepEqual(take(), ["transition", "show 2", "progress 2 0.05"])
  assert.equal(scenes.shown(), 2)
})

test("going back: the scene being left is frozen at its start (scenario C1 in reverse)", () => {
  const { scenes, advance, take } = harness()
  scenes.update(3, 0.1)
  take()
  scenes.update(2, 0.97)
  assert.deepEqual(take(), ["heading 2", "progress 3 0"])
  advance(BEAT_MS)
  assert.deepEqual(take(), ["transition", "show 2", "progress 2 0.97"])
})

test("returning before the page followed cancels the switch and thaws the scene", () => {
  const { scenes, advance, take, pending } = harness()
  scenes.update(1, 0.9)
  take()
  scenes.update(2, 0.02)
  take()
  scenes.update(1, 0.95)
  assert.deepEqual(take(), ["heading 1", "progress 1 0.95"])
  assert.equal(pending(), 0)
  advance(BEAT_MS * 2)
  assert.deepEqual(take(), [])
  assert.equal(scenes.shown(), 1)
})

test("a scene skipped within the beat is never shown", () => {
  const { scenes, advance, take } = harness()
  scenes.update(1, 0.9)
  take()
  scenes.update(2, 0.5)
  scenes.update(3, 0.1)
  assert.deepEqual(take(), ["heading 2", "progress 1 1", "heading 3", "progress 1 1"])
  advance(BEAT_MS)
  assert.deepEqual(take(), ["transition", "show 3", "progress 3 0.1"])
})

test("the equation takes the page back at once, and follows the scroll while it does", () => {
  const { scenes, take, pending } = harness()
  scenes.update(1, 0.2)
  take()
  scenes.update(0, 0.95)
  assert.deepEqual(take(), ["heading 0", "transition", "show 0", "progress 0 0.95"])
  assert.equal(pending(), 0)
  scenes.update(0, 0.9)
  assert.deepEqual(take(), ["progress 0 0.9"])
})

test("leaving the equation: it keeps its progress until the words arrive", () => {
  const { scenes, advance, take } = harness()
  scenes.update(0, 0.99)
  take()
  scenes.update(1, 0.01)
  assert.deepEqual(take(), ["heading 1"])
  advance(BEAT_MS)
  assert.deepEqual(take(), ["transition", "show 1", "progress 1 0.01"])
})

test("jump lands without a beat, and dispose stops a pending switch", () => {
  const { scenes, advance, take } = harness()
  scenes.update(1, 1)
  take()
  scenes.jump(3, 0.5)
  assert.deepEqual(take(), ["heading 3", "show 3", "progress 3 0.5"])
  scenes.update(2, 0.9)
  take()
  scenes.dispose()
  advance(BEAT_MS)
  assert.deepEqual(take(), [])
})
