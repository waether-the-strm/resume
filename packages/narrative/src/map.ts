// From a scroll position to a place in the story. Pure functions of the track and a position
// in screens. No DOM, no time.
import type { Stage, Track } from "./stops.ts"

export interface Place {
  stage: Stage
  t: number
}

/** A position inside a hold counts as that stop within this many screens of its edges. */
const HOLD_SLACK = 0.004
/** A stop counts as reached this many screens before its hold starts. */
const REACH_SLACK = 0.01
/** In a travel that crosses a seam, the leaving scene gets at least this share. */
const MIN_LEAVING_SHARE = 0.35

/** The stage and progress shown at a position. Inside a hold: that stop's own state. */
export function place(track: Track, position: number): Place {
  const { stops, weights } = track
  let index = stops.findIndex((stop) => position <= stop.to)
  if (index < 0) index = stops.length - 1
  const next = stops[index]!
  if (position >= next.from || index === 0) return { stage: next.stage, t: next.t }

  const prev = stops[index - 1]!
  const f = (position - prev.to) / next.travel
  if (prev.stage === next.stage) {
    return { stage: next.stage, t: prev.t + (next.t - prev.t) * f }
  }
  // The travel crosses a seam: finish the scene being left, then start the next one. The split
  // follows how much of each scene is still to be covered.
  const leaving = (1 - prev.t) * weights[prev.stage]
  const entering = next.t * weights[next.stage]
  const share = Math.max(MIN_LEAVING_SHARE, leaving / (leaving + entering))
  return f < share
    ? { stage: prev.stage, t: prev.t + ((1 - prev.t) * f) / share }
    : { stage: next.stage, t: (next.t * (f - share)) / (1 - share) }
}

/** The stop whose hold contains the position, or -1 when the position is in a travel. */
export function holdAt(track: Track, position: number): number {
  return track.stops.findIndex(
    (stop) => position >= stop.from - HOLD_SLACK && position <= stop.to + HOLD_SLACK
  )
}

/** The last stop already arrived at. */
export function reached(track: Track, position: number): number {
  return track.stops.reduce(
    (last, stop, index) => (stop.from <= position + REACH_SLACK ? index : last),
    0
  )
}

/** The stop the reader is closest to: the one reached, or the next once past the middle of the travel. */
export function nearest(track: Track, position: number): number {
  const index = reached(track, position)
  const current = track.stops[index]!
  const next = track.stops[index + 1]
  return next && position > (current.to + next.from) / 2 ? index + 1 : index
}

/** The stop that stands for a frozen state: the last one at or before that stage and progress. */
export function stopFor(track: Track, stage: Stage, t: number): number {
  return track.stops.reduce(
    (last, stop, index) =>
      stop.stage < stage || (stop.stage === stage && stop.t <= t + 0.001) ? index : last,
    0
  )
}
