// The blob: where the reader is, and a few controls (#35, ADR 0010).
//
// The server renders every title, the step numbers and the controls. This part only
// writes attributes and classes: which stop is current, whether the name row is folded,
// whether the menu is open, and whether sound is on. It never builds markup.
import type { TourPart } from "./types"

/** How long an open blob stays open without a further interaction. The prototype's 4500 ms. */
export const BLOB_STAY_MS = 4500
/** How long it stays open after the pointer leaves. The prototype's 700 ms. */
export const BLOB_LEAVE_MS = 700

export interface BlobClock {
  setTimeout(callback: () => void, ms: number): unknown
  clearTimeout(id: unknown): void
}

/**
 * What the folded blob shows. The title is the nearest stop, or `after` once the tour is
 * behind the reader. The name row folds away when the name is already on the page, or then.
 */
export function blobView(state: { nearest: number; named: boolean; after: boolean }): {
  current: number | "after"
  slim: boolean
} {
  return {
    current: state.after ? "after" : state.nearest,
    slim: state.named || state.after,
  }
}

export interface BlobFold {
  isOpen(): boolean
  toggle(): void
  close(): void
  /** The pointer came in with a mouse: unfold, and don't fold while it rests here. */
  enter(): void
  /** The pointer left. Folds after {@link BLOB_LEAVE_MS} unless it comes back. */
  leave(): void
  /** A press inside, while open: the stay starts again. */
  poke(): void
  /** A press outside. */
  outside(): void
  /** The reader scrolled on, and the pointer is not resting on the blob. */
  scroll(): void
  /**
   * A press on the name row. False means the press only unfolded it: on a coarse pointer
   * the first press does not navigate. True means the press goes to the card.
   */
  namePressed(coarse: boolean): boolean
}

/**
 * The folding. Time is injected, so a test fires the timer itself. The prototype at
 * v0.16.0, lines 641 to 655: open on a tap or under a mouse, stay 4.5 s, fold on leaving
 * after a short pause, on a press outside, on Escape (the caller), and when the reader
 * scrolls on.
 */
export function createBlobFold(clock: BlobClock, onChange: (open: boolean) => void): BlobFold {
  let open = false
  let over = false
  let timer: unknown = null
  let armed = false

  function clear(): void {
    if (!armed) return
    clock.clearTimeout(timer)
    armed = false
    timer = null
  }

  function arm(ms: number): void {
    clear()
    timer = clock.setTimeout(() => {
      armed = false
      timer = null
      if (over) arm(BLOB_STAY_MS)
      else setOpen(false)
    }, ms)
    armed = true
  }

  function setOpen(next: boolean): void {
    const changed = open !== next
    open = next
    clear()
    if (open) arm(BLOB_STAY_MS)
    if (changed) onChange(open)
  }

  return {
    isOpen: () => open,
    toggle() {
      setOpen(!open)
    },
    close() {
      setOpen(false)
    },
    enter() {
      over = true
      setOpen(true)
    },
    leave() {
      over = false
      if (open) arm(BLOB_LEAVE_MS)
    },
    poke() {
      if (open) arm(BLOB_STAY_MS)
    },
    outside() {
      if (open) setOpen(false)
    },
    scroll() {
      if (open && !over) setOpen(false)
    },
    namePressed(coarse) {
      if (coarse && !open) {
        setOpen(true)
        return false
      }
      setOpen(false)
      return true
    },
  }
}

function coarsePointer(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches
  } catch {
    return false
  }
}

