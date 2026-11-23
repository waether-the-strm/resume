// Copy for the temporary testing layer. Jan specified both languages (23 Nov 2026).
// This is not the site draft rule: Polish is written, and it is not a copy of English.
// The page's own strings stay in i18n/ui.ts. Nothing here is a claim about the work.

import type { CopyId } from "../../testing/schema.ts"

export type TestingLang = "pl" | "en"

const variantEn: Record<CopyId, string> = {
  "": "Default",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
}

const variantPl: Record<CopyId, string> = {
  "": "Domyślna",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
}

export interface TestingPhrases {
  barLabel: string
  drawerLabel: string
  langLabel: string
  title: string
  titleNamed: (name: string) => string
  honest: string
  language: string
  quick: string
  comparative: string
  respond: string
  widget: string
  dismiss: string
  nameLabel: string
  namePlaceholder: string
  changeName: string
  feedback: string
  instructions: string
  close: string
  shrink: string
  expand: string
  move: string
  closeWidget: string
  variant: (id: CopyId) => string
  variantLine: (id: CopyId) => string
  visuals: string
  visualsLow: string
  visualsHigh: string
  clarity: string
  clarityQuestion: string
  clarityLow: string
  clarityHigh: string
  tone: string
  toneQuestion: string
  toneHint: string
  toneLow: string
  toneHigh: string
  favorite: string
  favoriteOne: string
  words: string
  wordsPlaceholder: string
  signature: string
  send: string
  missingScores: string
  sendFailed: string
  thanks: string
  thanksNamed: (name: string) => string
}

export const testingCopy: Record<TestingLang, TestingPhrases> = {
  en: {
    barLabel: "Page testing",
    drawerLabel: "Leave feedback",
    langLabel: "Feedback language",
    title: "This is a draft of the new site.",
    titleNamed: (name) => `Hi ${name}! Thanks for being here.`,
    honest:
      "An honest first impression matters, whatever your profession or how technical you are.",
    language:
      "At this stage only the English copy is being worked on: five variants, the default and A to D. The Polish page is still very early, so when you judge the texts, leave the page in English.",
    quick:
      "Quick (1 min): look at the page as it is and judge the visual impression and readability.",
    comparative:
      "Comparative (3 min): switch the five text versions in the top menu (only one will remain) and say which sounds best.",
    respond:
      "The “Leave feedback” button in the corner is there to make specific notes easy. A Messenger message, an email, or a voice note is equally welcome.",
    widget:
      "You can shrink this feedback bar to an icon, move it, or close it. If you close it, refresh the page and it comes back.",
    dismiss: "Got it",
    nameLabel: "Your name or nickname",
    namePlaceholder: "Your name or nickname",
    changeName: "Not you? Change name",
    feedback: "Leave feedback",
    instructions: "Open the testing notes",
    close: "Close",
    shrink: "Shrink to an icon",
    expand: "Expand",
    move: "Move",
    closeWidget: "Close the bar",
    variant: (id) => variantEn[id],
    variantLine: (id) => `Copy · ${variantEn[id]}`,
    visuals: "Visuals & flow",
    visualsLow: "Hard to look at",
    visualsHigh: "Calm and clear",
    clarity: "Clarity of message",
    clarityQuestion: "After scrolling, is it clear what I do?",
    clarityLow: "I still don't know",
    clarityHigh: "Clear straight away",
    tone: "Copy tone & readability",
    toneQuestion: "How do the texts read?",
    toneHint: "This is about the English variants.",
    toneLow: "Stiff",
    toneHigh: "Natural",
    favorite: "Favourite variant",
    favoriteOne: "Only viewed one",
    words: "A few words from you",
    wordsPlaceholder: "A sentence or two is enough.",
    signature: "Your name",
    send: "Send the note",
    missingScores: "Choose a score on each of the three scales.",
    sendFailed: "That didn't send. Try again in a moment.",
    thanks:
      "Thanks. This stays in the corner, so you can leave another note after you switch variants.",
    thanksNamed: (name) =>
      `Thanks, ${name}. This stays in the corner, so you can leave another note after you switch variants.`,
  },
  pl: {
    barLabel: "Panel testowy strony",
    drawerLabel: "Oceń stronę",
    langLabel: "Język formularza",
    title: "To szkic mojej nowej strony.",
    titleNamed: (name) => `Hej ${name}! Dzięki, że tu jesteś.`,
    honest:
      "Liczy się szczere pierwsze wrażenie – nieważne, czym się zajmujesz i czy patrzysz na to okiem specjalisty, czy zupełnie na luzie.",
    language:
      "Na razie szlifuję tylko angielskie teksty: masz do wyboru pięć wersji (domyślną oraz A–D). Polska wersja strony jest jeszcze w surowym szkicu, więc oceniając treść, zostań przy angielskiej.",
    quick:
      "Wersja szybka (1 min): przejrzyj stronę tak, jak się otworzyła, i daj znać, jak się na nią patrzy i czy wszystko jest czytelne.",
    comparative:
      "Wersja porównawcza (3 min): przeklikaj pięć wersji tekstu w menu u góry (finalnie zostanie tylko jedna) i wskaż, która brzmi najlepiej.",
    respond:
      "Przycisk „Oceń stronę” w rogu ułatwi Ci szybkie zebranie uwag. Jeśli jednak wolisz napisać na Messengerze, wysłać maila albo nagrać głosówkę – śmiało, każda forma jest super.",
    widget:
      "Ten pasek z opinią możesz zwinąć do ikony, przesunąć albo zamknąć. Jeśli go zamkniesz, wystarczy odświeżyć stronę, żeby wrócił.",
    dismiss: "Jasne",
    nameLabel: "Twoje imię lub ksywka",
    namePlaceholder: "Twoje imię lub ksywka",
    changeName: "To nie Ty? Zmień",
    feedback: "Oceń stronę",
    instructions: "Pokaż instrukcję",
    close: "Zamknij",
    shrink: "Zwiń do ikony",
    expand: "Rozwiń",
    move: "Przesuń",
    closeWidget: "Zamknij pasek",
    variant: (id) => variantPl[id],
    variantLine: (id) => `Tekst · ${variantPl[id]}`,
    visuals: "Wygląd i wygoda",
    visualsLow: "Męcząco",
    visualsHigh: "Spokojnie i czytelnie",
    clarity: "Zrozumiałość przekazu",
    clarityQuestion: "Czy po przewinięciu rozumiesz, czym się zajmuję?",
    clarityLow: "Nadal nie wiem",
    clarityHigh: "Wiem od razu",
    tone: "Brzmienie i styl tekstów",
    toneQuestion: "Jak czyta Ci się te teksty?",
    toneHint: "Dotyczy wersji angielskich.",
    toneLow: "Sztucznie",
    toneHigh: "Naturalnie",
    favorite: "Która wersja najbardziej Ci leży?",
    favoriteOne: "Oglądałem/am tylko jedną",
    words: "Kilka słów od siebie",
    wordsPlaceholder: "Wystarczy zdanie albo dwa – co przykuło uwagę, a co zgrzyta?",
    signature: "Podpis",
    send: "Wyślij opinię",
    missingScores: "Zaznacz ocenę na wszystkich trzech skalach.",
    sendFailed: "Nie udało się wysłać. Spróbuj za chwilę.",
    thanks:
      "Dzięki! Pasek zostaje w rogu – jeśli przełączysz wersję tekstu, możesz dorzucić kolejną opinię.",
    thanksNamed: (name) =>
      `Dzięki, ${name}! Pasek zostaje w rogu – jeśli przełączysz wersję tekstu, możesz dorzucić kolejną opinię.`,
  },
}
