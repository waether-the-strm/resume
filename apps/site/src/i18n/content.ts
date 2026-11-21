// Reading content by locale. A missing translation falls back to English, and says so in the
// build output: a fallback is never silent.
import { getCollection, getEntry, type CollectionEntry } from "astro:content"
import { nameStops } from "../lib/narrative"
import {
  bodyFallbackWhat,
  projectPagePath,
  resolveProjectPages,
  type BodyRef,
  type ResolvedPage,
} from "../lib/project-pages.ts"
import { fallbackWarning } from "./fallback.ts"
import { defaultLocale, launched, localePath, type Locale } from "./locales"

/** Collections with one entry per locale. */
type Single = "message" | "card" | "cv" | "equation" | "guide" | "stops"

const reported = new Set<string>()
function reportFallback(what: string, locale: Locale) {
  const key = `${what}:${locale}`
  if (reported.has(key)) return
  reported.add(key)
  console.warn(fallbackWarning(what, locale))
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

/** The stops whose names are notation, and so the same in every language. */
const notationStops = ["start", "what", "why", "who"] as const

/**
 * Everything the narrative says and where its stops are, for one locale: the equation, the
 * guide, the track with a name on every stop, and the structure scene's notes on each block.
 * The track, the notes and the notation (the four questions, `how`, the first stop's title)
 * are the same in every language; a stop named by notation says so, and the page marks it as
 * English. Throws when the words of the stops and the track disagree, or when a locale tries
 * to name a stop that notation names, so a translation cannot replace notation.
 */
export async function narrative(locale: Locale) {
  const [answers, guide, words, notation, track, structure] = await Promise.all([
    single("equation", locale),
    single("guide", locale),
    singleWithLocale("stops", locale),
    getEntry("notation", "main"),
    getEntry("track", "main"),
    getEntry("structure", "main"),
  ])
  if (!notation) throw new Error("Content missing: notation/main")
  if (!track) throw new Error("Content missing: track/main")
  if (!structure) throw new Error("Content missing: structure/main")

  const sign = notation.data
  const where = `stops/${words.locale}`
  const translated = notationStops.filter((id) => id in words.data.names)
  if (translated.length > 0) {
    throw new Error(
      `${where}: ${translated.join(", ")} are notation (notation/main.yaml) and are not named per locale.`
    )
  }
  const names = { ...words.data.names, ...sign.questions, start: sign.start }
  const isNotation = new Set<string>(notationStops)

  return {
    equation: {
      questions: (["what", "why", "who"] as const).map((id) => ({
        id,
        question: sign.questions[id],
        answer: answers.answers[id],
      })),
      how: { question: sign.how, answer: answers.how },
    },
    guide: { ...guide, label: sign.label },
    weights: track.data.weights,
    stops: nameStops(track.data.stops, { names, rail: words.data.rail }, where).map((stop) => ({
      ...stop,
      notation: isNotation.has(stop.id),
    })),
    after: words.data.after,
    blocks: structure.data.blocks,
  }
}

// A draft body is how a placeholder can prove the template without shipping.
// Dev renders it. `astro build` does not, so the production site has no such page.
function includeDrafts(): boolean {
  return !import.meta.env.PROD
}

/** Project pages for a locale. Missing bodies are absent. A missing translation falls back. */
export async function projectPages(locale: Locale): Promise<ResolvedPage[]> {
  const projects = await many("projects", locale)
  const bodies = await getCollection("projectBodies")
  const refs: BodyRef[] = bodies.map((entry) => ({
    id: entry.id,
    draft: entry.data.draft,
    text: entry.body ?? "",
  }))
  const pages = resolveProjectPages(
    locale,
    projects.map((project) => project.slug),
    refs,
    { includeDrafts: includeDrafts() }
  )
  for (const page of pages) {
    if (page.fallback) reportFallback(bodyFallbackWhat(page.slug), locale)
  }
  return pages
}

/** Where a project card or a CV row should link, when that project has a page. */
export async function projectHrefs(locale: Locale): Promise<Map<string, string>> {
  const pages = await projectPages(locale)
  return new Map(pages.map((page) => [page.slug, localePath(locale, projectPagePath(page.slug))]))
}

export interface LoadedProjectPage {
  slug: string
  data: CollectionEntry<"projects">["data"]
  /** Locale the title and the summary came from. */
  dataLocale: Locale
  /** Locale the article came from. English when this locale has no body. */
  bodyLocale: Locale
  entry: CollectionEntry<"projectBodies">
  /** Launched locales that have this page, so the switcher never links to a missing one. */
  locales: readonly Locale[]
}

/** One project page, or nothing when the slug has no body in this build. */
export async function projectPage(
  locale: Locale,
  slug: string
): Promise<LoadedProjectPage | undefined> {
  const pages = await projectPages(locale)
  const found = pages.find((page) => page.slug === slug)
  if (!found) return undefined
  const projects = await many("projects", locale)
  const project = projects.find((entry) => entry.slug === slug)
  const entry = await getEntry("projectBodies", found.bodyId)
  if (!project || !entry) return undefined
  const ownData = await getEntry("projects", `${locale}/${slug}`)
  const locales: Locale[] = []
  for (const other of launched) {
    const list = other === locale ? pages : await projectPages(other)
    if (list.some((page) => page.slug === slug)) locales.push(other)
  }
  return {
    slug,
    data: project.data,
    dataLocale: ownData ? locale : defaultLocale,
    bodyLocale: found.bodyLocale,
    entry,
    locales,
  }
}
