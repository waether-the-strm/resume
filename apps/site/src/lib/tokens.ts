// Reads strm-ui's token CSS at build time, so the documentation shows the values the product
// actually uses (ADR 0003: the CSS is the source; ADR 0005: the docs render from it).

export type Scheme = "light" | "dark"

/** Every `--name: value;` in the CSS. The first definition of a name wins. */
export function parseTokens(...sources: string[]): Map<string, string> {
  const tokens = new Map<string, string>()
  for (const source of sources) {
    const css = source.replace(/\/\*[\s\S]*?\*\//g, "")
    for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      const [, name, value] = match
      if (name && value && !tokens.has(name)) tokens.set(name, value.trim().replace(/\s+/g, " "))
    }
  }
  return tokens
}

/** Splits `a, b` at the top-level comma, ignoring commas inside nested functions. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ""
  for (const char of input) {
    if (char === "(") depth++
    if (char === ")") depth--
    if (char === "," && depth === 0) {
      parts.push(current.trim())
      current = ""
    } else current += char
  }
  parts.push(current.trim())
  return parts
}

/** Finds the first call of `fn(` and returns its span and inner text, honouring nesting. */
function findCall(value: string, fn: string): { start: number; end: number; inner: string } | null {
  const start = value.indexOf(`${fn}(`)
  if (start === -1) return null
  let depth = 0
  for (let i = start + fn.length; i < value.length; i++) {
    if (value[i] === "(") depth++
    if (value[i] === ")") {
      depth--
      if (depth === 0) return { start, end: i + 1, inner: value.slice(start + fn.length + 1, i) }
    }
  }
  return null
}

/** Resolves var() and light-dark() down to a plain value for one colour scheme. */
export function resolve(value: string, tokens: Map<string, string>, scheme: Scheme): string {
  let out = value
  for (let guard = 0; guard < 50; guard++) {
    const ld = findCall(out, "light-dark")
    if (ld) {
      const [light = "", dark = ""] = splitTopLevel(ld.inner)
      out = out.slice(0, ld.start) + (scheme === "light" ? light : dark) + out.slice(ld.end)
      continue
    }
    const ref = findCall(out, "var")
    if (ref) {
      const [name = "", fallback = ""] = splitTopLevel(ref.inner)
      out = out.slice(0, ref.start) + (tokens.get(name) ?? fallback) + out.slice(ref.end)
      continue
    }
    break
  }
  return out
}

function luminance(hex: string): number {
  const channels = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio of two #rrggbb colours, or null when either is not a plain hex. */
export function contrast(a: string, b: string): number | null {
  const hex = /^#[0-9a-f]{6}$/i
  if (!hex.test(a) || !hex.test(b)) return null
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
