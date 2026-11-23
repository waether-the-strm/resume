import assert from "node:assert/strict"
import { test } from "node:test"
import {
  clickEvent,
  feedbackSubmitted,
  modalDismissed,
  scrollMilestone,
  sessionStart,
  variantSwitched,
  type PageContext,
} from "../scripts/testing/events.ts"
import { parseTelemetry } from "../testing/schema.ts"
import { handleTelemetry, type TelemetryDb } from "./telemetry.ts"

const context: PageContext = {
  sessionId: "session-1",
  testerName: "Ada",
  feedbackLang: "pl",
  copy: "b",
  pageLang: "en",
  viewport: { w: 390, h: 664 },
  theme: "dark",
  reducedMotion: false,
}

function post(body: unknown, ip = "203.0.113.8"): Request {
  return new Request("https://strm.dev/api/telemetry", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify(body),
  })
}

test("the client events are the events the worker accepts", () => {
  const events = [
    sessionStart(context),
    modalDismissed(context.sessionId, 1200.4),
    variantSwitched(context.sessionId, "", "a"),
    scrollMilestone(context.sessionId, "card", 40),
    clickEvent(context.sessionId, "skip_to_card_clicked"),
    clickEvent(context.sessionId, "cta_clicked"),
    feedbackSubmitted(context, { visuals: 4, clarity: 5, tone: 3 }, "one", "  Calm.  ", "Ada"),
  ]
  for (const event of events) {
    const parsed = parseTelemetry(event)
    assert.ok(parsed, event.type)
    assert.equal(parsed?.type, event.type)
  }
  const note = parseTelemetry(events[6])
  assert.equal(note && note.type === "feedback_submitted" ? note.comment : "", "Calm.")
})

test("a missing binding logs the event and answers 200", async () => {
  const lines: string[] = []
  const response = await handleTelemetry(
    post(sessionStart(context)),
    {},
    {
      log: (line) => lines.push(line),
      hits: new Map(),
    }
  )
  assert.equal(response.status, 200)
  const logged = JSON.parse(lines[0] ?? "{}") as { telemetry?: { type?: string } }
  assert.equal(logged.telemetry?.type, "session_start")
})

test("a bound database receives the validated event", async () => {
  const bound: { sql: string; values: unknown[] }[] = []
  const db: TelemetryDb = {
    prepare(sql) {
      return {
        bind(...values) {
          bound.push({ sql, values })
          return {
            async run() {
              return { success: true }
            },
          }
        },
      }
    },
  }
  const response = await handleTelemetry(
    post(scrollMilestone("session-1", "work", 80)),
    { TELEMETRY_DB: db },
    {
      hits: new Map(),
    }
  )
  assert.equal(response.status, 200)
  assert.match(bound[0]?.sql ?? "", /INSERT INTO events/)
  assert.deepEqual(bound[0]?.values.slice(0, 2), ["scroll_milestone", "session-1"])
})

test("invalid payloads are refused and not logged", async () => {
  const lines: string[] = []
  const options = { log: (line: string) => lines.push(line), hits: new Map() }
  assert.equal((await handleTelemetry(post({ type: "session_start" }), {}, options)).status, 400)
  assert.equal((await handleTelemetry(post("nope"), {}, options)).status, 400)
  const huge = await handleTelemetry(
    new Request("https://strm.dev/api/telemetry", { method: "POST", body: "x".repeat(9000) }),
    {},
    options
  )
  assert.equal(huge.status, 400)
  assert.equal(
    (await handleTelemetry(new Request("https://strm.dev/api/telemetry"), {}, options)).status,
    405
  )
  assert.deepEqual(lines, [])
})

test("the same session is rate-limited", async () => {
  const hits = new Map<string, number[]>()
  const options = { hits, sessionLimit: 1, ipLimit: 10, now: () => 1_000 }
  const first = await handleTelemetry(post(clickEvent("session-1", "cta_clicked")), {}, options)
  const second = await handleTelemetry(post(clickEvent("session-1", "cta_clicked")), {}, options)
  assert.equal(first.status, 200)
  assert.equal(second.status, 429)
})

test("a store failure answers 500 and keeps the event in the log", async () => {
  const lines: string[] = []
  const db: TelemetryDb = {
    prepare() {
      return {
        bind() {
          return {
            async run() {
              throw new Error("down")
            },
          }
        },
      }
    },
  }
  const response = await handleTelemetry(
    post(modalDismissed("session-1", 10)),
    { TELEMETRY_DB: db },
    {
      log: (line) => lines.push(line),
      hits: new Map(),
    }
  )
  assert.equal(response.status, 500)
  const logged = JSON.parse(lines[0] ?? "{}") as { error?: string; telemetry?: { type?: string } }
  assert.equal(logged.error, "store_failed")
  assert.equal(logged.telemetry?.type, "modal_dismissed")
})
