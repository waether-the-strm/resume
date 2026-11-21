import { test } from "node:test"
import assert from "node:assert/strict"
import { PRODUCTION_ENV, emitsNoindex, staysUnindexed } from "./indexing.ts"

const indexable = ["/", "/cv", "/cv/", "/pl/", "/pl", "/pl/cv", "/pl/cv/"]

const held = [
  "/ui",
  "/ui/",
  "/ui/primitives",
  "/ui/primitives/",
  "/404",
  "/404/",
  "/pl/404",
  "/pl/404/",
]

test("the production flag is STRM_PRODUCTION", () => {
  assert.equal(PRODUCTION_ENV, "STRM_PRODUCTION")
})

test("a non-production build noindexes every page", () => {
  for (const path of [...indexable, ...held]) {
    assert.equal(emitsNoindex(path, false), true, path)
  }
})

test("a production build indexes the public pages", () => {
  for (const path of indexable) {
    assert.equal(emitsNoindex(path, true), false, path)
    assert.equal(staysUnindexed(path), false, path)
  }
})

test("a production build still noindexes /ui and the 404", () => {
  for (const path of held) {
    assert.equal(emitsNoindex(path, true), true, path)
    assert.equal(staysUnindexed(path), true, path)
  }
})

test("a path that only starts with the same letters is indexed", () => {
  assert.equal(emitsNoindex("/uibook", true), false)
  assert.equal(emitsNoindex("/cv/4040", true), false)
})
