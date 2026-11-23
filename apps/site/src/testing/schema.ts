// The telemetry contract. The browser sends these objects; the Worker stores only
// what this module accepts. Unknown shapes are rejected, not coerced.

import { cleanName } from "./text.ts"

export const eventNames = [
  "session_start",
  "modal_dismissed",
  "variant_switched",
  "scroll_milestone",
  "skip_to_card_clicked",
  "cta_clicked",
  "feedback_submitted",
] as const

export type EventName = (typeof eventNames)[number]

export const copyIds = ["", "a", "b", "c", "d"] as const
export type CopyId = (typeof copyIds)[number]

export const favoriteIds = ["one", "", "a", "b", "c", "d"] as const
export type FavoriteId = (typeof favoriteIds)[number]

export const milestones = [
  "equation",
  "words",
  "structure",
  "look",
  "card",
  "work",
  "depth",
] as const
export type Milestone = (typeof milestones)[number]

export type FeedbackLang = "pl" | "en"
export type ThemeName = "light" | "dark" | "system"

export interface Viewport {
  w: number
  h: number
}

export interface SessionStart {
  type: "session_start"
  sessionId: string
  testerName: string
  feedbackLang: FeedbackLang
  copy: CopyId
  pageLang: string
  viewport: Viewport
  theme: ThemeName
  reducedMotion: boolean
}

export interface ModalDismissed {
  type: "modal_dismissed"
  sessionId: string
  openMs: number
}

export interface VariantSwitched {
  type: "variant_switched"
  sessionId: string
  from: CopyId
  to: CopyId
}

export interface ScrollMilestone {
  type: "scroll_milestone"
  sessionId: string
  milestone: Milestone
  depth: number
}

export interface ClickEvent {
  type: "skip_to_card_clicked" | "cta_clicked"
  sessionId: string
}

export interface FeedbackScores {
  visuals: number
  clarity: number
  tone: number
}

export interface FeedbackSubmitted {
  type: "feedback_submitted"
  sessionId: string
  testerName: string
  feedbackLang: FeedbackLang
  copy: CopyId
  pageLang: string
  viewport: Viewport
  theme: ThemeName
  reducedMotion: boolean
  scores: FeedbackScores
  favorite: FavoriteId
  comment: string
  signature: string
}

export type TelemetryEvent =
  | SessionStart
  | ModalDismissed
  | VariantSwitched
  | ScrollMilestone
  | ClickEvent
  | FeedbackSubmitted

const MAX_BODY = 8_000
const MAX_COMMENT = 2_000
const MAX_OPEN_MS = 86_400_000

export function parseTelemetry(input: unknown): TelemetryEvent | null {
  if (!isRecord(input)) return null
  const type = input.type
  if (type === "session_start") return sessionStart(input)
  if (type === "modal_dismissed") return modalDismissed(input)
  if (type === "variant_switched") return variantSwitched(input)
  if (type === "scroll_milestone") return scrollMilestone(input)
  if (type === "skip_to_card_clicked" || type === "cta_clicked") return clickEvent(input, type)
  if (type === "feedback_submitted") return feedback(input)
  return null
}

/** Rejects a body before it is parsed, so a huge payload never reaches the store. */
export function bodyWithinLimit(text: string): boolean {
  return text.length > 0 && text.length <= MAX_BODY
}

function sessionStart(input: Record<string, unknown>): SessionStart | null {
  const context = readContext(input)
  if (!context) return null
  return { type: "session_start", ...context }
}

function modalDismissed(input: Record<string, unknown>): ModalDismissed | null {
  const sessionId = readId(input.sessionId)
  const openMs = readInt(input.openMs, 0, MAX_OPEN_MS)
  if (!sessionId || openMs === null) return null
  return { type: "modal_dismissed", sessionId, openMs }
}

function variantSwitched(input: Record<string, unknown>): VariantSwitched | null {
  const sessionId = readId(input.sessionId)
  const from = readCopy(input.from)
  const to = readCopy(input.to)
  if (!sessionId || from === null || to === null) return null
  return { type: "variant_switched", sessionId, from, to }
}

