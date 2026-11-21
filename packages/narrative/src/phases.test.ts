import assert from "node:assert/strict"
import { test } from "node:test"
import {
  WARP_PHASE,
  WARP_SCALE,
  WARP_SPAN,
  WARP_START,
  createPhaseTracker,
  defaultThresholds,
  phaseOf,
  phasesToApply,
  warpAt,
  type PhaseDirection,
  type PhaseStep,
} from "./phases.ts"

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9

/** The prototype's own count: one per threshold `t` has reached. */
const prototypePhase = (t: number) =>
  [0.03, 0.07, 0.11, 0.17, 0.23, 0.29, 0.35, 0.41, 0.48, 0.55, 0.63, 0.8, 0.86, 0.92].reduce(
    (phase, threshold) => phase + (t >= threshold ? 1 : 0),
    0
  )

test("the default thresholds are the prototype's list, ascending", () => {
  assert.deepEqual(
    [...defaultThresholds],
    [0.03, 0.07, 0.11, 0.17, 0.23, 0.29, 0.35, 0.41, 0.48, 0.55, 0.63, 0.8, 0.86, 0.92]
  )
  for (let index = 1; index < defaultThresholds.length; index++) {
    assert.ok(defaultThresholds[index]! > defaultThresholds[index - 1]!)
  }
  assert.equal(defaultThresholds.length, 14)
  assert.equal(WARP_PHASE, 11)
  assert.equal(defaultThresholds[WARP_PHASE - 1], WARP_START)
  assert.equal(WARP_SPAN, 0.14)
  assert.equal(WARP_SCALE, 22)
})

test("phaseOf matches the prototype at every scenario, stop and threshold", () => {
  const samples: Array<[number, number, string]> = [
    [-0.2, 0, "before the track"],
    [0, 0, "A1 the start"],
    [0.02, 0, "just below the line"],
    [0.03, 1, "the line, exact"],
    [0.05, 1, "A2 the line"],
    [0.07, 2, "the plus, exact"],
    [0.09, 2, "A3 the plus"],
    [0.11, 3, "what?, exact"],
    [0.13, 3, "A4 what? alone"],
    [0.17, 4, "the answer to what?, exact"],
    [0.2, 4, "A5 what? answered, the what? stop"],
    [0.23, 5, "why?, exact"],
    [0.29, 6, "the answer to why?, exact"],
    [0.32, 6, "the why? stop"],
    [0.35, 7, "who?, exact"],
    [0.41, 8, "the answer to who?, exact"],
    [0.45, 8, "A6 who? answered, the who? stop"],
    [0.48, 9, "how? centred, exact"],
    [0.5, 9, "A7 how? centred"],
    [0.55, 10, "how? left, exact"],
    [0.58, 10, "A8 how? answered"],
    [0.59, 10, "the equation stop"],
    [0.63, 11, "the dissolve opens, exact"],
    [0.7, 11, "A9 dissolving"],
    [0.77, 11, "the dissolve has finished, still phase 11"],
    [0.78, 11, "the answer, alone"],
    [0.8, 12, "past the dissolve, exact"],
    [0.82, 12, "A10"],
    [0.86, 13, "how? vanishes, exact"],
    [0.88, 13, "A11"],
    [0.92, 14, "the corner, exact"],
    [0.95, 14, "A12"],
    [1, 14, "the end of the equation"],
    [1.4, 14, "past the end"],
  ]
  for (const [t, phase, label] of samples) {
    assert.equal(phaseOf(defaultThresholds, t), phase, label)
    assert.equal(phaseOf(defaultThresholds, t), prototypePhase(t), label)
  }
})

test("each threshold counts at its value and not in the gap before it", () => {
  let previous = 0
  defaultThresholds.forEach((threshold, index) => {
    const below = (previous + threshold) / 2
    assert.equal(phaseOf(defaultThresholds, below), index, `below ${threshold}`)
    assert.equal(phaseOf(defaultThresholds, threshold), index + 1, `at ${threshold}`)
    previous = threshold
  })
})

