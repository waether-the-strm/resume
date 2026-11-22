import assert from "node:assert/strict"
import { test } from "node:test"
import { HINT_DONE_PX, cssMilliseconds, hintPastFirstFrame } from "./hint.ts"

test("the first frame is the top of scene 0, and 8px down is already past it", () => {
  const height = 700
  assert.equal(hintPastFirstFrame(0, 0, height), false)
  assert.equal(hintPastFirstFrame(HINT_DONE_PX / height, 0, height), false)
  assert.equal(hintPastFirstFrame(HINT_DONE_PX / height + 1e-6, 0, height), true)
  assert.equal(hintPastFirstFrame(0, 1, height), true)
  assert.equal(hintPastFirstFrame(0, 0, 0), false)
})

test("a computed time is milliseconds, and an unparsed value is 0", () => {
  assert.equal(cssMilliseconds("1.4s"), 1400)
  assert.equal(cssMilliseconds("250ms"), 250)
  assert.equal(cssMilliseconds("0s"), 0)
  assert.equal(cssMilliseconds(" 800ms "), 800)
  assert.equal(cssMilliseconds(""), 0)
  assert.equal(cssMilliseconds("none"), 0)
})
