// The one Recursive file: MONO and wght, the characters the pages use, and an
// upper bound on the size. Adding a character under apps/site/src or
// packages/strm-ui/src fails the character test until the file is rebuilt
// with src/fonts/subset.mjs.
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { requiredCharacters } from "../src/fonts/subset.mjs"
import { cmapCodepoints, fvarAxes, layoutFeatureTags, readTables } from "./woff2.js"

const root = join(import.meta.dirname, "..")
const repo = join(root, "../..")
const read = (file) => readFileSync(join(root, file), "utf8")
const code = (file) => read(file).replace(/\/\*[\s\S]*?\*\//g, "")

// The committed file is about 49 KB. The bound leaves room for a regeneration
// and still rejects the previous 300 KB files.
const MAX_BYTES = 80_000

function parseUnicodeRange(css) {
  const block = css.match(/unicode-range:\s*([^;]+);/)
  assert.ok(block, "unicode-range is missing")
  const found = new Set()
  for (const match of block[1].matchAll(/U\+([0-9A-Fa-f]{1,6})(?:-([0-9A-Fa-f]{1,6}))?/g)) {
    const start = Number.parseInt(match[1], 16)
    const end = match[2] ? Number.parseInt(match[2], 16) : start
    for (let cp = start; cp <= end; cp++) found.add(cp)
  }
  return found
}

function listed(codepoints) {
  return [...codepoints]
    .sort((a, b) => a - b)
    .map(
      (cp) =>
        `U+${cp.toString(16).toUpperCase().padStart(4, "0")} ${JSON.stringify(String.fromCodePoint(cp))}`
    )
    .join(", ")
}

test("the page loads one Recursive file, with the fallback from the metric subset", () => {
  const index = code("src/index.css")
  const css = code("src/fonts/recursive.css")
  const fonts = readdirSync(join(root, "src/fonts")).filter((name) => name.endsWith(".woff2"))
  assert.match(index, /fonts\/recursive\.css/)
  assert.doesNotMatch(index, /fontsource/)
  assert.deepEqual(fonts, ["recursive.woff2"])
  assert.match(css, /url\("\.\/recursive\.woff2"\)/)
  assert.doesNotMatch(css, /recursive-latin|fontsource|cyrillic|vietnamese/i)
  assert.match(css, /font-family:\s*"Recursive Variable"/)
  assert.match(css, /font-style:\s*normal/)
  assert.match(css, /font-weight:\s*300 1000/)
  assert.match(css, /font-display:\s*swap/)
  assert.match(css, /size-adjust:/)
  const layout = readFileSync(join(repo, "apps/site/src/layouts/Base.astro"), "utf8")
  assert.match(layout, /recursive\.woff2/)
  assert.doesNotMatch(layout, /recursive-latin/)
})

test("the family name stays Recursive Variable, with the metric fallback beside it", () => {
  const primitives = code("src/tokens/primitives.css")
  assert.match(
    primitives,
    /--p-font-recursive:\s*"Recursive Variable",\s*"Recursive Fallback",\s*ui-monospace,\s*system-ui,\s*sans-serif;/
  )
})

test("the file keeps MONO and wght, drops the other axes, and stays under the size bound", () => {
  const path = join(root, "src/fonts/recursive.woff2")
  const bytes = readFileSync(path)
  assert.equal(bytes.subarray(0, 4).toString(), "wOF2")
  const size = statSync(path).size
  assert.ok(size < MAX_BYTES, `recursive subset is ${size} bytes`)
  const tables = readTables(bytes)
  assert.deepEqual(
    fvarAxes(tables.get("fvar")).map((axis) => [axis.tag, axis.min, axis.max]),
    [
      ["MONO", 0, 1],
      ["wght", 300, 1000],
    ]
  )
  assert.deepEqual(layoutFeatureTags(tables.get("GSUB")), ["rvrn"])
  assert.deepEqual(layoutFeatureTags(tables.get("GPOS")), ["kern"])
})

test("every character the pages use is in the file and in its unicode-range", () => {
  const need = requiredCharacters(repo)
  const bytes = readFileSync(join(root, "src/fonts/recursive.woff2"))
  const have = cmapCodepoints(readTables(bytes).get("cmap"))
  const claimed = parseUnicodeRange(code("src/fonts/recursive.css"))
  const missing = [...need].filter((cp) => !have.has(cp))
  const extra = [...have].filter((cp) => !need.has(cp))
  assert.equal(missing.length, 0, `missing from the file: ${listed(missing)}`)
  assert.equal(extra.length, 0, `in the file but not in the character set: ${listed(extra)}`)
  const unclaimed = [...need].filter((cp) => !claimed.has(cp))
  const overclaimed = [...claimed].filter((cp) => !need.has(cp))
  assert.equal(unclaimed.length, 0, `missing from unicode-range: ${listed(unclaimed)}`)
  assert.equal(
    overclaimed.length,
    0,
    `unicode-range claims a character the set does not: ${listed(overclaimed)}`
  )
})
