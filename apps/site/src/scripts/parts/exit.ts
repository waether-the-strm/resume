// Leaving the look for the card (#38, #132, scenario G13). The amount is the prototype's
// `exitWarp` (docs/spec/prototype-v0.16.0.html, lines 533 to 536 and 544). The part
// writes `data-exit` on the message, `--warp` and `data-exit` on the stage around it,
// and the scale of the displacement map the page renders (`#exit-warp` in Home.astro).
// The stylesheet owns the filter and the fade. At rest all of it is absent: no inline
// filter, no inline opacity, a scale of 0. The exit is the same on every pointer.
//
// The filter is on the stage, not on the message. A filter on the message is painted
// only where the message has ink, so text the map pushes past its left edge was cut off
// in a straight line (the prototype has the same cut). The stage is the whole viewport.
import type { TourPart } from "./types"
import { exitAmount, exitDisplacement } from "./exit-amount.ts"
import "../../styles/exit.css"

export const exit: TourPart = ({ store, prefs }) => {
  const message = document.querySelector(".message")
  if (!(message instanceof HTMLElement)) return
  const stage = message.closest(".stage")
  const map = document.querySelector("#exit-warp feDisplacementMap")
  // `--warp` is written where the filter is, and the message inherits it for the fade.
  const host = stage instanceof HTMLElement ? stage : message
  const warps = stage instanceof HTMLElement && map !== null

  const paint = () => {
    const state = store.get()
    const amount =
      state.mode === "live"
        ? exitAmount(state.position, store.track.length, state.stage, prefs.motionAllowed())
        : 0
    map?.setAttribute("scale", exitDisplacement(amount).toFixed(1))
    if (amount <= 0) {
      host.style.removeProperty("--warp")
      host.removeAttribute("data-exit")
      message.removeAttribute("data-exit")
      return
    }
    // Three decimals: the same slack as reading `--t` back off the message.
    host.style.setProperty("--warp", amount.toFixed(3))
    // A page without the map still blurs and fades. A filter that names a missing map
    // would hide the message instead.
    const exit = amount >= 1 ? "done" : warps ? "on" : "soft"
    message.dataset.exit = exit
    host.dataset.exit = exit
  }

  store.subscribe(paint)
  prefs.subscribe(paint)
  paint()
}
