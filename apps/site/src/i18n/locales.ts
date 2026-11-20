// Three languages in the structure; two are launched. Norwegian follows after v2.0.0.
export const locales = ["en", "pl", "no"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"
export const launched: readonly Locale[] = ["en", "pl"]

export const localeNames: Record<Locale, string> = {
  en: "English",
  pl: "Polski",
  no: "Norsk",
}

/** The path of a page in a locale. English lives at the root. */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`
  return locale === defaultLocale ? clean : `/${locale}${clean === "/" ? "/" : clean}`
}
