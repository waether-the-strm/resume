// Automatic events: session start, variant changes, scroll milestones, skip and
// the call to action. The drawer sends its own event when the note is submitted.

import type { CopyId, Milestone } from "../../testing/schema.ts"
import {
  clickEvent,
  postTelemetry,
  scrollMilestone,
  sessionStart,
  variantSwitched,
  type PageContext,
} from "./events.ts"
import { copyVariant, testingKeys, type Memory } from "./session.ts"
import type { TestingLang } from "./copy.ts"

export interface WatchedSession {
  sessionId: string
  name: string
  lang: TestingLang
  memory: Memory
}

const stages = ["equation", "words", "structure", "look"] as const

export function installWatch(doc: Document, session: WatchedSession): void {
  const view = doc.defaultView
  if (!view) return
  sendStart(doc, session)
  watchVariant(doc, session)
  watchScroll(doc, session)
  watchClicks(doc, session)
}

export function pageContext(doc: Document, session: WatchedSession): PageContext {
  const view = doc.defaultView
  const root = doc.documentElement
  const themeAttr = root.getAttribute("data-theme")
  const theme = themeAttr === "light" || themeAttr === "dark" ? themeAttr : "system"
  const motion = root.getAttribute("data-motion")
  const reduced =
    motion === "reduced" ||
    (motion !== "full" && !!view?.matchMedia("(prefers-reduced-motion: reduce)").matches)
  const pageLang = /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/.test(root.lang) ? root.lang : "en"
  return {
    sessionId: session.sessionId,
    testerName: session.name,
    feedbackLang: session.lang,
    copy: copyVariant(view?.location.search ?? ""),
    pageLang,
    viewport: { w: view?.innerWidth ?? 0, h: view?.innerHeight ?? 0 },
    theme,
    reducedMotion: reduced,
  }
}

function sendStart(doc: Document, session: WatchedSession): void {
  if (session.memory.getItem(testingKeys.started) === "1") return
  session.memory.setItem(testingKeys.started, "1")
  postTelemetry(sessionStart(pageContext(doc, session)))
}

function watchVariant(doc: Document, session: WatchedSession): void {
  const view = doc.defaultView
  if (!view) return
  const current = copyVariant(view.location.search)
  const previous = session.memory.getItem(testingKeys.variant)
  if (isCopy(previous) && previous !== current) {
    postTelemetry(variantSwitched(session.sessionId, previous, current))
  }
  session.memory.setItem(testingKeys.variant, current)

  doc.addEventListener(
    "change",
    (event) => {
      const target = event.target
      if (!(target instanceof HTMLSelectElement)) return
      if (!target.closest("[data-blob='copy']")) return
      const from = copyVariant(view.location.search)
      const to = isCopy(target.value) ? target.value : ""
      if (from === to) return
      session.memory.setItem(testingKeys.variant, to)
      postTelemetry(variantSwitched(session.sessionId, from, to))
    },
    true
  )
}

function watchScroll(doc: Document, session: WatchedSession): void {
  const view = doc.defaultView
  if (!view) return
  const seen = new Set(
    (session.memory.getItem(testingKeys.milestones) ?? "").split(",").filter((item) => item)
  )
  let maxDepth = 0

  const emit = (key: string, milestone: Milestone) => {
    if (seen.has(key)) return
    seen.add(key)
    session.memory.setItem(testingKeys.milestones, [...seen].join(","))
    postTelemetry(scrollMilestone(session.sessionId, milestone, maxDepth))
  }

  const readStage = () => {
    const index = Number(doc.querySelector(".stage")?.getAttribute("data-scene"))
    if (index === 0 || index === 1 || index === 2 || index === 3) {
      const name = stages[index]
      if (name) emit(name, name)
    }
  }

  const depthNow = () => {
    const full = doc.documentElement.scrollHeight - view.innerHeight
    if (full <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((view.scrollY / full) * 100)))
  }

  const onScroll = () => {
    const depth = depthNow()
    if (depth <= maxDepth) return
    maxDepth = depth
    for (const mark of [25, 50, 75, 100]) {
      if (maxDepth >= mark) emit(`depth:${mark}`, "depth")
    }
  }

  readStage()
  const stage = doc.querySelector(".stage")
  if (stage) {
    const observer = new MutationObserver(readStage)
    observer.observe(stage, { attributes: true, attributeFilter: ["data-scene"] })
  }

  const cards = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const id = entry.target.id
        if (id === "jan") emit("card", "card")
        if (id === "work") emit("work", "work")
      }
    },
    { threshold: 0.2 }
  )
  const card = doc.getElementById("jan")
  const work = doc.getElementById("work")
  if (card) cards.observe(card)
  if (work) cards.observe(work)

  view.addEventListener("scroll", onScroll, { passive: true })
  view.addEventListener("pagehide", () => {
    maxDepth = Math.max(maxDepth, depthNow())
    if (maxDepth <= 0 || seen.has(`depth:${maxDepth}`)) return
    emit("depth:final", "depth")
  })
}

function watchClicks(doc: Document, session: WatchedSession): void {
  doc.addEventListener(
    "click",
    (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest("a.skip")) {
        postTelemetry(clickEvent(session.sessionId, "skip_to_card_clicked"))
      } else if (target.closest(".message .call .ui-pill")) {
        postTelemetry(clickEvent(session.sessionId, "cta_clicked"))
      }
    },
    true
  )
}

function isCopy(value: string | null): value is CopyId {
  return value === "" || value === "a" || value === "b" || value === "c" || value === "d"
}
