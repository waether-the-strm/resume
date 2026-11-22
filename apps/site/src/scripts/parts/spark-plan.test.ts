import assert from "node:assert/strict"
import { test } from "node:test"
import { centre, plan } from "./spark-plan.ts"

const equation = { x: 100, y: 200 }
const corner = { x: 900, y: 40 }

test("forward: the spark at the equation first, the one at the corner a beat later", () => {
  assert.deepEqual(plan(1, equation, corner), [
    { ...equation, late: false },
    { ...corner, late: true },
  ])
})

test("back mirrors it: the corner first, the equation a beat later", () => {
  assert.deepEqual(plan(-1, equation, corner), [
    { ...corner, late: false },
    { ...equation, late: true },
  ])
})

test("a place that is not on the page gets no spark", () => {
  assert.deepEqual(plan(1, null, corner), [{ ...corner, late: true }])
  assert.deepEqual(plan(-1, equation, null), [{ ...equation, late: true }])
  assert.deepEqual(plan(1, null, null), [])
})

test("the centre of a box", () => {
  assert.deepEqual(centre({ left: 10, top: 20, width: 40, height: 10 }), { x: 30, y: 25 })
})
