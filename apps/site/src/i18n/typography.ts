// Typography per locale, applied at build time. Content files hold plain text: no entities,
// no hand-placed non-breaking spaces.
import type { Locale } from "./locales"

const NBSP = " "

/** Polish: a one-letter word never ends a line, so it is tied to the word after it. */
function polish(text: string): string {
  return text.replace(/(^|[\s(„"])([aiouwzAIOUWZ])\s+(?=\S)/g, `$1$2${NBSP}`)
}

/** English: the pronoun "I" stays with the word after it. */
function english(text: string): string {
  return text.replace(/(^|\s)I\s+(?=\S)/g, `$1I${NBSP}`)
}

export function typeset(text: string, locale: Locale): string {
  if (locale === "pl") return polish(text)
  if (locale === "en") return english(text)
  return text
}
