// Temporary copy switch (#163). Four English drafts of the opening and the card, so they
// can be read on the page. It goes away when one version is chosen. The strings are the
// test variants; the live YAML stays the page with no `?copy=`. The JSON baseline is not
// a variant: its casing differs from the YAML, and "0. Current Draft" means the YAML.
//
// The site is static. This module swaps nodes in the browser, and the tour imports it
// before it reads a word. Without JavaScript the parameter changes nothing.

import { typeset } from "../i18n/typography.ts"
import { runs, words, type Role } from "../lib/rich.ts"

export const copyOptions = [
  { value: "", label: "0. Current Draft" },
  { value: "a", label: "A. Dry & Witty" },
  { value: "b", label: "B. Editorial" },
  { value: "c", label: "C. Oslo Direct" },
  { value: "d", label: "D. Meta / Playful" },
] as const

export type CopyId = "a" | "b" | "c" | "d"

/** Marked runs in the live English YAML. A variant keeps one only when it still contains the phrase. */
const phrases = {
  headlineAccent: "clear at a glance.",
  whoName: "I'm Jan Mirecki,",
  kickerAccent: "=",
  nameAccent: "a staff\u2011level design engineer.",
} as const

interface RawVariant {
  tldr: {
    skipLabel: string
    framing: {
      what: { value: string }
      why: { value: string }
      who: { value: string }
      how: { value: string }
    }
    steps: { step1: string; step2: string; step3: string }
    card: {
      headline: string
      lead: string
      rules: readonly [string, string, string]
      who: string
      callPrompt: string
      callLink: string
    }
  }
  businessCard: { kicker: string; title: string; meta: string; body: string }
}

const variants: Record<CopyId, RawVariant> = {
  a: {
    tldr: {
      skipLabel: "Skip to the card",
      framing: {
        what: { value: "A page that assembles itself while you scroll." },
        why: { value: "To show what layout does when it actually does its job." },
        who: { value: "Founders and teams wondering if we should build together." },
        how: { value: "just scroll. Watch it come together." },
      },
      steps: {
        step1: "First, just the words. A bit of a wall, isn't it?",
        step2: "Same words, now with a job to do. Every piece gets a name and a rule.",
        step3: "Now the look. Read it again. Easier this time, right? That's layout.",
      },
      card: {
        headline: "Your product, understood in seconds.",
        lead: "People don't read websites—they scan them and decide. I design and build pages that survive that test.",
        rules: [
          "One thought per sentence.",
          "One obvious place to look.",
          "Colour used sparingly, like salt.",
        ],
        who: "I'm Jan Mirecki—fifteen years designing for the web, eleven writing the code.",
        callPrompt: "Want your product to feel this obvious? ",
        callLink: "Write to me.",
      },
    },
    businessCard: {
      kicker: "= how? · the short version",
      title: "I work in the material the product is made of.",
      meta: "Jan Mirecki · Design Engineer · Oslo",
      body: "No handoffs lost in translation. I start with the copy, map the structure, write the semantic markup and tokens, and only reach for colour at the very end.",
    },
  },
  b: {
    tldr: {
      skipLabel: "Jump to the finished card",
      framing: {
        what: { value: "A live demonstration of how a page takes shape." },
        why: { value: "Because clarity isn't decoration—it is structure." },
        who: { value: "Teams looking for a design engineer to lead product craft." },
        how: { value: "scroll down. One layer at a time." },
      },
      steps: {
        step1: "Start with the words alone. Notice the friction.",
        step2: "Give those words a structure. A place, a name, a rule.",
        step3: "Add the surface last. Read it once more. The effort is gone—that is layout.",
      },
      card: {
        headline: "Clarity, built in.",
        lead: "A good product shouldn't need explaining twice. I shape the words, the structure, and the code until it speaks for itself.",
        rules: [
          "Say one thing at a time.",
          "Lead the eye, never force it.",
          "Let colour earn its place.",
        ],
        who: "Jan Mirecki. Fifteen years of web design; eleven of frontend architecture.",
        callPrompt: "If this is how you want your product to read, ",
        callLink: "let's talk.",
      },
    },
    businessCard: {
      kicker: "= how? · from sentence to system",
      title: "Design and engineering, practiced as one craft.",
      meta: "Based in Oslo · Working globally",
      body: "Most products break in the gap between a Figma file and a pull request. I close that gap by owning the entire arc—from the first rough draft to the production design system.",
    },
  },
  c: {
    tldr: {
      skipLabel: "Skip to the card",
      framing: {
        what: { value: "A page built step by step as you scroll." },
        why: { value: "To show how structure turns text into a product." },
        who: { value: "Product teams hiring a staff-level design engineer." },
        how: { value: "scroll to assemble." },
      },
      steps: {
        step1: "Only words. Raw and unstyled.",
        step2: "Same words, structured. Roles assigned, rules set.",
        step3: "Visual layer on. Read it again. Same text, half the effort. That is layout.",
      },
      card: {
        headline: "Make your product obvious.",
        lead: "Visitors judge fast. I design and build interfaces that make the value clear on the first pass.",
        rules: ["One idea per line.", "One clear focal point.", "Colour only for meaning."],
        who: "I'm Jan Mirecki, a design engineer. Fifteen years in design, eleven in code.",
        callPrompt: "Building something that needs this? ",
        callLink: "Email me.",
      },
    },
    businessCard: {
      kicker: "= how? · the workflow",
      title: "End-to-end product design and frontend architecture.",
      meta: "Jan Mirecki · 15 yrs design · 11 yrs code · Oslo",
      body: "You just saw my process in three scroll steps: copy first, semantic hierarchy second, tokens and visual polish last. Below is how that looks in shipped products.",
    },
  },
  d: {
    tldr: {
      skipLabel: "Skip the demo",
      framing: {
        what: { value: "A website assembling itself in front of you." },
        why: { value: "Because 'I care about typography' is boring to read." },
        who: { value: "Anyone considering hiring me to build their product." },
        how: { value: "scroll. No tricks, just CSS and structure." },
      },
      steps: {
        step1: "Step one: plain text. Honest, but hard work.",
        step2: "Step two: the skeleton. Now the text knows where it lives.",
        step3:
          "Step three: the clothes. Read it again. You didn't even have to try. That's layout.",
      },
      card: {
        headline: "Stop making users work so hard.",
        lead: "If people have to squint to figure out what your product does, they leave. I fix the words, the hierarchy, and the code so they stay.",
        rules: [
          "One point per sentence.",
          "One obvious next step.",
          "Colour only when it earns a tap.",
        ],
        who: "I'm Jan Mirecki—design engineer. Fifteen years designing web products, eleven shipping them.",
        callPrompt: "Think your product could use this treatment? ",
        callLink: "Send a note.",
      },
    },
    businessCard: {
      kicker: "= how? · behind the trick",
      title: "No magic—just disciplined order of operations.",
      meta: "Jan Mirecki · Staff Design Engineer · Oslo",
      body: "When teams start with colours and shadows, they end up decorating confusion. I start with sentences, lock in the markup and design tokens, and let the look emerge naturally.",
    },
  },
}

