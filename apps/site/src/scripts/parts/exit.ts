// Leaving the look for the card (#38, #132, scenario G13). The amount is the prototype's
// `exitWarp` (docs/spec/prototype-v0.16.0.html, lines 533 to 536 and 544). The part
// writes `--warp` and `data-exit` on the message, and the scale of the displacement map
// the page renders (`#exit-warp` in Home.astro). The stylesheet owns the filter and the
// fade. At rest all of it is absent: no inline filter, no inline opacity, a scale of 0.
// The exit is the same on every pointer.
import type { TourPart } from "./types"
import { exitAmount, exitDisplacement } from "./exit-amount.ts"
import "../../styles/exit.css"

export const exit: TourPart = ({ store, prefs }) => {
  const message = document.querySelector(".message")
  if (!(message instanceof HTMLElement)) return
  const map = document.querySelector("#exit-warp feDisplacementMap")

  const paint = () => {
    const state = store.get()
    const amount =
      state.mode === "live"
        ? exitAmount(state.position, store.track.length, state.stage, prefs.motionAllowed())
        : 0
    map?.setAttribute("scale", exitDisplacement(amount).toFixed(1))
    if (amount <= 0) {
      message.style.removeProperty("--warp")
      message.removeAttribute("data-exit")
      return
    }
    // Three decimals: the same slack as reading `--t` back off the message.
    message.style.setProperty("--warp", amount.toFixed(3))
    if (amount >= 1) message.dataset.exit = "done"
    // A page without the map still blurs and fades. A filter that names a missing map
    // would hide the message instead.
    else message.dataset.exit = map ? "on" : "soft"
  }

  store.subscribe(paint)
  prefs.subscribe(paint)
  paint()
}
