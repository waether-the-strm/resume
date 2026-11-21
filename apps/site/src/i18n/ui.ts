// Interface strings. English is the source: its shape is the type every other locale must
// satisfy, so a missing key is a type error and fails the build.
import type { Locale } from "./locales"

const en = {
  "site.title": "Jan Mirecki, design engineer",
  "site.description":
    "Jan Mirecki, design engineer in Oslo. 15 years designing for the web, 11 years building it.",
  "nav.skip": "Skip to the card",
  "nav.paths": "Ways in",
  "nav.language": "Language",
  "work.heading": "Selected work",
  // CV chrome. The page is not translated: /pl/cv reuses these English strings.
  "cv.nav": "Page",
  "cv.back": "← Back",
  "cv.download": "Download PDF",
  "cv.live": "live",
}

export type UiKey = keyof typeof en

const pl: Record<UiKey, string> = {
  "site.title": "Jan Mirecki, design engineer",
  "site.description":
    "Jan Mirecki, design engineer z Oslo. 15 lat projektowania dla sieci, 11 lat jej budowania.",
  "nav.skip": "Przejdź do wizytówki",
  "nav.paths": "Wejścia",
  "nav.language": "Język",
  "work.heading": "Wybrane prace",
  // Untranslated: the CV page falls back to English.
  "cv.nav": "Page",
  "cv.back": "← Back",
  "cv.download": "Download PDF",
  "cv.live": "live",
}

// Not launched: Norwegian reuses English until its copy is written. Listed here on purpose,
// so the fallback is visible in the source and not silent.
const dictionaries: Record<Locale, Record<UiKey, string>> = { en, pl, no: en }

export function t(locale: Locale, key: UiKey): string {
  return dictionaries[locale][key]
}
