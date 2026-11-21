// The Recursive files: MONO and wght on the upright face, the same characters
// on the italic face, and an upper bound on each size. Adding a character
// under apps/site/src or packages/strm-ui/src fails the character test until
// the files are rebuilt with src/fonts/subset.mjs.
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { requiredCharacters } from "../src/fonts/subset.mjs"
import {
  advanceWidth,
  cmapCodepoints,
  fvarAxes,
  glyphId,
  layoutFeatureTags,
  readTables,
} from "./woff2.js"

const root = join(import.meta.dirname, "..")
const repo = join(root, "../..")
const read = (file) => readFileSync(join(root, file), "utf8")
const code = (file) => read(file).replace(/\/\*[\s\S]*?\*\//g, "")

// The committed upright file is about 49 KB. The bound leaves room for a
// regeneration and still rejects the previous 300 KB files.
const MAX_BYTES = 80_000

// The italic file, mono voice only, is about 47 KB. Keeping the MONO axis
// measured 63 KB. 60 KB leaves room for a regeneration and rejects that file.
const MAX_ITALIC_BYTES = 60_000

function parseUnicodeRange(text) {
  const found = new Set()
  for (const match of text.matchAll(/U\+([0-9A-Fa-f]{1,6})(?:-([0-9A-Fa-f]{1,6}))?/g)) {
    const start = Number.parseInt(match[1], 16)
    const end = match[2] ? Number.parseInt(match[2], 16) : start
    for (let cp = start; cp <= end; cp++) found.add(cp)
  }
  return found
}

function unicodeRanges(css) {
  const ranges = [...css.matchAll(/unicode-range:\s*([^;]+);/g)]
  assert.equal(ranges.length, 2, "the upright face and the italic face each declare a range")
  return ranges.map((range) => parseUnicodeRange(range[1]))
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

test("the page offers an upright file and an italic file, and preloads only the upright one", () => {
  const index = code("src/index.css")
  const css = code("src/fonts/recursive.css")
  const fonts = readdirSync(join(root, "src/fonts"))
    .filter((name) => name.endsWith(".woff2"))
    .sort()
  assert.match(index, /fonts\/recursive\.css/)
  assert.doesNotMatch(index, /fontsource/)
  assert.deepEqual(fonts, ["recursive-italic.woff2", "recursive.woff2"])
  assert.match(css, /font-style:\s*normal[\s\S]*?url\("\.\/recursive\.woff2"\)/)
  assert.match(css, /font-style:\s*italic[\s\S]*?url\("\.\/recursive-italic\.woff2"\)/)
  assert.doesNotMatch(css, /recursive-latin|fontsource|cyrillic|vietnamese/i)
  assert.match(css, /font-family:\s*"Recursive Variable"/)
  assert.match(css, /font-weight:\s*300 1000/)
  assert.match(css, /font-display:\s*swap/)
  assert.match(css, /size-adjust:/)
  assert.match(code("src/base.css"), /font-synthesis:\s*none/)
  const layout = readFileSync(join(repo, "apps/site/src/layouts/Base.astro"), "utf8")
  assert.match(layout, /rel="preload"/)
  assert.match(layout, /recursive\.woff2/)
  assert.doesNotMatch(layout, /recursive-italic/)
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
  const missing = [...need].filter((cp) => !have.has(cp))
  const extra = [...have].filter((cp) => !need.has(cp))
  assert.equal(missing.length, 0, `missing from the file: ${listed(missing)}`)
  assert.equal(extra.length, 0, `in the file but not in the character set: ${listed(extra)}`)
  for (const claimed of unicodeRanges(code("src/fonts/recursive.css"))) {
    const unclaimed = [...need].filter((cp) => !claimed.has(cp))
    const overclaimed = [...claimed].filter((cp) => !need.has(cp))
    assert.equal(unclaimed.length, 0, `missing from unicode-range: ${listed(unclaimed)}`)
    assert.equal(
      overclaimed.length,
      0,
      `unicode-range claims a character the set does not: ${listed(overclaimed)}`
    )
  }
})

test("the italic file has every character of the upright file, is the mono voice, and stays under the size bound", () => {
  const upright = readTables(readFileSync(join(root, "src/fonts/recursive.woff2")))
  const italicBytes = readFileSync(join(root, "src/fonts/recursive-italic.woff2"))
  assert.equal(italicBytes.subarray(0, 4).toString(), "wOF2")
  const size = statSync(join(root, "src/fonts/recursive-italic.woff2")).size
  assert.ok(size < MAX_ITALIC_BYTES, `italic subset is ${size} bytes`)
  const italic = readTables(italicBytes)
  const uprightChars = cmapCodepoints(upright.get("cmap"))
  const italicChars = cmapCodepoints(italic.get("cmap"))
  const missing = [...uprightChars].filter((cp) => !italicChars.has(cp))
  const extra = [...italicChars].filter((cp) => !uprightChars.has(cp))
  assert.equal(missing.length, 0, `missing from the italic file: ${listed(missing)}`)
  assert.equal(extra.length, 0, `in the italic file but not the upright one: ${listed(extra)}`)
  assert.deepEqual(
    fvarAxes(italic.get("fvar")).map((axis) => [axis.tag, axis.min, axis.max]),
    [["wght", 300, 1000]]
  )
  assert.deepEqual(layoutFeatureTags(italic.get("GSUB")), ["rvrn"])
  assert.deepEqual(layoutFeatureTags(italic.get("GPOS")), ["kern"])
  const widths = ["i", "m", "W"].map((ch) =>
    advanceWidth(
      italic.get("hmtx"),
      italic.get("hhea"),
      glyphId(italic.get("cmap"), ch.codePointAt(0))
    )
  )
  assert.equal(
    new Set(widths).size,
    1,
    `italic advances are not one mono width: ${widths.join(", ")}`
  )
})
