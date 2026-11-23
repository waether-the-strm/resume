// Events the testing layer posts. Builders stay pure so the Worker schema can
// accept them in a unit test. Sending uses fetch with keepalive, and sendBeacon
// when fetch cannot be called.

import type {
  ClickEvent,
  CopyId,
  FeedbackLang,
  FeedbackSubmitted,
  Milestone,
  ModalDismissed,
  ScrollMilestone,
  SessionStart,
  ThemeName,
  VariantSwitched,
  Viewport,
} from "../../testing/schema.ts"

export interface PageContext {
  sessionId: string
  testerName: string
  feedbackLang: FeedbackLang
  copy: CopyId
  pageLang: string
  viewport: Viewport
  theme: ThemeName
  reducedMotion: boolean
}

export function sessionStart(context: PageContext): SessionStart {
  return { type: "session_start", ...context }
}

export function modalDismissed(sessionId: string, openMs: number): ModalDismissed {
  return { type: "modal_dismissed", sessionId, openMs: Math.max(0, Math.round(openMs)) }
}

export function variantSwitched(sessionId: string, from: CopyId, to: CopyId): VariantSwitched {
  return { type: "variant_switched", sessionId, from, to }
}

export function scrollMilestone(
  sessionId: string,
  milestone: Milestone,
  depth: number
): ScrollMilestone {
  return {
    type: "scroll_milestone",
    sessionId,
    milestone,
    depth: Math.max(0, Math.min(100, Math.round(depth))),
  }
}

export function clickEvent(sessionId: string, type: ClickEvent["type"]): ClickEvent {
  return { type, sessionId }
}

export function feedbackSubmitted(
  context: PageContext,
  scores: FeedbackSubmitted["scores"],
  favorite: FeedbackSubmitted["favorite"],
  comment: string,
  signature: string
): FeedbackSubmitted {
  return { type: "feedback_submitted", ...context, scores, favorite, comment, signature }
}

export const telemetryPath = "/api/telemetry"

/** Posts one event. Does not wait, except when the caller needs the response. */
export function postTelemetry(payload: unknown): void {
  const body = JSON.stringify(payload)
  try {
    void fetch(telemetryPath, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    })
  } catch {
    const blob = new Blob([body], { type: "application/json" })
    navigator.sendBeacon?.(telemetryPath, blob)
  }
}

export function postTelemetryAwait(payload: unknown): Promise<Response> {
  return fetch(telemetryPath, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  })
}