test("a different list is counted as given, exact hits included", () => {
  assert.equal(phaseOf([0.5, 0.2], 0.3), 1)
  assert.equal(phaseOf([0.5, 0.2], 0.5), 2)
  assert.equal(phaseOf([0.5, 0.2], 0.2), 1)
  assert.equal(phaseOf([], 1), 0)
})

test("phasesToApply replays every phase between two phases, in either direction", () => {
  const cases: Array<[number, number, Array<[number, PhaseDirection]>]> = [
    [4, 4, []],
    [-1, -1, []],
    [0, 0, []],
    [-1, 0, [[0, 0]]],
    [-1, 14, [[14, 0]]],
    [-1, 4, [[4, 0]]],
    [0, 1, [[1, 1]]],
    [
      0,
      2,
      [
        [1, 1],
        [2, 1],
      ],
    ],
    [
      2,
      8,
      [
        [3, 1],
        [4, 1],
        [5, 1],
        [6, 1],
        [7, 1],
        [8, 1],
      ],
    ],
    [
      1,
      8,
      [
        [2, 1],
        [3, 1],
        [4, 1],
        [5, 1],
        [6, 1],
        [7, 1],
        [8, 1],
      ],
    ],
    [8, 9, [[9, 1]]],
    [
      9,
      12,
      [
        [10, 1],
        [11, 1],
        [12, 1],
      ],
    ],
    [10, 9, [[9, -1]]],
    [
      14,
      12,
      [
        [13, -1],
        [12, -1],
      ],
    ],
    [
      14,
      1,
      [
        [13, -1],
        [12, -1],
        [11, -1],
        [10, -1],
        [9, -1],
        [8, -1],
        [7, -1],
        [6, -1],
        [5, -1],
        [4, -1],
        [3, -1],
        [2, -1],
        [1, -1],
      ],
    ],
  ]
  for (const [from, to, expected] of cases) {
    assert.deepEqual(
      phasesToApply(from, to).map((step) => [step.phase, step.direction]),
      expected,
      `${from} -> ${to}`
    )
  }
})

test("every pair of phases from a fresh start through the last agrees on the whole span", () => {
  for (let from = -1; from <= defaultThresholds.length; from++) {
    for (let to = 0; to <= defaultThresholds.length; to++) {
      const steps = phasesToApply(from, to)
      if (from === to) {
        assert.deepEqual(steps, [])
        continue
      }
      if (from < 0) {
        assert.deepEqual(steps, [{ phase: to, direction: 0 }])
        continue
      }
      const direction: PhaseDirection = to > from ? 1 : -1
      assert.equal(steps.length, Math.abs(to - from), `${from} -> ${to}`)
      steps.forEach((step, index) => {
        assert.equal(step.phase, from + direction * (index + 1))
        assert.equal(step.direction, direction)
      })
      assert.equal(steps[0]?.phase, from + direction)
      assert.equal(steps.at(-1)?.phase, to)
    }
  }
})

const record = () => {
  const seen: PhaseStep[] = []
  const tracker = createPhaseTracker(defaultThresholds, (step) => seen.push(step))
  return { seen, tracker }
}

test("the tracker starts unapplied, and the first sample lands with direction 0", () => {
  const { seen, tracker } = record()
  assert.equal(tracker.phase(), -1)
  tracker.update(0)
  assert.deepEqual(seen, [{ phase: 0, direction: 0 }])
  assert.equal(tracker.phase(), 0)
})

test("applying the same phase twice calls nothing", () => {
  const { seen, tracker } = record()
  tracker.update(0.05)
  assert.deepEqual(seen, [{ phase: 1, direction: 0 }])
  tracker.update(0.05)
  tracker.update(0.06)
  tracker.update(0.03)
  assert.equal(seen.length, 1)
  assert.equal(tracker.phase(), 1)
  tracker.update(1)
  tracker.update(1)
  tracker.update(1.4)
  assert.equal(tracker.phase(), 14)
  assert.equal(seen.filter((step) => step.phase === 14).length, 1)
})

test("each default threshold fires once, in order, and again calls nothing", () => {
  const { seen, tracker } = record()
  tracker.update(0)
  seen.length = 0
  defaultThresholds.forEach((threshold, index) => {
    tracker.update(threshold)
    assert.deepEqual(seen, [{ phase: index + 1, direction: 1 }])
    assert.equal(tracker.phase(), index + 1)
    seen.length = 0
    tracker.update(threshold)
    assert.deepEqual(seen, [])
  })
})

