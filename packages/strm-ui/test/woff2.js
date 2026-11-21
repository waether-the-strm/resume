// Enough of a WOFF2 reader to check the shipped Recursive file: which characters
// it maps, which axes it keeps, and which layout features it still has.
// Transformed glyf and loca tables are skipped; cmap, fvar, GSUB and GPOS are not.
import { brotliDecompressSync } from "node:zlib"

const KNOWN_TAGS = [
  "cmap",
  "head",
  "hhea",
  "hmtx",
  "maxp",
  "name",
  "OS/2",
  "post",
  "cvt ",
  "fpgm",
  "glyf",
  "loca",
  "prep",
  "CFF ",
  "VORG",
  "EBDT",
  "EBLC",
  "gasp",
  "hdmx",
  "kern",
  "LTSH",
  "PCLT",
  "VDMX",
  "vhea",
  "vmtx",
  "BASE",
  "GDEF",
  "GPOS",
  "GSUB",
  "EBSC",
  "JSTF",
  "MATH",
  "CBDT",
  "CBLC",
  "COLR",
  "CPAL",
  "SVG ",
  "sbix",
  "acnt",
  "avar",
  "bdat",
  "bloc",
  "bsln",
  "cvar",
  "fdsc",
  "feat",
  "fmtx",
  "fvar",
  "gvar",
  "hsty",
  "just",
  "lcar",
  "mort",
  "morx",
  "opbd",
  "prop",
  "trak",
  "Zapf",
  "Silf",
  "Glat",
  "Gloc",
  "Feat",
  "Sill",
]

if (KNOWN_TAGS.length !== 63) throw new Error("WOFF2 known-tag table must have 63 entries")

function readBase128(bytes, pos) {
  let result = 0
  for (let i = 0; i < 5; i++) {
    if (pos >= bytes.length) throw new Error("truncated base128")
    const byte = bytes[pos++]
    result = result * 128 + (byte & 0x7f)
    if ((byte & 0x80) === 0) return [result, pos]
  }
  throw new Error("base128 longer than 5 bytes")
}

function tagAt(bytes, pos) {
  return String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3])
}

export function readTables(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  if (tagAt(bytes, 0) !== "wOF2") throw new Error("not a woff2 file")
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const numTables = view.getUint16(12)
  const totalCompressedSize = view.getUint32(20)
  let pos = 48
  const tables = []
  for (let i = 0; i < numTables; i++) {
    const flags = bytes[pos++]
    const index = flags & 0x3f
    const version = flags >> 6
    let tag
    if (index === 63) {
      tag = tagAt(bytes, pos)
      pos += 4
    } else tag = KNOWN_TAGS[index]
    let origLength
    ;[origLength, pos] = readBase128(bytes, pos)
    const transformed = tag === "glyf" || tag === "loca" ? version !== 3 : version !== 0
    let length = origLength
    if (transformed) [length, pos] = readBase128(bytes, pos)
    tables.push({ tag, length, transformed })
  }
  const compressed = bytes.subarray(pos, pos + totalCompressedSize)
  const data = brotliDecompressSync(compressed)
  const out = new Map()
  let offset = 0
  for (const table of tables) {
    if (!table.transformed) out.set(table.tag, data.subarray(offset, offset + table.length))
    offset += table.length
  }
  if (offset !== data.length)
    throw new Error(`table sizes add up to ${offset}, brotli produced ${data.length}`)
  return out
}

function viewOf(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

export function cmapCodepoints(bytes) {
  const view = viewOf(bytes)
  const numTables = view.getUint16(2)
  const found = new Set()
  for (let i = 0; i < numTables; i++) {
    const rec = 4 + i * 8
    const platform = view.getUint16(rec)
    const encoding = view.getUint16(rec + 2)
    const offset = view.getUint32(rec + 4)
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))
    if (!unicode) continue
    const format = view.getUint16(offset)
    if (format === 4) readFormat4(view, offset, found)
    else if (format === 12) readFormat12(view, offset, found)
    else throw new Error(`unsupported cmap format ${format}`)
  }
  return found
}

function readFormat4(view, offset, found) {
  const segCount = view.getUint16(offset + 6) / 2
  const readList = (at, count) => {
    const list = []
    for (let i = 0; i < count; i++) list.push(view.getUint16(at + i * 2))
    return list
  }
  const endCode = readList(offset + 14, segCount)
  const startCode = readList(offset + 16 + segCount * 2, segCount)
  const idDelta = readList(offset + 16 + segCount * 4, segCount)
  const idRangeOffset = readList(offset + 16 + segCount * 6, segCount)
  const glyphStart = offset + 16 + segCount * 8
  const glyphCount = (offset + view.getUint16(offset + 2) - glyphStart) / 2
  const glyphIndexArray = readList(glyphStart, glyphCount)
  // The last segment is the 0xFFFF sentinel. Same walk as fontTools.
  for (let i = 0; i < segCount - 1; i++) {
    const delta = idDelta[i]
    const rangeOffset = idRangeOffset[i]
    const partial = rangeOffset / 2 - startCode[i] + i - segCount
    for (let code = startCode[i]; code <= endCode[i]; code++) {
      let gid
      if (rangeOffset === 0) gid = (code + delta) & 0xffff
      else {
        const glyph = glyphIndexArray[code + partial]
        gid = glyph === 0 ? 0 : (glyph + delta) & 0xffff
      }
      if (gid !== 0) found.add(code)
    }
  }
}

function readFormat12(view, offset, found) {
  const groups = view.getUint32(offset + 12)
  let pos = offset + 16
  for (let i = 0; i < groups; i++) {
    const start = view.getUint32(pos)
    const end = view.getUint32(pos + 4)
    const glyph = view.getUint32(pos + 8)
    pos += 12
    for (let code = start; code <= end; code++) {
      if (glyph + (code - start) !== 0) found.add(code)
    }
  }
}

export function fvarAxes(bytes) {
  const view = viewOf(bytes)
  const axesOffset = view.getUint16(4)
  const count = view.getUint16(8)
  const size = view.getUint16(10)
  const axes = []
  for (let i = 0; i < count; i++) {
    const pos = axesOffset + i * size
    axes.push({
      tag: tagAt(bytes, pos),
      min: view.getInt32(pos + 4) / 65536,
      default: view.getInt32(pos + 8) / 65536,
      max: view.getInt32(pos + 12) / 65536,
    })
  }
  return axes
}

export function layoutFeatureTags(bytes) {
  const view = viewOf(bytes)
  // GSUB/GPOS header: version, scriptList, featureList, lookupList.
  const list = view.getUint16(6)
  const count = view.getUint16(list)
  const tags = []
  for (let i = 0; i < count; i++) tags.push(tagAt(bytes, list + 2 + i * 6))
  return tags
}
