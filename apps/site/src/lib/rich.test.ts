import { test } from "node:test"
import assert from "node:assert/strict"
import { plain, unknownRoles, words } from "./rich.ts"
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
