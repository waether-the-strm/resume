// A stop is a complete state of the story. `travel` is the stretch of scroll that leads to it;
// `hold` is the stretch in which nothing narrative changes. Coming to rest anywhere inside a hold
// shows a finished thought. All change happens in the travel between two holds, and the seam
// between two scenes always lies inside a travel, never at a rest.
//
// The table is data. It is passed in, so hold lengths can come from content and be varied.

export type Stage = 0 | 1 | 2 | 3

export interface StopDef {
  /** Stable identifier. The readable name is content, per locale. */
  id: string
  /** The scene this stop belongs to: 0 the equation, 1 words, 2 structure, 3 look. */
  stage: Stage
  /** Progress through that scene at this stop, 0 to 1. */
  t: number
  /** Screens of scroll that lead to this stop. */
  travel: number
  /** Screens of scroll in which this stop holds. */
  hold: number
  /** Set on the stop that stands for a whole chapter on the rail. */
  chapter?: Stage
}

export interface PlacedStop extends StopDef {
  /** Where the hold starts, in screens from the top of the track. */
  from: number
  /** Where the hold ends. */
  to: number
}

export interface Track {
  stops: readonly PlacedStop[]
  /** The length of the track in screens: the end of the last hold. */
  length: number
  /** Relative length of each scene; shares out a travel that crosses a seam between scenes. */
  weights: readonly [number, number, number, number]
}

export function layout(
  stops: readonly StopDef[],
  weights: Track["weights"] = [1.3, 0.9, 0.9, 0.9]
): Track {
  if (stops.length === 0) throw new Error("A track needs at least one stop.")
  let at = 0
  const placed = stops.map((stop) => {
    const from = at + stop.travel
    const to = from + stop.hold
    at = to
    return { ...stop, from, to }
  })
  return { stops: placed, length: at, weights }
}

/** The twelve stops of the prototype at v0.16.0. The default until stops come from content. */
export const defaultStops: readonly StopDef[] = [
  { id: "start", stage: 0, t: 0, travel: 0, hold: 0.05 },
  { id: "what", stage: 0, t: 0.2, travel: 0.2, hold: 0.12 },
  { id: "why", stage: 0, t: 0.32, travel: 0.13, hold: 0.12 },
  { id: "who", stage: 0, t: 0.45, travel: 0.13, hold: 0.12 },
  { id: "equation", stage: 0, t: 0.59, travel: 0.16, hold: 0.2, chapter: 0 },
  { id: "answer", stage: 0, t: 0.78, travel: 0.22, hold: 0.12 },
  { id: "words", stage: 1, t: 1, travel: 0.56, hold: 0.22, chapter: 1 },
  { id: "structure", stage: 2, t: 0.12, travel: 0.3, hold: 0.18, chapter: 2 },
  { id: "components", stage: 2, t: 0.55, travel: 0.22, hold: 0.14 },
  { id: "tokens", stage: 2, t: 0.78, travel: 0.16, hold: 0.14 },
  { id: "tiles", stage: 3, t: 0.32, travel: 0.4, hold: 0.16 },
  // The weight wave and the call are travel: there is no clean rest between them.
  { id: "look", stage: 3, t: 1, travel: 0.52, hold: 0.45, chapter: 3 },
]
