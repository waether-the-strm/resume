import { test } from "node:test"
import assert from "node:assert/strict"
import { withTrailingSlash } from "./address.ts"
import { localePath } from "../i18n/locales.ts"

test("a directory page gains one trailing slash", () => {
  assert.equal(withTrailingSlash("/cv"), "/cv/")
  assert.equal(withTrailingSlash("/cv/"), "/cv/")
  assert.equal(withTrailingSlash("/pl/cv"), "/pl/cv/")
  assert.equal(withTrailingSlash("/work/slug"), "/work/slug/")
})

test("the root and a hash stay as they are", () => {
  assert.equal(withTrailingSlash("/"), "/")
  assert.equal(withTrailingSlash(""), "/")
  assert.equal(withTrailingSlash("/#work"), "/#work")
  assert.equal(withTrailingSlash("/pl/#work"), "/pl/#work")
  assert.equal(withTrailingSlash("/cv?x=1"), "/cv/?x=1")
})

test("locale paths and the served form agree", () => {
  assert.equal(withTrailingSlash(localePath("en", "/")), "/")
  assert.equal(withTrailingSlash(localePath("pl", "/")), "/pl/")
  assert.equal(withTrailingSlash(localePath("en", "/cv")), "/cv/")
  assert.equal(withTrailingSlash(localePath("pl", "/cv")), "/pl/cv/")
  assert.equal(withTrailingSlash(localePath("en", "/#work")), "/#work")
})