function scrollMilestone(input: Record<string, unknown>): ScrollMilestone | null {
  const sessionId = readId(input.sessionId)
  const depth = readInt(input.depth, 0, 100)
  if (!sessionId || depth === null || !isMilestone(input.milestone)) return null
  return { type: "scroll_milestone", sessionId, milestone: input.milestone, depth }
}

function clickEvent(input: Record<string, unknown>, type: ClickEvent["type"]): ClickEvent | null {
  const sessionId = readId(input.sessionId)
  if (!sessionId) return null
  return { type, sessionId }
}

function feedback(input: Record<string, unknown>): FeedbackSubmitted | null {
  const context = readContext(input)
  const scores = readScores(input.scores)
  const favorite = readFavorite(input.favorite)
  const comment = readText(input.comment, MAX_COMMENT)
  const signature = typeof input.signature === "string" ? cleanName(input.signature) : null
  if (!context || !scores || favorite === null || comment === null || signature === null)
    return null
  return { type: "feedback_submitted", ...context, scores, favorite, comment, signature }
}

interface Context {
  sessionId: string
  testerName: string
  feedbackLang: FeedbackLang
  copy: CopyId
  pageLang: string
  viewport: Viewport
  theme: ThemeName
  reducedMotion: boolean
}

function readContext(input: Record<string, unknown>): Context | null {
  const sessionId = readId(input.sessionId)
  const testerName = typeof input.testerName === "string" ? cleanName(input.testerName) : null
  const feedbackLang = readLang(input.feedbackLang)
  const copy = readCopy(input.copy)
  const pageLang = readPageLang(input.pageLang)
  const viewport = readViewport(input.viewport)
  const theme = readTheme(input.theme)
  if (
    !sessionId ||
    testerName === null ||
    !feedbackLang ||
    copy === null ||
    !pageLang ||
    !viewport ||
    !theme ||
    typeof input.reducedMotion !== "boolean"
  ) {
    return null
  }
  return {
    sessionId,
    testerName,
    feedbackLang,
    copy,
    pageLang,
    viewport,
    theme,
    reducedMotion: input.reducedMotion,
  }
}

function readScores(value: unknown): FeedbackScores | null {
  if (!isRecord(value)) return null
  const visuals = readInt(value.visuals, 1, 5)
  const clarity = readInt(value.clarity, 1, 5)
  const tone = readInt(value.tone, 1, 5)
  if (visuals === null || clarity === null || tone === null) return null
  return { visuals, clarity, tone }
}

function readViewport(value: unknown): Viewport | null {
  if (!isRecord(value)) return null
  const w = readInt(value.w, 0, 10_000)
  const h = readInt(value.h, 0, 10_000)
  if (w === null || h === null) return null
  return { w, h }
}

function readId(value: unknown): string | null {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{8,80}$/.test(value)) return null
  return value
}

function readPageLang(value: unknown): string | null {
  if (typeof value !== "string" || !/^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/.test(value)) return null
  return value
}

function readText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim()
  if (cleaned.length > max) return null
  return cleaned
}

function readLang(value: unknown): FeedbackLang | null {
  if (value === "pl" || value === "en") return value
  return null
}

function readCopy(value: unknown): CopyId | null {
  if (value === "" || value === "a" || value === "b" || value === "c" || value === "d") return value
  return null
}

function readFavorite(value: unknown): FavoriteId | null {
  if (
    value === "one" ||
    value === "" ||
    value === "a" ||
    value === "b" ||
    value === "c" ||
    value === "d"
  ) {
    return value
  }
  return null
}

function readTheme(value: unknown): ThemeName | null {
  if (value === "light" || value === "dark" || value === "system") return value
  return null
}

function readInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null
  if (value < min || value > max) return null
  return value
}

function isMilestone(value: unknown): value is Milestone {
  return (
    value === "equation" ||
    value === "words" ||
    value === "structure" ||
    value === "look" ||
    value === "card" ||
    value === "work" ||
    value === "depth"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