export interface CopySlots {
  equation: { what: string; why: string; who: string; how: string }
  guide: { words: string; structure: string; look: string; payoff: string }
  message: {
    headline: string
    lead: string
    list: readonly [string, string, string]
    who: string
    callText: string
    callLabel: string
  }
  card: { kicker: string; name: string; role: string; sub: string }
  skip: string
}

/** The live guide's split: the first two sentences are the look line, and the rest is the payoff. */
export function splitStep3(step3: string): { look: string; payoff: string } {
  const sentences = step3.split(/(?<=[.!?])\s+/).filter((part) => part.length > 0)
  if (sentences.length <= 1) return { look: step3, payoff: "" }
  const first = sentences[0] ?? ""
  const second = sentences[1] ?? ""
  if (sentences.length === 2) return { look: first, payoff: second }
  return { look: `${first} ${second}`, payoff: sentences.slice(2).join(" ") }
}

/** Wraps `phrase` in a role mark when `text` still contains it. The first occurrence only. */
export function markIfPresent(text: string, phrase: string, role: Role): string {
  if (phrase.length === 0) return text
  const at = text.indexOf(phrase)
  if (at === -1) return text
  return `${text.slice(0, at)}[${phrase}]{${role}}${text.slice(at + phrase.length)}`
}

export function copyId(search: string): CopyId | null {
  const value = new URLSearchParams(search).get("copy")
  if (value === "a" || value === "b" || value === "c" || value === "d") return value
  return null
}

/** The address after the select changes. An empty value drops `copy` and keeps every other parameter. */
export function copyAddress(href: string, value: string): string {
  const url = new URL(href, "https://strm.dev")
  if (value === "a" || value === "b" || value === "c" || value === "d")
    url.searchParams.set("copy", value)
  else url.searchParams.delete("copy")
  return `${url.pathname}${url.search}${url.hash}`
}

