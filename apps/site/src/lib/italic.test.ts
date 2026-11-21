import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { italicPage, pageUsesItalics } from "./italic.ts"

test("italic pages are the CV in each launched locale", () => {
  assert.equal(pageUsesItalics("/cv"), true)
  assert.equal(pageUsesItalics("/cv/"), true)
  assert.equal(pageUsesItalics("/pl/cv"), true)
  assert.equal(pageUsesItalics("/pl/cv/"), true)
  assert.equal(pageUsesItalics("/"), false)
  assert.equal(pageUsesItalics("/pl/"), false)
  assert.equal(pageUsesItalics("/pl"), false)
  assert.equal(pageUsesItalics("/no/cv"), false)
  assert.equal(pageUsesItalics("/ui"), false)
})

test("a locale that is not launched is included only when asked", () => {
  assert.equal(pageUsesItalics("/no/cv", ["no"]), true)
  assert.equal(pageUsesItalics("/cv", ["no"]), false)
})

test("the CV component is that page, and it is where the italics are", () => {
  const source = readFileSync(new URL("../components/Cv.astro", import.meta.url), "utf8")
  assert.match(source, new RegExp(`path="${italicPage}"`))
  assert.match(source, /\.tools\s*\{[^}]*font-style:\s*italic/)
  assert.match(source, /em\s*\{[^}]*font-style:\s*italic/)
})
