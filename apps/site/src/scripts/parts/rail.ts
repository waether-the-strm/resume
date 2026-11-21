// The rail: the stops as navigation (#34). Markup is rendered by Rail.astro. This
// only writes attributes from the store and asks settle to steer. It never builds
// elements and never reads the scroll position: the store already derived the
// chapter and the nearest stop, and it does so before the scene has rendered
// (scenario G11). The landed stop animates once (G5).
import type { State } from "@strm/narrative"
import type { TourPart } from "./types"

/** The prototype's `p < 0.02`: the previous arrow has nothing to do. */
const START_SLACK = 0.02
/** Past the last hold by this much, the next arrow has nothing to do. Matches settle. */
const PAST_TRACK = 0.02

export interface RailSample {
  stage: number
  nearest: number
  landed: number
  position: number
  after: boolean
}

export interface RailStop {
  readonly chapter?: number
}

export interface RailFrame {
  /** Index of the chapter stop for `state.stage`, or -1. */
  current: number
  nearest: number
  landed: number
  prevOff: boolean
  nextOff: boolean
  after: boolean
}

/** What the rail shows for one state. Pure: the DOM layer only applies it. */
export function railFrame(
  stops: readonly RailStop[],
  state: RailSample,
  trackLength: number,
  canSteer: boolean
): RailFrame {
  return {
    current: stops.findIndex((stop) => stop.chapter === state.stage),
    nearest: state.nearest,
    landed: state.landed,
    prevOff: !canSteer || state.position < START_SLACK,
    nextOff: !canSteer || state.position > trackLength + PAST_TRACK,
    after: state.after,
  }
}

/**
 * How the landing cue changes. `restart` is the stop that should play it, or -1
 * when the cue only clears. `clear` is false when the landed stop did not change,
 * so a later sample does not play the cue again.
 */
export function landingChange(
  landed: number,
  previous: number
): { clear: boolean; restart: number } {
  if (landed === previous) return { clear: false, restart: -1 }
  return { clear: true, restart: landed }
}

export const rail: TourPart = ({ store, track, settle }) => {
  const nav = document.querySelector<HTMLElement>(".ui-rail")
  if (!nav) return
  const stops = [...nav.querySelectorAll<HTMLButtonElement>(".ui-rail__stop")]
  const prev = nav.querySelector<HTMLButtonElement>('.ui-rail__arrow[data-dir="-1"]')
  const next = nav.querySelector<HTMLButtonElement>('.ui-rail__arrow[data-dir="1"]')

  for (const button of stops) {
    const index = Number(button.dataset.index)
    button.addEventListener("click", () => {
      settle?.goTo(index)
    })
  }
  prev?.addEventListener("click", () => {
    settle?.step(-1)
  })
  next?.addEventListener("click", () => {
    settle?.step(1)
  })

  let previousLanded = -1

  const paint = (state: State) => {
    const frame = railFrame(track.stops, state, track.length, settle !== null)
    nav.classList.toggle("is-after", frame.after)
    nav.inert = frame.after
    for (const button of stops) {
      const index = Number(button.dataset.index)
      if (index === frame.current) button.setAttribute("aria-current", "true")
      else button.removeAttribute("aria-current")
      button.classList.toggle("is-nearest", index === frame.nearest)
    }
    const landing = landingChange(frame.landed, previousLanded)
    if (landing.clear) {
      for (const button of stops) button.classList.remove("is-landed")
      if (landing.restart >= 0) {
        const button = stops.find((item) => Number(item.dataset.index) === landing.restart)
        if (button) {
          // Restart the cue: removing and adding the class in one frame does nothing
          // unless the element is read in between.
          void button.offsetWidth
          button.classList.add("is-landed")
        }
      }
      previousLanded = frame.landed
    }
    if (prev) prev.disabled = frame.prevOff
    if (next) next.disabled = frame.nextOff
  }

  paint(store.get())
  store.subscribe((state) => {
    paint(state)
  })
}