export const blob: TourPart = ({ store, settle, prefs }) => {
  const root = document.querySelector<HTMLElement>(".ui-blob")
  const title = root?.querySelector<HTMLButtonElement>(".ui-blob__title")
  const menu = root?.querySelector<HTMLElement>(".ui-blob__menu")
  const name = root?.querySelector<HTMLAnchorElement>(".ui-blob__id")
  const sound = root?.querySelector<HTMLButtonElement>("[data-blob='sound']")
  const start = root?.querySelector<HTMLButtonElement>("[data-blob='start']")
  const work = root?.querySelector<HTMLAnchorElement>("[data-blob='work']")
  const tldr = document.querySelector<HTMLAnchorElement>(".ui-blob__tldr")
  if (!root || !title || !menu || !name || !sound || !start || !work || !tldr) return
  // Copies, so the closures below keep the narrowed types.
  const blobEl: HTMLElement = root
  const titleEl: HTMLButtonElement = title
  const menuEl: HTMLElement = menu
  const nameEl: HTMLAnchorElement = name
  const soundEl: HTMLButtonElement = sound
  const startEl: HTMLButtonElement = start
  const workEl: HTMLAnchorElement = work
  const tldrEl: HTMLAnchorElement = tldr

  // The title does nothing until this part is running, so the finished page (no script,
  // or reduced motion, which never starts the parts) does not put a dead control in
  // the tab order. Once the tour is on, it is a real button.
  titleEl.tabIndex = 0

  const stops = [...blobEl.querySelectorAll<HTMLElement>(".ui-blob__stop")]
  let shown: string | null = null

  function paint(state: { nearest: number; named: boolean; after: boolean }): void {
    const view = blobView(state)
    const current = view.current === "after" ? "after" : String(view.current)
    const changed = shown !== null && shown !== current
    shown = current
    for (const stop of stops) {
      const on = stop.dataset.stop === current
      stop.classList.toggle("is-current", on)
      if (on && changed) {
        stop.classList.remove("is-swap")
        void stop.offsetWidth
        stop.classList.add("is-swap")
      }
    }
    blobEl.dataset.current = current
    blobEl.classList.toggle("is-slim", view.slim)
    if (view.slim) nameEl.setAttribute("inert", "")
    else nameEl.removeAttribute("inert")
    tldrEl.toggleAttribute("data-after", state.after)
  }

  function paintSound(on: boolean): void {
    soundEl.setAttribute("aria-pressed", String(on))
    blobEl.dataset.sound = on ? "on" : "off"
  }

  const fold = createBlobFold(
    {
      setTimeout: (callback, ms) => window.setTimeout(callback, ms),
      clearTimeout: (id) => window.clearTimeout(id as number),
    },
    (open) => {
      blobEl.classList.toggle("is-open", open)
      titleEl.setAttribute("aria-expanded", String(open))
      if (open) menuEl.removeAttribute("inert")
      else menuEl.setAttribute("inert", "")
    }
  )

  titleEl.addEventListener("click", () => fold.toggle())
  blobEl.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") fold.enter()
  })
  blobEl.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") fold.leave()
  })
  blobEl.addEventListener("pointerdown", () => {
    if (fold.isOpen()) fold.poke()
  })
  nameEl.addEventListener("click", (event) => {
    if (!fold.namePressed(coarsePointer())) event.preventDefault()
  })
  soundEl.addEventListener("click", () => {
    prefs.setSound(!prefs.sound())
  })
  startEl.addEventListener("click", () => {
    fold.close()
    settle?.goTo(0)
  })
  workEl.addEventListener("click", () => fold.close())

  const onPointerDown = (event: PointerEvent): void => {
    const target = event.target
    if (!(target instanceof Node) || blobEl.contains(target)) return
    fold.outside()
  }
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !fold.isOpen()) return
    fold.close()
    titleEl.focus()
  }
  const onWheel = (): void => fold.scroll()
  document.addEventListener("pointerdown", onPointerDown)
  document.addEventListener("keydown", onKey)
  document.addEventListener("wheel", onWheel, { passive: true })

  paintSound(prefs.sound())
  prefs.subscribe((state) => paintSound(state.sound))

  let position = store.get().position
  paint(store.get())
  store.subscribe((state) => {
    paint(state)
    if (state.position === position) return
    position = state.position
    fold.scroll()
  })
}
