// The equation on the page. The engine says which phase the scene is in and what that
// phase shows (`equationAt`); this writes it to the markup of Equation.astro as attributes.
// How each part arrives is CSS (styles/tour.css, "scene 0").
import {
  WARP_PHASE,
  createPhaseTracker,
  defaultThresholds,
  equationAt,
  warpAt,
  type PhaseDirection,
} from "@strm/narrative"

/**
 * How long `how?` stands alone in the middle before it moves left to make room for its
 * answer, counted from when it appeared: its own fade (0.6 s in tour.css) and a beat to
 * be read. A glide from `who` to the equation crosses the centred phase in less than half
 * a second, so without this the word never rests. Not the prototype's: there the move
 * follows the scroll at once.
 */
export const HOW_BEAT_MS = 1000

export interface EquationView {
  /** The progress of the scene, 0 to 1. */
  update(t: number): void
  /** `how` is in the corner: the guide shows its heading. */
  corner(): boolean
}

/**
 * An answer melts in when it arrives and melts out when it leaves. Landing on a state
 * (direction 0: the first paint, a frozen moment) shows it with no leaving animation.
 */
function melt(element: Element | null, on: boolean, direction: PhaseDirection): void {
  if (!element) return
  if (on) element.setAttribute("data-melt", "in")
  else if (direction === 0) element.removeAttribute("data-melt")
  else if (element.hasAttribute("data-melt")) element.setAttribute("data-melt", "out")
}

export function createEquationView(
  root: HTMLElement,
  onCorner: (on: boolean) => void,
  /** `how` crossed between the equation and the corner, forward (1) or back (-1). */
  onMove: (direction: 1 | -1) => void = () => {},
  now: () => number = () => performance.now()
): EquationView {
  const rows = [...root.querySelectorAll<HTMLElement>(".above .row")]
  const how = root.querySelector<HTMLElement>(".how")
  const label = how?.querySelector<HTMLElement>(".q") ?? null
  const displacement = document.querySelector("#equation-warp feDisplacementMap")
  let corner = false
  let arrived = Number.NEGATIVE_INFINITY

  /**
   * Where `how?` stands. Centred, it is shifted to the middle of the equation; left, the
   * shift is nothing. It appears in the middle without travelling there, and going back it
   * fades where it stands: the shift is only taken away once the word sits left.
   */
  function place(phase: number, direction: PhaseDirection): void {
    if (!label) return
    const centred = equationAt(phase).centred
    if (!centred) {
      // Before `how?` is on the page it keeps the place it left from, unseen. A state
      // landed on (the first paint, a frozen moment) starts clean.
      if (equationAt(phase).how || direction === 0) root.style.setProperty("--how-shift", "0px")
      return
    }
    // Arriving from before it was there, or landing here: no slide to the middle.
    const snap = direction !== -1
    if (snap) root.setAttribute("data-how-snap", "")
    root.style.setProperty("--how-shift", "0px")
    const box = root.getBoundingClientRect()
    const own = label.getBoundingClientRect()
    const shift = box.left + box.width / 2 - (own.left + own.width / 2)
    root.style.setProperty("--how-shift", `${shift.toFixed(1)}px`)
    if (snap) {
      // The middle is its place before the transition is allowed again.
      void label.offsetWidth
      root.removeAttribute("data-how-snap")
    }
  }

  /** The beat: what is left of it when the reader moves on delays the move to the left. */
  function beat(phase: number, direction: PhaseDirection): void {
    const state = equationAt(phase)
    if (direction !== 1) {
      root.style.setProperty("--how-wait", "0ms")
      return
    }
    if (state.centred) arrived = now()
    // Only the phase in which it moves left: later phases leave the delay as it was set.
    if (state.left && !equationAt(phase - 1).left) {
      const wait = Math.max(0, HOW_BEAT_MS - (now() - arrived))
      root.style.setProperty("--how-wait", `${Math.round(wait)}ms`)
    }
  }

  const tracker = createPhaseTracker(defaultThresholds, ({ phase, direction }) => {
    const state = equationAt(phase)
    root.toggleAttribute("data-line", state.line)
    // The seed's first appearance (a glint, then the seed) is for the reader who has not
    // scrolled yet. Once the line has been drawn, coming back to the top is quiet.
    if (state.line) root.setAttribute("data-met", "")
    root.toggleAttribute("data-plus", state.plus)
    root.toggleAttribute("data-pulsed", state.pulsed)
    root.toggleAttribute("data-how", state.how)
    root.toggleAttribute("data-left", state.left)
    root.toggleAttribute("data-alone", state.alone)
    root.toggleAttribute("data-gone", state.gone)
    root.toggleAttribute("data-hidden", state.hidden)
    rows.forEach((row, index) => {
      row.toggleAttribute("data-asked", state.rows[index]?.asked ?? false)
      melt(row.querySelector(".a"), state.rows[index]?.answered ?? false, direction)
    })
    beat(phase, direction)
    melt(how?.querySelector(".a") ?? null, state.howAnswered, direction)
    place(phase, direction)
    // Before the dissolve nothing is dissolved; after it, the phase itself says `alone`.
    if (phase !== WARP_PHASE) {
      root.style.setProperty("--warp", "0")
      root.removeAttribute("data-warped")
      displacement?.setAttribute("scale", "0")
    }
    if (state.corner !== corner) {
      corner = state.corner
      onCorner(corner)
      // A crossing has a direction; landing on a state (direction 0) is not one.
      if (direction !== 0) onMove(direction)
    }
  })

  return {
    update(t) {
      tracker.update(t)
      if (tracker.phase() !== WARP_PHASE) return
      // The dissolve is continuous: it follows the scroll inside its phase.
      const warp = warpAt(t)
      root.style.setProperty("--warp", warp.progress.toFixed(3))
      root.toggleAttribute("data-warped", warp.dissolving)
      root.toggleAttribute("data-alone", warp.alone)
      displacement?.setAttribute("scale", String(warp.scale))
    },
    corner: () => corner,
  }
}
