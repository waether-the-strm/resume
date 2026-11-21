import assert from "node:assert/strict"
import { test } from "node:test"
import { typesetHtml } from "./typeset-html.ts"

const NBSP = "\u00a0"

test("English ties the pronoun I to the next word, inside the text only", () => {
  assert.equal(
    typesetHtml("<p>I exist only to prove it.</p>", "en"),
    `<p>I${NBSP}exist only to prove it.</p>`
  )
})

test("a link label is typeset and the href is left alone", () => {
  assert.equal(
    typesetHtml('<p><a href="/I/am">I go</a></p>', "en"),
    `<p><a href="/I/am">I${NBSP}go</a></p>`
  )
})

test("code is not typeset", () => {
  const html = "<p>I stay</p><pre><code>I stay</code></pre>"
  assert.equal(typesetHtml(html, "en"), `<p>I${NBSP}stay</p><pre><code>I stay</code></pre>`)
})

test("Polish ties a one-letter word to the word after it", () => {
  assert.equal(typesetHtml("<p>w domu</p>", "pl"), `<p>w${NBSP}domu</p>`)
})

test("a comment is left alone", () => {
  assert.equal(typesetHtml("<!-- I stay --><p>I go</p>", "en"), `<!-- I stay --><p>I${NBSP}go</p>`)
})
