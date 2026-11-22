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
  "notFound.title": "Page not found",
  "notFound.lead": "This address is not a page.",
  "notFound.home": "Back to the start",
  // CV chrome. The page is not translated: /pl/cv reuses these English strings.
  "cv.nav": "Page",
  "cv.back": "← Back",
  "cv.download": "Download PDF",
  "cv.live": "live",
  // The rail (#34). The prototype's names for the nav and the two arrows (v0.16.0).
  "rail.label": "Tour steps",
  "rail.previous": "previous stop",
  "rail.next": "next stop",
  // The blob (#35). `tldr` is the word Jan chose. The accessible name contains it and
  // says where the link goes.
  "blob.landmark": "Where you are, and a few controls",
  "blob.sound": "sound",
  "blob.on": "on",
  "blob.off": "off",
  "blob.start": "the start",
  "blob.work": "the work",
  // The settings (#127, ADR 0012): a row that unfolds a strip of three. Lower case, like
  // the rest of the blob; the footer's switch keeps its own capitalised words.
  "blob.settings": "settings",
  "blob.theme": "theme",
  "blob.theme.system": "system",
  "blob.theme.light": "light",
  "blob.theme.dark": "dark",
  "blob.language": "language",
  "blob.tldr": "tldr",
  "blob.tldr.long": "tldr, go to the card",
  // The name row. The name is a fact; the role and the city are the words the card
  // already keeps in English.
  "blob.name": "Jan Mirecki",
  "blob.signature": " · design engineer · Oslo",
  // The desktop scroll hint (#145). The prototype's word, under the mouse.
  "hint.scroll": "scroll",
}

export type UiKey = keyof typeof en

const pl: Record<UiKey, string> = {
  "site.title": "Jan Mirecki, design engineer",
  "site.description":
    "Jan Mirecki, design engineer z Oslo. 15 lat projektowania dla sieci, 11 lat jej budowania.",
  "nav.skip": "Przejdź do wizytówki",
  "nav.paths": "Wejścia",
  "nav.language": "Język",
  // DRAFT for Jan: English repeated until the Polish is written.
  "work.heading": "Wybrane prace",
  "notFound.title": "Nie ma takiej strony",
  "notFound.lead": "Pod tym adresem nie ma strony.",
  "notFound.home": "Wróć na początek",
  // Untranslated: the CV page falls back to English.
  "cv.nav": "Page",
  "cv.back": "← Back",
  "cv.download": "Download PDF",
  "cv.live": "live",
  // DRAFT for Jan: the prototype's English, repeated until the Polish is written.
  "rail.label": "Tour steps",
  "rail.previous": "previous stop",
  "rail.next": "next stop",
  // The blob. Visible words stay the prototype's English until Jan writes them.
  "blob.landmark": "Where you are, and a few controls",
  "blob.sound": "sound",
  "blob.on": "on",
  "blob.off": "off",
  "blob.start": "the start",
  "blob.work": "the work",
  "blob.settings": "settings",
  "blob.theme": "theme",
  "blob.theme.system": "system",
  "blob.theme.light": "light",
  "blob.theme.dark": "dark",
  "blob.language": "language",
  "blob.tldr": "tldr",
  // DRAFT for Jan: the accessible name. The visible text stays "tldr". The rest reuses
  // `nav.skip` ("Przejdź do wizytówki"), so the name says where the link goes.
  "blob.tldr.long": "tldr, przejdź do wizytówki",
  // The same words as English. The card keeps "design engineer" and "Oslo"; Jan rewrites
  // them if he wants them in Polish.
  "blob.name": "Jan Mirecki",
  "blob.signature": " · design engineer · Oslo",
  // DRAFT for Jan: English repeated until the Polish is written.
  "hint.scroll": "scroll",
}

// Not launched: Norwegian reuses English until its copy is written. Listed here on purpose,
// so the fallback is visible in the source and not silent.
const dictionaries: Record<Locale, Record<UiKey, string>> = { en, pl, no: en }

export function t(locale: Locale, key: UiKey): string {
  return dictionaries[locale][key]
}
