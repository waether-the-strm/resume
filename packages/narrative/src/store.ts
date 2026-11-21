// The engine's state. One store; the scroll position is the single input and everything else is
// derived from it. Parts of the interface subscribe. Nothing reads the DOM to learn the state,
// and nothing keeps its own copy.
import { holdAt, nearest, place, stopFor } from "./map.ts"
import type { Stage, Track } from "./stops.ts"
import type { Frozen } from "./url.ts"

export interface State {
  /** live: driven by scroll. moment: frozen by the URL. card: the card alone. */
  mode: "live" | "moment" | "card"
  /** Screens scrolled from the top of the track. Not clamped: it runs on past the end. */
  position: number
  /** The scene on show. */
  stage: Stage
  /** Progress through that scene, 0 to 1. */
  t: number
  /** The stop whose hold contains the position, or -1 in a travel. */
  stop: number
  /** The stop the reader is closest to. Never -1. */
  nearest: number
  /** The stop the reader has come to rest on, or -1. Set by `land`, cleared on leaving its hold. */
  landed: number
  /** The tour is behind the reader: the track has scrolled most of the way out. */
  after: boolean
  /** The finished look is on show, so the name is on the page. */
  named: boolean
}

export type Listener = (state: State, previous: State) => void

export interface Store {
  readonly track: Track
  get(): State
  /** Feeds a scroll position, in screens from the top of the track. The only input when live. */
  setPosition(position: number): void
  /** The scroll has come to rest. Marks the stop under the position as landed, if there is one. */
  land(): void
  /** Injects a frozen state from the URL contract. */
  freeze(frozen: Frozen): void
  /** Calls the listener after every change. Returns the function that stops it. */
  subscribe(listener: Listener): () => void
}

/** The track counts as behind the reader once it is this many screens past its end. */
const AFTER = 0.45
/** The finished look starts at this progress of the last scene. */
const NAMED = 0.9

function derive(track: Track, raw: number, landed: number): State {
  const position = Math.min(track.length, Math.max(0, raw))
  const { stage, t } = place(track, position)
  const stop = holdAt(track, position)
  return {
    mode: "live",
    position: raw,
    stage,
    t,
    stop,
    nearest: nearest(track, position),
    landed: landed === stop ? landed : -1,
    after: raw > track.length + AFTER,
    named: stage === 3 && t > NAMED,
  }
}

function same(a: State, b: State): boolean {
  return (Object.keys(a) as (keyof State)[]).every((key) => a[key] === b[key])
}

export function createStore(track: Track): Store {
  let state = derive(track, 0, -1)
  const listeners = new Set<Listener>()

  function commit(next: State) {
    if (same(state, next)) return
    const previous = state
    state = next
    for (const listener of [...listeners]) listener(state, previous)
  }

  return {
    track,
    get: () => state,
    setPosition(position) {
      if (state.mode !== "live") return
      commit(derive(track, position, state.landed))
    },
    land() {
      if (state.mode !== "live" || state.stop < 0) return
      commit({ ...state, landed: state.stop })
    },
    freeze(frozen) {
      if (frozen.kind === "live") {
        commit(derive(track, state.mode === "live" ? state.position : 0, -1))
        return
      }
      const last = track.stops.length - 1
      if (frozen.kind === "card") {
        commit({
          mode: "card",
          position: track.length + 1,
          stage: 3,
          t: 1,
          stop: -1,
          nearest: last,
          landed: -1,
          after: true,
          named: true,
        })
        return
      }
      const index = stopFor(track, frozen.stage, frozen.t)
      const at = track.stops[index]!
      const exact = at.stage === frozen.stage && Math.abs(at.t - frozen.t) <= 0.001
      commit({
        mode: "moment",
        position: at.from,
        stage: frozen.stage,
        t: frozen.t,
        stop: exact ? index : -1,
        nearest: index,
        landed: -1,
        after: false,
        named: frozen.stage === 3 && frozen.t > NAMED,
      })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
