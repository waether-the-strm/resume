// Reading content by locale. A missing translation falls back to English, and says so in the
// build output: a fallback is never silent.
import { getCollection, getEntry, type CollectionEntry } from "astro:content"
import { nameStops } from "../lib/narrative"
import { defaultLocale, type Locale } from "./locales"

/** Collections with one entry per locale. */
type Single = "message" | "card" | "cv" | "equation" | "guide" | "stops"

const reported = new Set<string>()
function reportFallback(what: string, locale: Locale) {
  const key = `${what}:${locale}`
  if (reported.has(key)) return
  reported.add(key)
  console.warn(`[i18n] ${what}: no "${locale}" entry, falling back to "${defaultLocale}"`)
}

/** A collection with one entry per locale, and the locale the words came from. */
export async function singleWithLocale<C extends Single>(
  collection: C,
  locale: Locale
): Promise<{ data: CollectionEntry<C>["data"]; locale: Locale }> {
  const own = await getEntry(collection, locale)
  if (own) return { data: own.data, locale }
  reportFallback(collection, locale)
  const fallback = await getEntry(collection, defaultLocale)
  if (!fallback) throw new Error(`Content missing: ${collection}/${defaultLocale}`)
  return { data: fallback.data, locale: defaultLocale }
}

/** A collection with one entry per locale (message, card, cv, equation, guide, stops). */
export async function single<C extends Single>(
  collection: C,
  locale: Locale
): Promise<CollectionEntry<C>["data"]> {
  return (await singleWithLocale(collection, locale)).data
}

/** A collection with many entries per locale, stored as <locale>/<slug>. */
export async function many<C extends "projects" | "experience" | "education" | "skills">(
  collection: C,
  locale: Locale
): Promise<{ slug: string; data: CollectionEntry<C>["data"] }[]> {
  const all = await getCollection(collection)
  const of = (wanted: Locale) =>
    new Map(
      all
        .filter((entry) => entry.id.startsWith(`${wanted}/`))
        .map((entry) => [entry.id.slice(wanted.length + 1), entry.data] as const)
    )
  const source = of(defaultLocale)
  const own = locale === defaultLocale ? source : of(locale)
  return [...source.keys()].map((slug) => {
    const data = own.get(slug)
    if (data) return { slug, data }
    reportFallback(`${collection}/${slug}`, locale)
    return { slug, data: source.get(slug)! }
  })
}

/**
 * Everything the narrative says and where its stops are, for one locale: the equation, the
 * guide, the track with a name on every stop, and the structure scene's notes on each block.
 * The track and the notes are the same in every language. Throws when the words of the stops
 * and the track disagree, so a renamed stop cannot ship half-done.
 */
export async function narrative(locale: Locale) {
  const [equation, guide, words, track, structure] = await Promise.all([
    single("equation", locale),
    single("guide", locale),
    singleWithLocale("stops", locale),
    getEntry("track", "main"),
    getEntry("structure", "main"),
  ])
  if (!track) throw new Error("Content missing: track/main")
  if (!structure) throw new Error("Content missing: structure/main")
  return {
    equation,
    guide,
    weights: track.data.weights,
    stops: nameStops(track.data.stops, words.data, `stops/${words.locale}`),
    after: words.data.after,
    blocks: structure.data.blocks,
  }
}
