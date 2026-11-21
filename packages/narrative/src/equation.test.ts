import { test } from "node:test"
import assert from "node:assert/strict"
import { equationAt } from "./equation.ts"
import { defaultThresholds, phaseOf } from "./phases.ts"

/** The state at a progress of the scene, as the scenarios name it. */
const at = (t: number) => equationAt(phaseOf(defaultThresholds, t))

test("A1 to A3: empty paper, then the line, then the plus and nothing above it", () => {
  const start = at(0)
  assert.equal(start.line, false)
  assert.equal(start.corner, false)
  assert.equal(at(0.05).line, true)
  assert.equal(at(0.05).plus, false)
  const plus = at(0.09)
  assert.equal(plus.plus, true)
  assert.equal(
    plus.rows.some((row) => row.asked),
    false
  )
})

test("A4 and A5: the question comes first, then its answer; the next row waits", () => {
  const asked = at(0.13)
  assert.deepEqual(asked.rows[0], { asked: true, answered: false })
  const answered = at(0.2)
  assert.deepEqual(answered.rows[0], { asked: true, answered: true })
  assert.deepEqual(answered.rows[1], { asked: false, answered: false })
})

test("A6: three questions answered, no `how?` yet, the line not yet pulsed", () => {
  const state = at(0.45)
  assert.equal(
    state.rows.every((row) => row.asked && row.answered),
    true
  )
  assert.equal(state.how, false)
  assert.equal(state.pulsed, false)
})

test("A7 and A8: `how?` arrives centred with no answer, then sits left with its answer", () => {
  const centred = at(0.5)
  assert.equal(centred.how && centred.centred && centred.pulsed, true)
  assert.equal(centred.left || centred.howAnswered, false)
  const left = at(0.58)
  assert.equal(left.left && left.howAnswered, true)
  assert.equal(left.centred, false)
})

test("A9 to A11: the row keeps its answer through the dissolve, stands alone, then loses it", () => {
  const dissolving = at(0.7)
  assert.equal(dissolving.howAnswered, true)
  assert.equal(dissolving.alone, false)
  const alone = at(0.82)
  assert.equal(alone.alone, true)
  assert.equal(alone.how && !alone.gone, true)
  assert.equal(alone.howAnswered, false)
  assert.equal(at(0.85).howAnswered, false)
})

test("A12: `how` is in the corner and the equation is off the page", () => {
  const state = at(0.95)
  assert.equal(state.corner && state.hidden, true)
})

test("the fixed defect: at t=0.9 `how` is already in the corner, the page is never empty", () => {
  const state = at(0.9)
  assert.equal(state.gone, true)
  assert.equal(state.hidden, false)
  assert.equal(state.corner, true)
})

test("every phase shows `how` somewhere once it has arrived", () => {
  for (let phase = 9; phase <= defaultThresholds.length; phase++) {
    const state = equationAt(phase)
    assert.equal(
      (state.how && !state.gone && !state.hidden) || state.corner,
      true,
      `phase ${phase}`
    )
  }
})

test("the state is a function of the phase alone: the same from either side", () => {
  for (let phase = 0; phase <= defaultThresholds.length; phase++) {
    assert.deepEqual(equationAt(phase), equationAt(phase))
  }
  assert.equal(equationAt(8).pulsed, false)
})
