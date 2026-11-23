import assert from "node:assert/strict"
import { test } from "node:test"
import {
  copyVariant,
  createMemory,
  langFromSearch,
  readIdentity,
  readMinimized,
  readPlace,
  testerFromSearch,
  testingKeys,
  tourOwnsProgress,
  writeLang,
  writeMinimized,
  writePlace,
  writeWelcomed,
} from "./session.ts"

const id = () => "session-1"

test("a tester name arrives as tester or t, and the tour keeps t", () => {
  assert.equal(testerFromSearch("?tester=Ada"), "Ada")
  assert.equal(testerFromSearch("?t=Ada"), "Ada")
  assert.equal(testerFromSearch("?tester=Bea&t=Ada"), "Bea")
  assert.equal(testerFromSearch("?tester="), "")
  assert.equal(testerFromSearch("?stage=2&t=0.5"), null)
  assert.equal(testerFromSearch("?stage=jan&t=1"), null)
  assert.equal(testerFromSearch("?stage=2&t=0.5&tester=Ada"), "Ada")
  assert.equal(testerFromSearch(""), null)
  assert.equal(tourOwnsProgress(new URLSearchParams("stage=2&t=0.5")), true)
  assert.equal(tourOwnsProgress(new URLSearchParams("t=Ada")), false)
})

test("the feedback language is independent of whatever else is in the address", () => {
  assert.equal(langFromSearch("?feedbackLang=pl"), "pl")
  assert.equal(langFromSearch("?fl=en"), "en")
  assert.equal(langFromSearch("?feedbackLang=en&fl=pl"), "en")
  assert.equal(langFromSearch("?fl=no"), null)
  assert.equal(langFromSearch("?copy=a&stage=2&t=0.5"), null)
})

test("the name and language persist, and the default language is English", () => {
  const memory = createMemory()
  const first = readIdentity("", memory, id)
  assert.equal(first.lang, "en")
  assert.equal(first.name, "")
  assert.equal(first.sessionId, "session-1")
  assert.equal(first.welcomed, false)

  const named = readIdentity("?t=Ada&fl=pl", memory, id)
  assert.equal(named.name, "Ada")
  assert.equal(named.lang, "pl")
  assert.equal(named.sessionId, "session-1")

  const later = readIdentity("?copy=b&stage=2&t=0.5", memory, () => "other-session")
  assert.equal(later.name, "Ada")
  assert.equal(later.lang, "pl")
  assert.equal(later.sessionId, "session-1")
  assert.equal(copyVariant("?copy=b&stage=2&t=0.5"), "b")
})

test("an empty tester clears a stored name, and an unknown copy is the default", () => {
  const memory = createMemory({ [testingKeys.name]: "Ada" })
  const cleared = readIdentity("?tester=", memory, id)
  assert.equal(cleared.name, "")
  assert.equal(memory.getItem(testingKeys.name), "")
  assert.equal(copyVariant("?copy=nope"), "")
  writeLang(memory, "en")
  writeWelcomed(memory, true)
  const again = readIdentity("", memory, id)
  assert.equal(again.lang, "en")
  assert.equal(again.welcomed, true)
})

test("the widget remembers where it was dropped, and whether it was minimized", () => {
  const memory = createMemory()
  assert.equal(readPlace(memory), null)
  assert.equal(readMinimized(memory), false)
  writePlace(memory, 12.4, 40.6)
  writeMinimized(memory, true)
  assert.deepEqual(readPlace(memory), { x: 12, y: 41 })
  assert.equal(readMinimized(memory), true)
  assert.equal(memory.getItem("strm.testing.closed"), null)
  memory.setItem(testingKeys.place, "nope")
  assert.equal(readPlace(memory), null)
  writeMinimized(memory, false)
  assert.equal(readMinimized(memory), false)
})

test("a name drops control characters and stays short", () => {
  const memory = createMemory()
  const noisy = readIdentity(`?tester=${"A".repeat(90)}%0A`, memory, id)
  assert.equal(noisy.name.includes("\n"), false)
  assert.ok(noisy.name.length <= 80)
})
