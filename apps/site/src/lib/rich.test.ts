import { test } from "node:test"
import assert from "node:assert/strict"
import { plain, runs, unknownRoles, words } from "./rich.ts"
import { typeset } from "../i18n/typography.ts"

test("words carry the role of their run", () => {
  assert.deepEqual(words("Your product, [clear at a glance.]{accent}"), [
    { text: "Your" },
    { text: "product," },
    { text: "clear", role: "accent" },
    { text: "at", role: "accent" },
    { text: "a", role: "accent" },
    { text: "glance.", role: "accent" },
  ])
})

test("a role can sit anywhere in the sentence", () => {
  const out = words("Nazywam się [Jan Mirecki]{name} i projektuję.")
  assert.deepEqual(
    out.filter((word) => word.role === "name").map((word) => word.text),
    ["Jan", "Mirecki"]
  )
})

test("plain removes the marks", () => {
  assert.equal(plain("[=]{accent} how?"), "= how?")
})

test("unknown roles are reported", () => {
  assert.deepEqual(unknownRoles("[x]{accent} [y]{loud}"), ["loud"])
})

test("Polish one-letter words are tied to the next word and stay one unit", () => {
  const set = typeset("Projektuję w materiale i buduję z myślą o użytkowniku.", "pl")
  assert.ok(set.includes("w materiale"))
  assert.ok(set.includes("i buduję"))
  assert.ok(set.includes("z myślą"))
  assert.ok(set.includes("o użytkowniku"))
  assert.ok(words(set).some((word) => word.text === "w materiale"))
})

test("English ties the pronoun I to the next word", () => {
  assert.equal(typeset("Then I build it.", "en"), "Then I build it.")
})

test("a marked run stays one piece", () => {
  assert.deepEqual(runs("Your product, [clear at a glance.]{accent}"), [
    { text: "Your product, " },
    { text: "clear at a glance.", role: "accent" },
  ])
})

test("a run can sit in the middle, and two runs stay separate", () => {
  assert.deepEqual(runs("Nazywam się [Jan Mirecki]{name} i projektuję."), [
    { text: "Nazywam się " },
    { text: "Jan Mirecki", role: "name" },
    { text: " i projektuję." },
  ])
  assert.deepEqual(runs("[a]{accent} and [b]{name}"), [
    { text: "a", role: "accent" },
    { text: " and " },
    { text: "b", role: "name" },
  ])
})

test("a run at the start leaves the rest plain", () => {
  assert.deepEqual(runs("[=]{accent} how?"), [{ text: "=", role: "accent" }, { text: " how?" }])
})

test("unmarked text is one plain stretch", () => {
  assert.deepEqual(runs("One idea per sentence."), [{ text: "One idea per sentence." }])
  assert.deepEqual(runs(""), [])
})

test("runs join back to the plain text, including a typeset tie", () => {
  const sources = [
    "Your product, [clear at a glance.]{accent}",
    "Nazywam się [Jan Mirecki]{name} i projektuję.",
    "[=]{accent} how?",
    "One idea per sentence.",
    typeset("Then I [build it.]{accent}", "en"),
    typeset("Projektuję w materiale i buduję z myślą o użytkowniku.", "pl"),
  ]
  for (const source of sources) {
    assert.equal(
      runs(source)
        .map((part) => part.text)
        .join(""),
      plain(source),
      source
    )
  }
  const tied = runs(typeset("Then I [build it.]{accent}", "en"))
  assert.equal(tied[0]?.text, "Then I ")
  assert.deepEqual(tied[1], { text: "build it.", role: "accent" })
})
