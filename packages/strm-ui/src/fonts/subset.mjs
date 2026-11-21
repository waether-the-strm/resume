// Characters for the one Recursive file, read from the source, plus the letters
// English, Polish and Norwegian need and a margin of ordinary punctuation.
//
//   node packages/strm-ui/src/fonts/subset.mjs
//   node packages/strm-ui/src/fonts/subset.mjs --build path/to/Recursive[CASL,CRSV,MONO,slnt,wght].ttf
//   node packages/strm-ui/src/fonts/subset.mjs --fetch
//
// --fetch downloads Recursive 1.085 from the pinned Google Fonts commit (the same
// outlines as @fontsource-variable/recursive 5.3.0) and builds
// src/fonts/recursive.woff2. Building needs Python and fonttools 4.68.0 with WOFF
// support: pip install 'fonttools[woff]==4.68.0'. Set PYTHON if python3 has no
// fonttools. The committed file is what the site serves; this script is how to
// rebuild it when the source gains a character.
import { spawnSync } from "node:child_process"
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))

// Pinned file: google/fonts ofl/recursive, commit that records Recursive 1.085.
export const SOURCE_URL =
  "https://github.com/google/fonts/raw/3f9e79e3200d8a22a785491f8eca87fc0af073a8/ofl/recursive/Recursive%5BCASL%2CCRSV%2CMONO%2Cslnt%2Cwght%5D.ttf"
export const SOURCE_VERSION = "1.085"
export const FONTOOLS_VERSION = "4.68.0"

export const SOURCE_ROOTS = ["apps/site/src", "packages/strm-ui/src"]

// Both cases. text-transform: uppercase is used, and the source mostly has the
// lowercase Polish letters.
export const POLISH = "ĄĆĘŁŃÓŚŹŻąćęłńóśźż"
export const NORWEGIAN = "ÆØÅæøå"

// Beyond whatever the source happens to contain today. U+2011 is in the source
// (a non-breaking hyphen) but Recursive has no glyph for it; the build maps it
// to the U+2010 hyphen, so the character is in the file.
export const PUNCTUATION_MARGIN = [
  0x00a0, // no-break space
  0x00ad, // soft hyphen
  0x00b0, // degree
  0x00b7, // middle dot
  0x00d7, // multiplication sign
  0x00ab, // left guillemet
  0x00bb, // right guillemet
  0x2010, // hyphen
  0x2011, // non-breaking hyphen
  0x2012, // figure dash
  0x2013, // en dash
  0x2014, // em dash
  0x2018, // left single quote
  0x2019, // right single quote
  0x201a, // single low-9 quote
  0x201c, // left double quote
  0x201d, // right double quote
  0x201e, // double low-9 quote
  0x2022, // bullet
  0x2026, // ellipsis
  0x2190, // left arrow
  0x2191, // up arrow
  0x2192, // right arrow
  0x2193, // down arrow
  0x2212, // minus
  0x2264, // less-than or equal; the source uses ≥, and kerning keeps the pair together
]

const NAMED_ENTITIES = {
  nbsp: 0x00a0,
  shy: 0x00ad,
  middot: 0x00b7,
  laquo: 0x00ab,
  raquo: 0x00bb,
  ndash: 0x2013,
  mdash: 0x2014,
  lsquo: 0x2018,
  rsquo: 0x2019,
  sbquo: 0x201a,
  ldquo: 0x201c,
  rdquo: 0x201d,
  bdquo: 0x201e,
  hellip: 0x2026,
  bull: 0x2022,
  times: 0x00d7,
  minus: 0x2212,
  deg: 0x00b0,
  larr: 0x2190,
  uarr: 0x2191,
  rarr: 0x2192,
  darr: 0x2193,
  ge: 0x2265,
  amp: 0x0026,
  lt: 0x003c,
  gt: 0x003e,
  quot: 0x0022,
  apos: 0x0027,
}

const SKIP_EXT = new Set([
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
])

