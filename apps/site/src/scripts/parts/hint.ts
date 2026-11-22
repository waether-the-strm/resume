// The scroll hint on the first frame (#145). The mouse is the `ui-hint` primitive.
// The server renders it hidden. This shows it after `--hint-wait` while the reader
// is still on the first frame, and puts it away on the first wheel, key or touch.
//
// sessionStorage key `strm-hint`, value `seen`: this tab has already had the hint.
// It was shown, dismissed, or the page opened already past the first frame. The
// prototype (lines 657 to 661) only remembers for that page view; it does not
// write storage. The issue asks for the session, so a reload does not show it again.
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
  // Prototype line 658. The phone hint is a different issue and is not ported.
  if (matchMedia("(pointer: coarse), (max-width: 760px)").matches) return

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

  if (past()) {
    remember()
    return
  }

  const wait = readWait(element)
  // Reduced motion zeroes the role, so the pause is 0 and the hint stays off.
  if (wait <= 0) return

  let done = false
  const timer = window.setTimeout(() => {
    if (done) return
    if (past()) {
      finish()
      return
    }
    element.classList.add("is-shown")
    remember()
  }, wait)

  const unsubscribe = store.subscribe(() => {
    if (past()) finish()
  })

  const finish = () => {
    if (done) return
    done = true
    window.clearTimeout(timer)
    unsubscribe()
    removeEventListener("wheel", finish)
    removeEventListener("keydown", finish)
    removeEventListener("touchstart", finish)
    element.classList.remove("is-shown")
    element.classList.add("is-gone")
    remember()
  }

  addEventListener("wheel", finish, { passive: true })
  addEventListener("keydown", finish)
  addEventListener("touchstart", finish, { passive: true })
}
