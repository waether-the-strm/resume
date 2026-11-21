// The line a build prints when a locale is missing and English is used instead.
// One place, so a test can lock the wording the build log shows.
import { defaultLocale, type Locale } from "./locales.ts"

export function fallbackWarning(what: string, locale: Locale): string {
  return `[i18n] ${what}: no "${locale}" entry, falling back to "${defaultLocale}"`
}
