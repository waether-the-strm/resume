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
  dismiss: string
  nameLabel: string
  namePlaceholder: string
  changeName: string
  feedback: string
  instructions: string
  close: string
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
    dismiss: "Got it",
    nameLabel: "Your name or nickname",
    namePlaceholder: "Your name or nickname",
    changeName: "Not you? Change name",
    feedback: "Leave feedback",
    instructions: "Open the testing notes",
    close: "Close",
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
    barLabel: "Test strony",
    drawerLabel: "Oceń stronę",
    langLabel: "Język opinii",
    title: "To szkic nowej strony.",
    titleNamed: (name) => `Hej ${name}! Dzięki, że tu jesteś.`,
    honest:
      "Liczy się szczere pierwsze wrażenie — niezależnie od zawodu i od tego, jak technicznie na to patrzysz.",
    language:
      "Na tym etapie pracujemy tylko nad angielskim tekstem: pięć wersji, domyślna i A–D. Polska strona jest jeszcze bardzo wczesna, więc oceniając teksty zostaw stronę po angielsku.",
    quick:
      "Szybka (1 min): zobacz stronę taką, jaka jest, i oceń wrażenie wizualne oraz czytelność.",
    comparative:
      "Porównawcza (3 min): przełącz pięć wersji tekstu w menu u góry (zostanie tylko jedna) i powiedz, która brzmi najlepiej.",
    respond:
      "Przycisk „Oceń stronę” w rogu jest po to, żeby łatwo zostawić konkretną notatkę. Wiadomość na Messengerze, e-mail albo notatka głosowa są tak samo mile widziane.",
    dismiss: "Jasne",
    nameLabel: "Jak masz na imię / ksywka?",
    namePlaceholder: "Jak masz na imię / ksywka?",
    changeName: "To nie Ty? Zmień imię",
    feedback: "Oceń stronę",
    instructions: "Otwórz instrukcję",
    close: "Zamknij",
    variant: (id) => variantPl[id],
    variantLine: (id) => `Tekst · ${variantPl[id]}`,
    visuals: "Wygląd i wygoda przeglądania",
    visualsLow: "Ciężko się patrzy",
    visualsHigh: "Spokojnie i czytelnie",
    clarity: "Zrozumiałość przekazu",
    clarityQuestion: "Czy po przewinięciu rozumiesz, czym się zajmuję?",
    clarityLow: "Nadal nie wiem",
    clarityHigh: "Wiem od razu",
    tone: "Naturalność i styl tekstów",
    toneQuestion: "Jak czyta Ci się te teksty?",
    toneHint: "Chodzi o angielskie wersje.",
    toneLow: "Sztywno",
    toneHigh: "Naturalnie",
    favorite: "Ulubiona wersja",
    favoriteOne: "Tylko jedną oglądałem/am",
    words: "Parę słów od siebie",
    wordsPlaceholder: "Wystarczy zdanie albo dwa.",
    signature: "Podpis",
    send: "Wyślij notatkę",
    missingScores: "Zaznacz ocenę na każdej z trzech skal.",
    sendFailed: "Nie poszło. Spróbuj za chwilę.",
    thanks: "Dzięki. Zostaje w rogu, więc po zmianie wersji możesz dopisać kolejną notatkę.",
    thanksNamed: (name) =>
      `Dzięki, ${name}. Zostaje w rogu, więc po zmianie wersji możesz dopisać kolejną notatkę.`,
  },
}
