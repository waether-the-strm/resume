// The Recursive subset: latin and latin-ext, without the cursive axis or the
// scripts the page does not use. Sizes are the shipped files, so a return to
// the full fontsource files fails here.
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const read = (file) => readFileSync(join(root, file), "utf8")
const code = (file) => read(file).replace(/\/\*[\s\S]*?\*\//g, "")

test("the page loads the Recursive subset, not the full fontsource file", () => {
  const index = code("src/index.css")
  const css = code("src/fonts/recursive.css")
  assert.match(index, /fonts\/recursive\.css/)
  assert.doesNotMatch(index, /fontsource/)
  assert.match(css, /recursive-latin\.woff2/)
  assert.match(css, /recursive-latin-ext\.woff2/)
  assert.match(css, /font-display:\s*swap/)
  assert.match(css, /size-adjust:/)
  assert.doesNotMatch(css, /cyrillic|vietnamese|CRSV/i)
})

test("the family name stays Recursive Variable, with the metric fallback beside it", () => {
  const primitives = code("src/tokens/primitives.css")
  assert.match(
    primitives,
    /--p-font-recursive:\s*"Recursive Variable",\s*"Recursive Fallback",\s*ui-monospace,\s*system-ui,\s*sans-serif;/
  )
})

test("shipped Recursive files are the subset, and smaller than the full files", () => {
  const latin = join(root, "src/fonts/recursive-latin.woff2")
  const ext = join(root, "src/fonts/recursive-latin-ext.woff2")
  assert.equal(readFileSync(latin).subarray(0, 4).toString(), "wOF2")
  assert.equal(readFileSync(ext).subarray(0, 4).toString(), "wOF2")
  // @fontsource-variable/recursive 5.3.0 full files: latin 304988, latin-ext 310024.
  const latinSize = statSync(latin).size
  const extSize = statSync(ext).size
  assert.equal(latinSize, 304344)
  assert.equal(extSize, 308816)
  assert.ok(latinSize < 304988)
  assert.ok(extSize < 310024)
})
