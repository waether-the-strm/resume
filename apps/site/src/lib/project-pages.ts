// Which project slugs become a page. A page exists only when that project has a
// Markdown body. English is the source: a missing locale uses the English body
// and is reported. A draft body is included only when the caller asks, which is
// how dev can show a placeholder the production build leaves out.
import { defaultLocale, locales, type Locale } from "../i18n/locales.ts"

export interface BodyRef {
  /** Collection id, `en/letsreg-sign-in`. */
  id: string
  draft: boolean
  /** Markdown source. Blank means the file is not a body. */
  text: string
}

export interface ResolvedPage {
  slug: string
  /** Id of the body entry that supplies the words. */
  bodyId: string
  bodyLocale: Locale
  /** True when the body is English standing in for a missing locale. */
  fallback: boolean
}

export interface ResolveOptions {
  /** Dev includes drafts. The production build does not. */
  includeDrafts: boolean
}

const localeSet = new Set<string>(locales)

function isLocale(value: string): value is Locale {
  return localeSet.has(value)
}

/** The id of a body file: the locale, a slash, the project slug. */
export function bodyId(locale: Locale, slug: string): string {
  return `${locale}/${slug}`
}

/** What `reportFallback` is asked to print for a missing body. */
export function bodyFallbackWhat(slug: string): string {
  return `projects/${slug} body`
}

function parseBody(id: string): { locale: Locale; slug: string } | undefined {
  const slash = id.indexOf("/")
  if (slash <= 0) return undefined
  const locale = id.slice(0, slash)
  const slug = id.slice(slash + 1)
  if (!slug || !isLocale(locale)) return undefined
  return { locale, slug }
}

/**
 * Pages for one locale, in the order of `projectSlugs`. A slug with no usable
 * body is absent. The route those pages use is `/work/<slug>` under `pages/work`.
 */
export function resolveProjectPages(
  locale: Locale,
  projectSlugs: readonly string[],
  bodies: readonly BodyRef[],
  options: ResolveOptions
): ResolvedPage[] {
  const usable = new Map<string, BodyRef>()
  for (const body of bodies) {
    if (!body.text.trim()) continue
    if (body.draft && !options.includeDrafts) continue
    const parsed = parseBody(body.id)
    if (!parsed) continue
    usable.set(body.id, body)
  }

  const pages: ResolvedPage[] = []
  for (const slug of projectSlugs) {
    const own = usable.get(bodyId(locale, slug))
    if (own) {
      pages.push({ slug, bodyId: own.id, bodyLocale: locale, fallback: false })
      continue
    }
    if (locale === defaultLocale) continue
    const english = usable.get(bodyId(defaultLocale, slug))
    if (!english) continue
    pages.push({
      slug,
      bodyId: english.id,
      bodyLocale: defaultLocale,
      fallback: true,
    })
  }
  return pages
}

/** Path of a project page without the locale prefix. English lives at this path. */
export function projectPagePath(slug: string): string {
  return `/work/${slug}`
}
