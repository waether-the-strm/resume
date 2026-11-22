import assert from "node:assert/strict"
import { test } from "node:test"
import { EXIT_SCREENS, exitAmount, exitDisplacement } from "./exit-amount.ts"

test("the warp is 0 on the look and 1 after 0.55 screens past the track", () => {
  const length = 5.02
  assert.equal(exitAmount(length, length, 3, true), 0)
  assert.equal(exitAmount(length - 0.2, length, 3, true), 0)
  assert.ok(Math.abs(exitAmount(length + EXIT_SCREENS, length, 3, true) - 1) < 1e-9)
  assert.equal(exitAmount(length + 1, length, 3, true), 1)
  assert.ok(Math.abs(exitAmount(length + EXIT_SCREENS / 2, length, 3, true) - 0.5) < 1e-9)
})

test("the warp stays off without motion and off before the look", () => {
  const length = 5.02
  assert.equal(exitAmount(length + 0.2, length, 3, false), 0)
  assert.equal(exitAmount(length + 0.2, length, 2, true), 0)
  assert.equal(exitAmount(length + 0.2, length, 0, true), 0)
})

test("the map bends by the prototype's x * 90, and not at all at either end", () => {
  assert.equal(exitDisplacement(0), 0)
  assert.equal(exitDisplacement(0.5), 45)
  assert.equal(exitDisplacement(1), 0)
})