export function slotsFor(id: CopyId): CopySlots {
  const variant = variants[id]
  const framing = variant.tldr.framing
  const card = variant.tldr.card
  const step3 = splitStep3(variant.tldr.steps.step3)
  return {
    equation: {
      what: framing.what.value,
      why: framing.why.value,
      who: framing.who.value,
      how: framing.how.value,
    },
    guide: {
      words: variant.tldr.steps.step1,
      structure: variant.tldr.steps.step2,
      look: step3.look,
      payoff: step3.payoff,
    },
    message: {
      headline: markIfPresent(card.headline, phrases.headlineAccent, "accent"),
      lead: card.lead,
      list: card.rules,
      who: markIfPresent(card.who, phrases.whoName, "name"),
      // The prompt's trailing space was the gap before the link. The pill already has a gap.
      callText: card.callPrompt.trimEnd(),
      callLabel: card.callLink,
    },
    card: {
      kicker: markIfPresent(variant.businessCard.kicker, phrases.kickerAccent, "accent"),
      name: markIfPresent(variant.businessCard.title, phrases.nameAccent, "accent"),
      role: variant.businessCard.meta,
      sub: variant.businessCard.body,
    },
    skip: variant.tldr.skipLabel,
  }
}

function fillWords(container: HTMLElement, source: string): void {
  const list = words(typeset(source, "en"))
  container.replaceChildren(
    ...list.map((word, index) => {
      const span = container.ownerDocument.createElement("span")
      span.className = "ui-w"
      if (word.role) span.dataset.role = word.role
      span.textContent = index < list.length - 1 ? `${word.text} ` : word.text
      return span
    })
  )
}

function fillRuns(container: HTMLElement, source: string): void {
  const list = runs(typeset(source, "en"))
  container.replaceChildren(
    ...list.map((part) => {
      if (!part.role) return container.ownerDocument.createTextNode(part.text)
      const span = container.ownerDocument.createElement("span")
      span.dataset.role = part.role
      span.textContent = part.text
      return span
    })
  )
}

function setText(node: Element | null, text: string): void {
  if (node) node.textContent = text
}

function setGuide(doc: Document, guide: CopySlots["guide"]): void {
  const lines = [guide.words, guide.structure, guide.look]
  const steps = [...doc.querySelectorAll<HTMLElement>(".guide .step .txt")]
  steps.forEach((txt, index) => {
    const line = lines[index]
    if (line === undefined) return
    const pay = txt.querySelector<HTMLElement>(".pay")
    if (!pay) {
      txt.textContent = line
      return
    }
    pay.textContent = guide.payoff
    for (const node of [...txt.childNodes]) {
      if (node !== pay) node.remove()
    }
    txt.insertBefore(doc.createTextNode(line), pay)
  })
}

/**
 * Replaces the opening and the card when `?copy=` is a known variant. Unknown values,
 * and a missing parameter, leave the server's HTML. Call this before the tour reads
 * the message's words.
 */
export function applyCopyVariant(
  doc: Document | undefined = typeof document === "undefined" ? undefined : document,
  search: string = typeof location === "undefined" ? "" : location.search
): void {
  if (!doc) return
  const id = copyId(search)
  if (!id) return
  const slots = slotsFor(id)

  const answers = [...doc.querySelectorAll(".equation .above .a")]
  setText(answers[0] ?? null, slots.equation.what)
  setText(answers[1] ?? null, slots.equation.why)
  setText(answers[2] ?? null, slots.equation.who)
  setText(doc.querySelector(".equation .how .a"), slots.equation.how)
  setGuide(doc, slots.guide)

  const message = slots.message
  const headline = doc.querySelector<HTMLElement>(".message .headline")
  if (headline) fillWords(headline, message.headline)
  const lead = doc.querySelector<HTMLElement>(".message .lead")
  if (lead) fillWords(lead, message.lead)
  const items = [...doc.querySelectorAll<HTMLElement>(".message .list li")]
  message.list.forEach((item, index) => {
    const li = items[index]
    if (li) fillWords(li, item)
  })
  const who = doc.querySelector<HTMLElement>(".message .who")
  if (who) fillWords(who, message.who)
  const call = doc.querySelector<HTMLElement>(".message .call > span")
  if (call) fillWords(call, message.callText)
  setText(doc.querySelector(".message .call .ui-pill"), message.callLabel)

  const card = slots.card
  const kicker = doc.querySelector<HTMLElement>(".card .ui-kicker > span:first-child")
  if (kicker) fillRuns(kicker, card.kicker)
  const name = doc.querySelector<HTMLElement>(".card .name")
  if (name) fillRuns(name, card.name)
  setText(doc.querySelector(".card .role"), card.role)
  const sub = doc.querySelector<HTMLElement>(".card .sub")
  if (sub) fillRuns(sub, card.sub)
  setText(doc.querySelector("a.skip"), slots.skip)

  for (const select of doc.querySelectorAll("[data-blob='copy'] select")) {
    if (select instanceof HTMLSelectElement) select.value = id
  }
}

/** The select follows the address, and a change of it writes the address back. */
export function watchCopySelect(select: HTMLSelectElement): void {
  const id = copyId(location.search)
  select.value = id ?? ""
  select.addEventListener("change", () => {
    const next = copyAddress(location.href, select.value)
    const here = `${location.pathname}${location.search}${location.hash}`
    if (next !== here) location.assign(next)
  })
}
