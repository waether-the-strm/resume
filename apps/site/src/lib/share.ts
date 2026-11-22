import type { Locale } from "../i18n/locales"

/**
 * The share card. 1200×630 is the size issue #144 asks for, the usual Open Graph
 * large image. It is not a measurement and not a number from the prototype.
 * `tests/share-image.ts` draws `public/share/<locale>.png` at this size, from the
 * finished home page in the light theme. One file per launched language.
 */
export const shareWidth = 1200
export const shareHeight = 630

/** Norwegian has no image of its own until that language is launched. */
export function shareLocale(locale: Locale): "en" | "pl" {
  return locale === "pl" ? "pl" : "en"
}

export function shareImagePath(locale: Locale): string {
  return `/share/${shareLocale(locale)}.png`
}
