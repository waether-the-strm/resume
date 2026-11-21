// Typography for HTML that Markdown has already rendered. `typeset` inserts a
// non-breaking space; doing it on the text between tags leaves the markup alone.
// Code is left as written. The Markdown renderer does not put `>` inside an attribute.
import type { Locale } from "../i18n/locales.ts"
import { typeset } from "../i18n/typography.ts"

const SKIP = new Set(["code", "pre", "script", "style"])

export function typesetHtml(html: string, locale: Locale): string {
  let out = ""
  let i = 0
  const stack: string[] = []
  while (i < html.length) {
    const lt = html.indexOf("<", i)
    if (lt === -1) {
      out += apply(html.slice(i), stack, locale)
      break
    }
    out += apply(html.slice(i, lt), stack, locale)
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4)
      const close = end === -1 ? html.length : end + 3
      out += html.slice(lt, close)
      i = close
      continue
    }
    const gt = html.indexOf(">", lt + 1)
    if (gt === -1) {
      out += html.slice(lt)
      break
    }
    const tag = html.slice(lt, gt + 1)
    out += tag
    const name = /^<\/?\s*([A-Za-z][\w:-]*)/.exec(tag)?.[1]?.toLowerCase()
    if (name) updateStack(stack, name, tag)
    i = gt + 1
  }
  return out
}

function apply(text: string, stack: readonly string[], locale: Locale): string {
  if (stack.some((name) => SKIP.has(name))) return text
  return typeset(text, locale)
}

function updateStack(stack: string[], name: string, tag: string) {
  if (tag.startsWith("</")) {
    const at = stack.lastIndexOf(name)
    if (at !== -1) stack.splice(at)
    return
  }
  if (tag.endsWith("/>")) return
  stack.push(name)
}
