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
  assert.equal(pl.changeName, "To nie Ty? Zmień")
  assert.equal(en.changeName, "Not you? Change name")
  assert.equal(pl.feedback, "Oceń stronę")
  assert.equal(en.feedback, "Leave feedback")
  assert.equal(pl.nameLabel, "Twoje imię lub ksywka")
  assert.equal(en.namePlaceholder, "Your name or nickname")
  assert.equal(pl.favoriteOne, "Oglądałem/am tylko jedną")
  assert.equal(en.favoriteOne, "Only viewed one")
  assert.equal(pl.title, "To szkic mojej nowej strony.")
  assert.equal(pl.titleNamed("Ada"), "Hej Ada! Dzięki, że tu jesteś.")
  assert.equal(en.titleNamed("Ada"), "Hi Ada! Thanks for being here.")
  assert.equal(
    pl.widget,
    "Ten pasek z opinią możesz zwinąć do ikony, przesunąć albo zamknąć. Jeśli go zamkniesz, wystarczy odświeżyć stronę, żeby wrócił."
  )
  assert.equal(
    en.widget,
    "You can shrink this feedback bar to an icon, move it, or close it. If you close it, refresh the page and it comes back."
  )
  assert.equal(pl.shrink, "Zwiń do ikony")
  assert.equal(en.shrink, "Shrink to an icon")
  assert.equal(pl.expand, "Rozwiń")
  assert.equal(en.expand, "Expand")
  assert.equal(pl.move, "Przesuń")
  assert.equal(en.move, "Move")
  assert.equal(pl.closeWidget, "Zamknij pasek")
  assert.equal(en.closeWidget, "Close the bar")
  assert.equal(pl.close, "Zamknij")
  assert.equal(
    pl.thanksNamed("Ada"),
    "Dzięki, Ada! Pasek zostaje w rogu – jeśli przełączysz wersję tekstu, możesz dorzucić kolejną opinię."
  )
  assert.notEqual(pl.widget, en.widget)
})
