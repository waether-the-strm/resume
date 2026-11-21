import { launched, localePath, type Locale } from "../i18n/locales.ts"

/**
 * The unprefixed path of the only page that sets `font-style: italic`.
 * That page is Cv.astro. Locale URLs come from the locales passed in, which
 * default to the launched ones, so components do not each keep a list.
 */
export const italicPage = "/cv"

export function pageUsesItalics(pathname: string, locales: readonly Locale[] = launched): boolean {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
  return locales.some((locale) => localePath(locale, italicPage) === path)
}