export function repoRoot() {
  return join(here, "../../../..")
}

export function outputPath() {
  return join(here, "recursive.woff2")
}

function add(set, cp) {
  if (!Number.isInteger(cp) || cp < 0x20 || cp === 0x7f || cp > 0x10ffff) return
  set.add(cp)
}

function addText(set, text) {
  for (const ch of text) add(set, ch.codePointAt(0))
}

function addEscapes(set, text, ext) {
  for (const match of text.matchAll(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g)) {
    add(set, Number.parseInt(match[1] || match[2], 16))
  }
  for (const match of text.matchAll(/&([a-zA-Z]+);|&#x([0-9a-fA-F]+);|&#(\d+);/g)) {
    if (match[1]) add(set, NAMED_ENTITIES[match[1].toLowerCase()])
    else if (match[2]) add(set, Number.parseInt(match[2], 16))
    else add(set, Number.parseInt(match[3], 10))
  }
  const css = []
  if (ext === ".css") css.push(text)
  if (ext === ".astro") {
    for (const match of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) css.push(match[1])
  }
  for (const block of css) {
    for (const match of block.matchAll(/\\([0-9a-fA-F]{1,6})[ \t\r\n]?/g)) {
      add(set, Number.parseInt(match[1], 16))
    }
  }
}

function walk(dir, visit) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, visit)
    else visit(path)
  }
}

// Codepoints that appear in the site and design-system source. The subset
// script itself is skipped, so its comments can name a character the file
// does not ship.
export function charactersInSource(root = repoRoot()) {
  const found = new Set()
  const skip = realpathSync(fileURLToPath(import.meta.url))
  for (const rel of SOURCE_ROOTS) {
    walk(join(root, rel), (path) => {
      if (SKIP_EXT.has(extname(path))) return
      if (realpathSync(path) === skip) return
      const text = readFileSync(path, "utf8")
      addText(found, text)
      addEscapes(found, text, extname(path))
    })
  }
  return found
}

export function requiredCharacters(root = repoRoot()) {
  const found = charactersInSource(root)
  for (let cp = 0x20; cp <= 0x7e; cp++) found.add(cp)
  addText(found, POLISH)
  addText(found, NORWEGIAN)
  for (const cp of PUNCTUATION_MARGIN) found.add(cp)
  return found
}

export function formatUnicodeRange(codepoints) {
  const sorted = [...codepoints].sort((a, b) => a - b)
  const hex = (n) => n.toString(16).toUpperCase().padStart(4, "0")
  const piece = (start, end) => (start === end ? `U+${hex(start)}` : `U+${hex(start)}-${hex(end)}`)
  const parts = []
  let start = sorted[0]
  let prev = sorted[0]
  for (const cp of sorted.slice(1)) {
    if (cp === prev + 1) prev = cp
    else {
      parts.push(piece(start, prev))
      start = prev = cp
    }
  }
  if (sorted.length) parts.push(piece(start, prev))
  return parts.join(", ")
}

