// The scroll hint on the first frame (#145). The mouse is the `ui-hint` primitive.
// The server renders it hidden. This shows it after `--hint-wait` while the reader
// is still on the first frame, and puts it away only once the page is more than
// 8px down (prototype lines 657 to 661). A wheel of a pixel, or a key that does
// not move the page, leaves it alone: a resting hand and a modifier still going
// down must not dismiss a hint that has not been seen.
//
// sessionStorage key `strm-hint`, value `seen`: the reader has left the first
// frame after the hint was shown. Showing it writes nothing. Leaving the first
// frame before it was shown writes nothing, so the next load at the top can
// still show it. A load that is already past the first frame writes nothing too.
import type { TourPart } from "./types"

/** sessionStorage key. The value `seen` means this tab should not show the hint. */
export const HINT_SEEN_KEY = "strm-hint"
/** The only value stored under {@link HINT_SEEN_KEY}. */
export const HINT_SEEN_VALUE = "seen"

/**
 * The prototype treats the hint as already done once the page is more than 8px
 * down (prototype-v0.16.0.html, line 659). `position` is screens of the track,
 * so the threshold is those 8px over the viewport height.
 */
export const HINT_DONE_PX = 8

export function hintPastFirstFrame(
  position: number,
  stage: number,
  viewportHeight: number
): boolean {
  if (stage !== 0) return true
  const height = viewportHeight > 0 ? viewportHeight : 1
  return position > HINT_DONE_PX / height
}

/** A computed time: `1.4s`, `1400ms`, or anything that does not parse. */
export function cssMilliseconds(value: string): number {
  const trimmed = value.trim()
  const amount = Number.parseFloat(trimmed)
  if (!Number.isFinite(amount)) return 0
  if (trimmed.endsWith("ms")) return amount
  if (trimmed.endsWith("s")) return amount * 1000
  return amount
}

function readStorage(): Storage | null {
  try {
    return sessionStorage
  } catch {
    return null
  }
}

/** `--hint-wait` is a custom property. Reading it through a real time property resolves the calc. */
function readWait(element: HTMLElement): number {
  element.style.animationDelay = "var(--hint-wait)"
  const read = getComputedStyle(element).animationDelay
  element.style.removeProperty("animation-delay")
  return cssMilliseconds(read)
}

export const hint: TourPart = ({ store, settle }) => {
  const element = document.querySelector(".ui-hint")
  if (!(element instanceof HTMLElement) || !settle) return
  // One part, two forms. The coarse pointer and the narrow screen show the finger;
  // the stylesheet decides which, and this does not.

  const memory = readStorage()
  if (memory?.getItem(HINT_SEEN_KEY) === HINT_SEEN_VALUE) return

  const remember = () => {
    try {
      memory?.setItem(HINT_SEEN_KEY, HINT_SEEN_VALUE)
    } catch {
      // The write can throw. The hint still leaves for this view.
    }
  }

  const past = () => {
    const state = store.get()
    return hintPastFirstFrame(state.position, state.stage, window.innerHeight)
  }

  // Already past the first frame. This load shows nothing and remembers nothing,
  // so a later load at the top still can.
  if (past()) return

  const wait = readWait(element)
  // Reduced motion zeroes the role, so the pause is 0 and the hint stays off.
  if (wait <= 0) return

  let done = false
  let shown = false
  const putAway = (persist: boolean) => {
    if (done) return
    done = true
    window.clearTimeout(timer)
    unsubscribe()
    element.classList.remove("is-shown")
    element.classList.add("is-gone")
    if (persist) remember()
  }

  const timer = window.setTimeout(() => {
    if (done) return
    if (past()) {
      putAway(false)
      return
    }
    // The blob's painted height is one row or two, and the phone tokens are not
    // that height, so the stylesheet cannot place the finger from tokens alone.
    // One property: how far the blob's top is from the viewport bottom. The
    // sheet adds the desktop's 12.5px gap and lifts the box by the word's overhang.
    const blob = document.querySelector(".ui-blob")
    if (blob instanceof HTMLElement) {
      const clear = window.innerHeight - blob.getBoundingClientRect().top
      if (clear > 0) element.style.setProperty("--hint-blob-clear", `${clear}px`)
    }
    element.classList.add("is-shown")
    shown = true
  }, wait)

  // The page leaving the first frame is the only dismissal. A nudge that settles
  // back above the 8px line never arrives here, so the hint still appears.
  const unsubscribe = store.subscribe(() => {
    if (!past()) return
    // Before the hint is on screen this load simply never shows it, and the
    // next load at the top still can.
    putAway(shown)
  })
}
