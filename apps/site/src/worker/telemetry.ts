// POST /api/telemetry. Validates, rate-limits, and writes to D1 when the binding
// exists. A preview without the binding logs the validated event and still
// answers 200, so the tester's form is not punished for a missing database.

import { bodyWithinLimit, parseTelemetry, type TelemetryEvent } from "../testing/schema.ts"

export interface TelemetryDb {
  prepare(sql: string): {
    bind(...values: unknown[]): { run(): Promise<unknown> }
  }
}

export interface TelemetryEnv {
  TELEMETRY_DB?: TelemetryDb
}

export interface TelemetryOptions {
  now?: () => number
  log?: (line: string) => void
  hits?: Map<string, number[]>
  sessionLimit?: number
  ipLimit?: number
  windowMs?: number
}

const INSERT = "INSERT INTO events (event, session_id, payload) VALUES (?, ?, ?)"

const sharedHits = new Map<string, number[]>()

export async function handleTelemetry(
  request: Request,
  env: TelemetryEnv,
  options: TelemetryOptions = {}
): Promise<Response> {
  if (request.method !== "POST") return text(405, "method")
  const now = options.now ?? Date.now
  const hits = options.hits ?? sharedHits
  const windowMs = options.windowMs ?? 60_000
  const ipLimit = options.ipLimit ?? 1000
  const sessionLimit = options.sessionLimit ?? 48
  const log = options.log ?? ((line: string) => console.log(line))
  const ip = request.headers.get("cf-connecting-ip") ?? "local"

  if (!allow(hits, `ip:${ip}`, ipLimit, now(), windowMs)) return text(429, "rate")

  const raw = await request.text()
  if (!bodyWithinLimit(raw)) return text(400, "invalid")
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return text(400, "invalid")
  }
  const event = parseTelemetry(parsed)
  if (!event) return text(400, "invalid")
  if (!allow(hits, `session:${event.sessionId}`, sessionLimit, now(), windowMs)) {
    return text(429, "rate")
  }

  const db = env.TELEMETRY_DB
  if (!db) {
    log(JSON.stringify({ telemetry: event }))
    return new Response(null, { status: 200 })
  }
  try {
    await db.prepare(INSERT).bind(event.type, event.sessionId, JSON.stringify(event)).run()
  } catch {
    log(JSON.stringify({ telemetry: event, error: "store_failed" }))
    return text(500, "store")
  }
  return new Response(null, { status: 200 })
}

export function allow(
  hits: Map<string, number[]>,
  key: string,
  limit: number,
  now: number,
  windowMs: number
): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}

function text(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  })
}

export type { TelemetryEvent }
