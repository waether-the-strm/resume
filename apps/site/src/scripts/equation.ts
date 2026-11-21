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
  onCorner: (on: boolean) => void
): EquationView {
  const rows = [...root.querySelectorAll<HTMLElement>(".above .row")]
  const how = root.querySelector<HTMLElement>(".how")
  const label = how?.querySelector<HTMLElement>(".q") ?? null
  const displacement = document.querySelector("#equation-warp feDisplacementMap")
  let corner = false

  /** How far `how?` is from the middle of the equation, so it can arrive centred. */
  function centre(on: boolean): void {
    if (!label) return
    root.style.setProperty("--how-shift", "0px")
    if (!on) return
    const box = root.getBoundingClientRect()
    const own = label.getBoundingClientRect()
    const shift = box.left + box.width / 2 - (own.left + own.width / 2)
    root.style.setProperty("--how-shift", `${shift.toFixed(1)}px`)
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
    melt(how?.querySelector(".a") ?? null, state.howAnswered, direction)
    centre(state.centred)
    // Before the dissolve nothing is dissolved; after it, the phase itself says `alone`.
    if (phase !== WARP_PHASE) {
      root.style.setProperty("--warp", "0")
      root.removeAttribute("data-warped")
      displacement?.setAttribute("scale", "0")
    }
    if (state.corner !== corner) {
      corner = state.corner
      onCorner(corner)
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
