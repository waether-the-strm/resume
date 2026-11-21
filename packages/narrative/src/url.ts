// The frozen-state contract. `?stage=S&t=T` shows one moment of the tour; `?stage=jan` shows the
// card alone. Every test scenario names a state this way, so the engine accepts it as input to
// the same store that scrolling feeds.
import type { Stage } from "./stops.ts"

export type Frozen =
  | { kind: "live" }
  | { kind: "card" }
  | { kind: "moment"; stage: Stage; t: number }

/** Reads the contract from a query string. Anything unreadable means live. */
export function parseFrozen(search: string): Frozen {
  const params = new URLSearchParams(search)
  const stage = params.get("stage")
  if (stage === null) return { kind: "live" }
  if (stage === "jan") return { kind: "card" }
  if (!/^[0-3]$/.test(stage)) return { kind: "live" }
  const raw = params.get("t")
  const t = raw === null ? 1 : Number(raw)
  if (!Number.isFinite(t)) return { kind: "live" }
  return { kind: "moment", stage: Number(stage) as Stage, t: Math.min(1, Math.max(0, t)) }
}