test("a jump over several thresholds replays each phase in between", () => {
  const seen: PhaseStep[] = []
  let jumping = false
  const tracker = createPhaseTracker(defaultThresholds, (step) => {
    seen.push(step)
    if (jumping) assert.equal(tracker.phase(), 8)
  })
  tracker.update(0.05)
  seen.length = 0
  jumping = true
  tracker.update(0.45)
  assert.equal(tracker.phase(), 8)
  assert.deepEqual(
    seen.map((step) => [step.phase, step.direction]),
    [
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 1],
      [7, 1],
      [8, 1],
    ]
  )
  assert.equal(tracker.phase(), 8)
  assert.deepEqual(seen, phasesToApply(1, 8))
})

test("crossing down from the corner to the line replays each phase", () => {
  const { seen, tracker } = record()
  tracker.update(0.95)
  assert.deepEqual(seen, [{ phase: 14, direction: 0 }])
  seen.length = 0
  tracker.update(0.05)
  const reverse: Array<[number, PhaseDirection]> = [
    [13, -1],
    [12, -1],
    [11, -1],
    [10, -1],
    [9, -1],
    [8, -1],
    [7, -1],
    [6, -1],
    [5, -1],
    [4, -1],
    [3, -1],
    [2, -1],
    [1, -1],
  ]
  assert.deepEqual(
    seen.map((step) => [step.phase, step.direction]),
    reverse
  )
  assert.equal(tracker.phase(), 1)
  seen.length = 0
  tracker.update(0.09)
  assert.deepEqual(seen, [{ phase: 2, direction: 1 }])
  seen.length = 0
  tracker.update(0.05)
  assert.deepEqual(seen, [{ phase: 1, direction: -1 }])
})

test("the thresholds given to the tracker are the ones it counts", () => {
  const seen: PhaseStep[] = []
  const tracker = createPhaseTracker([0.2, 0.5], (step) => seen.push(step))
  tracker.update(0.6)
  assert.deepEqual(seen, [{ phase: 2, direction: 0 }])
  tracker.update(0)
  assert.deepEqual(seen, [
    { phase: 2, direction: 0 },
    { phase: 1, direction: -1 },
    { phase: 0, direction: -1 },
  ])
})

test("warpAt is the prototype's dissolve, and it finishes before phase 12", () => {
  const atStart = warpAt(WARP_START)
  assert.equal(atStart.progress, 0)
  assert.equal(atStart.opacity, 1)
  assert.equal(atStart.scale, 0)
  assert.equal(atStart.dissolving, false)
  assert.equal(atStart.alone, false)

  const midway = warpAt(0.7)
  assert.ok(close(midway.progress, 0.5))
  assert.ok(close(midway.opacity, 0.5))
  assert.equal(midway.scale, 11)
  assert.equal(midway.dissolving, true)
  assert.equal(midway.alone, false)
  assert.equal(phaseOf(defaultThresholds, 0.7), WARP_PHASE)

  const done = warpAt(WARP_START + WARP_SPAN)
  assert.equal(done.progress, 1)
  assert.equal(done.opacity, 0)
  assert.equal(done.scale, WARP_SCALE)
  assert.equal(done.dissolving, false)
  assert.equal(done.alone, true)
  assert.equal(phaseOf(defaultThresholds, WARP_START + WARP_SPAN), WARP_PHASE)

  const held = warpAt(0.78)
  assert.equal(held.alone, true)
  assert.equal(held.scale, WARP_SCALE)
  assert.equal(held.dissolving, false)
  assert.equal(phaseOf(defaultThresholds, 0.78), WARP_PHASE)

  const before = warpAt(0.5)
  assert.equal(before.progress, 0)
  assert.equal(before.dissolving, false)
  assert.equal(before.alone, false)

  const after = warpAt(1)
  assert.equal(after.progress, 1)
  assert.equal(after.scale, WARP_SCALE)
  assert.equal(after.alone, true)
})