const BUILD = String.raw`
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.subset import Options, Subsetter

source, dest, codes_path, expect = sys.argv[1:5]
codes = [int(line, 16) for line in Path(codes_path).read_text().split() if line]
requested = [cp for cp in codes if cp != 0x2011]

font = TTFont(source)
version = ""
for rec in font["name"].names:
    if rec.nameID == 5:
        version = rec.toUnicode()
        break
if expect not in version:
    sys.exit(f"expected Recursive {expect}, name ID 5 is {version!r}")

font = instancer.instantiateVariableFont(font, {"CASL": 0, "slnt": 0, "CRSV": 0.5})
axes = [(a.axisTag, a.minValue, a.maxValue) for a in font["fvar"].axes]
if axes != [("MONO", 0.0, 1.0), ("wght", 300.0, 1000.0)]:
    sys.exit(f"unexpected axes after pinning: {axes}")

options = Options(layout_features=["rvrn", "kern"], ignore_missing_unicodes=False)
subsetter = Subsetter(options=options)
subsetter.populate(unicodes=requested)
subsetter.subset(font)

hyphen = None
for table in font["cmap"].tables:
    if table.isUnicode() and 0x2010 in table.cmap:
        hyphen = table.cmap[0x2010]
        break
if hyphen is None:
    sys.exit("U+2010 is missing, so U+2011 cannot be mapped to the hyphen")
for table in font["cmap"].tables:
    if table.isUnicode():
        table.cmap[0x2011] = hyphen

cmap = font.getBestCmap()
missing = [cp for cp in codes if cp not in cmap]
if missing:
    sys.exit("missing after subset: " + " ".join(f"U+{cp:04X}" for cp in missing))
tags = sorted({rec.FeatureTag for rec in font["GSUB"].table.FeatureList.FeatureRecord})
if tags != ["rvrn"]:
    sys.exit(f"unexpected GSUB features: {tags}")
pos = sorted({rec.FeatureTag for rec in font["GPOS"].table.FeatureList.FeatureRecord})
if pos != ["kern"]:
    sys.exit(f"unexpected GPOS features: {pos}")

font.flavor = "woff2"
font.save(dest)
print(len(cmap), Path(dest).stat().st_size)
`

function python() {
  return process.env.PYTHON || "python3"
}

function runPython(args, input) {
  const result = spawnSync(python(), args, { input, encoding: "utf8" })
  if (result.error) {
    throw new Error(
      `Could not run ${python()} (${result.error.message}). Install Python and fonttools[woff]==${FONTOOLS_VERSION}.`
    )
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "fonttools failed").trim())
  }
  return result.stdout
}

function assertFonttools() {
  let version = ""
  try {
    version = runPython(["-c", "import fontTools; print(fontTools.__version__)"]).trim()
  } catch (error) {
    throw new Error(
      `${error.message}\nInstall fonttools ${FONTOOLS_VERSION} with WOFF support: pip install 'fonttools[woff]==${FONTOOLS_VERSION}'`
    )
  }
  if (version !== FONTOOLS_VERSION) {
    process.stderr.write(
      `warning: fonttools ${version} is building the file; the committed file was built with ${FONTOOLS_VERSION}\n`
    )
  }
}

export async function fetchSource(dest) {
  const response = await fetch(SOURCE_URL)
  if (!response.ok) throw new Error(`download failed: ${response.status} ${SOURCE_URL}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, bytes)
  return dest
}

export function build(sourceFont, root = repoRoot()) {
  assertFonttools()
  const codes = [...requiredCharacters(root)].sort((a, b) => a - b)
  const list = codes.map((cp) => cp.toString(16)).join("\n")
  const dest = outputPath()
  const dir = join(tmpdir(), "strm-recursive-subset")
  mkdirSync(dir, { recursive: true })
  const codesPath = join(dir, "unicodes.txt")
  writeFileSync(codesPath, list)
  const out = runPython(["-c", BUILD, sourceFont, dest, codesPath, SOURCE_VERSION])
  return { characters: codes.length, bytes: Number(out.trim().split(/\s+/)[1]), path: dest }
}

function runningAsCli() {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

async function main() {
  const root = repoRoot()
  const codes = requiredCharacters(root)
  const [, , flag, arg] = process.argv
  if (!flag) {
    process.stdout.write(`${codes.size} characters\n${formatUnicodeRange(codes)}\n`)
    return
  }
  let source = arg
  if (flag === "--fetch")
    source = await fetchSource(join(tmpdir(), "strm-recursive-subset", "Recursive.ttf"))
  else if (flag !== "--build" || !arg) {
    throw new Error("usage: subset.mjs [--build <ttf> | --fetch]")
  }
  const built = build(source, root)
  process.stdout.write(`${built.path} ${built.bytes} bytes, ${built.characters} characters\n`)
}

if (runningAsCli()) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.exit(1)
  })
}
