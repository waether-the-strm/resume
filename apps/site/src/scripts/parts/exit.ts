// Leaving the look for the card (#38, scenario G13). The amount is the prototype's
// `exitWarp` (docs/spec/prototype-v0.16.0.html, lines 533 to 536 and 544). The part
// writes `--warp` and `data-exit`. The stylesheet owns the blur and the fade. At
// rest both are absent, so the message has no inline filter and no inline opacity.
import type { TourPart } from "./types"
import { exitAmount } from "./exit-amount.ts"
import "../../styles/exit.css"

function coarsePointer(): boolean {
  return window.matchMedia("(pointer: coarse)").matches
}

export const exit: TourPart = ({ store, prefs }) => {
  const message = document.querySelector(".message")
  if (!(message instanceof HTMLElement)) return

  const paint = () => {
    const state = store.get()
    const amount =
      state.mode === "live"
        ? exitAmount(state.position, store.track.length, state.stage, prefs.motionAllowed())
        : 0
    if (amount <= 0) {
      message.style.removeProperty("--warp")
      message.removeAttribute("data-exit")
      return
    }
    // Three decimals: the same slack as reading `--t` back off the message.
    message.style.setProperty("--warp", amount.toFixed(3))
    if (amount >= 1) message.dataset.exit = "done"
    else if (coarsePointer()) message.dataset.exit = "fade"
    else message.dataset.exit = "on"
  }

  store.subscribe(paint)
  prefs.subscribe(paint)
  paint()
}
