// Reading content by locale. A missing translation falls back to English, and says so in the
// build output: a fallback is never silent.
import { getCollection, getEntry, type CollectionEntry } from "astro:content"
import { defaultLocale, type Locale } from "./locales"

const reported = new Set<string>()
function reportFallback(what: string, locale: Locale) {
  const key = `${what}:${locale}`
  if (reported.has(key)) return
  reported.add(key)
  console.warn(`[i18n] ${what}: no "${locale}" entry, falling back to "${defaultLocale}"`)
}

/** A collection with one entry per locale (message, card). */
export async function single<C extends "message" | "card">(
  collection: C,
  locale: Locale
): Promise<CollectionEntry<C>["data"]> {
  const own = await getEntry(collection, locale)
  if (own) return own.data
  reportFallback(collection, locale)
  const fallback = await getEntry(collection, defaultLocale)
  if (!fallback) throw new Error(`Content missing: ${collection}/${defaultLocale}`)
  return fallback.data
}

/** A collection with many entries per locale, stored as <locale>/<slug> (projects). */
export async function many<C extends "projects">(
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
