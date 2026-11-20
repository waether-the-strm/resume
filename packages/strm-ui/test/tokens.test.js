// The rules of the token tiers, checked on the CSS itself (ADR 0003).
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const src = join(import.meta.dirname, "..", "src")
const read = (file) => readFileSync(join(src, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")
const cssFiles = (dir) =>
  readdirSync(join(src, dir))
    .filter((name) => name.endsWith(".css"))
    .map((name) => join(dir, name))

const defined = (css) => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
const used = (css) => new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]))

const tiers = ["tokens/primitives.css", "tokens/semantic.css", "tokens/component.css"]
const everyToken = new Set(tiers.flatMap((file) => [...defined(read(file))]))
const consumers = ["base.css", ...cssFiles("components")]

test("every var() that is used is defined", () => {
  for (const file of [...tiers, ...consumers]) {
    const css = read(file)
    const local = defined(css)
    for (const name of used(css)) {
      assert.ok(
        everyToken.has(name) || local.has(name),
        `${file} uses ${name}, which is not defined`
      )
    }
  }
})

test("only the semantic tier reads primitives", () => {
  for (const file of ["tokens/component.css", ...consumers]) {
    for (const name of used(read(file))) {
      assert.ok(!name.startsWith("--p-"), `${file} reads the primitive ${name}`)
    }
  }
})

test("primitives hold raw values, never references", () => {
  assert.deepEqual([...used(read("tokens/primitives.css"))], [])
})

test("components write no raw colours", () => {
  for (const file of consumers) {
    const raw = read(file).match(/#[0-9a-f]{3,8}\b|\brgba?\(/gi)
    assert.equal(raw, null, `${file} has a raw colour: ${raw}`)
  }
})
