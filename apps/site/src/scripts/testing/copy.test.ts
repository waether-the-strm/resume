import assert from "node:assert/strict"
import { test } from "node:test"
import { testingCopy } from "./copy.ts"

test("the testing layer's Polish is not a copy of its English", () => {
  const en = testingCopy.en
  const pl = testingCopy.pl
  assert.notEqual(pl.feedback, en.feedback)
  assert.notEqual(pl.changeName, en.changeName)
  assert.notEqual(pl.nameLabel, en.nameLabel)
  assert.notEqual(pl.clarityQuestion, en.clarityQuestion)
  assert.notEqual(pl.toneQuestion, en.toneQuestion)
  assert.notEqual(pl.favoriteOne, en.favoriteOne)
  assert.equal(pl.changeName, "To nie Ty? Zmień imię")
  assert.equal(en.changeName, "Not you? Change name")
  assert.equal(pl.feedback, "Oceń stronę")
  assert.equal(en.feedback, "Leave feedback")
  assert.equal(pl.nameLabel, "Jak masz na imię / ksywka?")
  assert.equal(en.namePlaceholder, "Your name or nickname")
  assert.equal(pl.favoriteOne, "Tylko jedną oglądałem/am")
  assert.equal(en.favoriteOne, "Only viewed one")
  assert.equal(pl.titleNamed("Ada"), "Hej Ada! Dzięki, że tu jesteś.")
  assert.equal(en.titleNamed("Ada"), "Hi Ada! Thanks for being here.")
})
