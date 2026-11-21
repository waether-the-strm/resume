// After the scroll has been idle inside a travel, glide into the hold ahead, or back into the
// one just left. Ported from the prototype at v0.16.0, lines 562 to 623 (`halt`, `glide`,
// `arrive`, `rest`, `step`, and the input listeners).
//
// No DOM and no listeners. The adapter owns the page: it calls the handlers below, and it
// passes in the clock, the scroller and the screen height. Positions are in screens.
// The 2 px, 3 px and 8 px checks are the prototype's pixel thresholds, converted with that
// height on each use.
//
// The click on entering a hold (the prototype's `detent`) belongs to sound, not here. This
// module only calls `store.land` once the scroll has actually come to rest in a hold.
//
// Duration, for a distance measured in screens. The prototype computes it in pixels:
// `Math.min(900, 260 + Math.abs(d) / screenHeight * 700)`. Dividing by the screen height
// makes `d` a distance in screens, so:
//
//   min(900, 260 + abs(distanceScreens) * 700)
//
// Easing is cubic ease-out: `1 - (1 - k) ** 3`, where `k` is elapsed time over that duration.
//
// Direction. `f` is how far the position is through the travel ahead, 0 at the hold just left
// and 1 at the hold ahead. The prototype:
//
//   on = dir > 0 ? f > 0.12 : f >= 0.88
//
// Moving down, more than 12 % of the travel means glide on to the centre of the hold ahead;
// 12 % or less returns to 0.025 screens inside the edge just left. Moving up, the same 12 %
// is the top of the travel (`f >= 0.88`, which is `1 - 0.12`): within it, return to 0.025
// inside the edge ahead, otherwise glide on to the centre of the hold behind. `dir` is the
// sign of the last scroll change that happened while no glide was running, and it starts at +1.
import { holdAt } from "./map.ts"
import type { Track } from "./stops.ts"
import type { Store } from "./store.ts"

/** Idle before a settle, in ms. Each scroll arms this, unless a glide is running. */
const IDLE_MS = 170
/** Idle after `scrollend`, in ms. The browser has already said the scroll stopped. */
const SCROLL_END_IDLE_MS = 40
/** Fraction of a travel. Leaving a hold by no more than this returns. */
const RETURN_FRACTION = 0.12
/** Shortest glide, in ms. */
const GLIDE_MIN_MS = 260
/** Longest glide, in ms. */
const GLIDE_MAX_MS = 900
/** Added to the minimum for each screen of the glide, before the cap. */
const GLIDE_MS_PER_SCREEN = 700
/** A glide shorter than this, in px, is skipped. The prototype's `Math.abs(d) < 2`. */
const ALREADY_THERE_PX = 2
/** The reader took over when the position leaves the last write by more than this, in px. */
const DIVERGE_PX = 3
/** A return lands this far inside the hold edge, in screens. Onward lands on the centre. */
const RETURN_INSET = 0.025
/** `step` is outside the track once the position is this far past the last hold. */
const PAST_TRACK = 0.02
/**
 * Screens of stage after the last hold before the card. The prototype sizes the track to
 * `(length + 1)` screens and the card follows it, so this is the default `cardAt`.
 */
const CARD_LEAD = 1
/** Stepping back from the card still counts within this many px of the card's top. */
const CARD_SLACK_PX = 8

export interface Scroller {
  /** Position in screens, from the same origin the track is measured in. */
  read(): number
  write(position: number): void
}

export interface Clock {
  now(): number
  setTimeout(callback: () => void, ms: number): unknown
  clearTimeout(id: unknown): void
  /** `now` uses the same time base as `clock.now`. */
  requestFrame(callback: (now: number) => void): unknown
  cancelFrame(id: unknown): void
}

export interface SettleDeps {
  track: Track
  store: Store
  scroller: Scroller
  clock: Clock
  /** False under reduced motion: a glide is one write, then the landing. */
  motionAllowed: () => boolean
  /** Viewport height in CSS pixels. Must be positive. Converts the px thresholds. */
  screenHeight: () => number
  /**
   * The card, in screens, from the same origin as `scroller.read`. Omit it and the card
   * is one screen past the end of the track, which is where the prototype puts it.
   */
  cardAt?: () => number
}

export interface Settle {
  /** The scroll position changed. Arms the idle timer unless a glide is running. */
  scroll(): void
  /** The browser fired `scrollend`. Arms the shorter idle, unless a glide is running. */
  scrollEnd(): void
  /** Wheel: cancel a glide and arm the idle timer. */
  wheel(): void
  /** A finger went down. Cancel, and do not write until it lifts. */
  touchStart(): void
  /** `touchend` and `touchcancel`. The finger is up; arm the idle timer. */
  touchEnd(): void
  /**
   * Pointer down outside the rail and the blob. Cancels a glide and does not re-arm.
   * The adapter skips this when the target is inside `.dots` or `.blob`: those are
   * `goTo` and the blob's own controls.
   */
  pointerDown(): void
  /**
   * Home, End, or a key whose `step` returned false. Cancels a glide and does not
   * re-arm. `step` itself does not cancel: an arrow button that has nothing to do
   * leaves a glide running, and a key that has nothing to do calls this.
   */
  cancel(): void
  /**
   * One stop back or forward. False means there is nothing to do here, so the caller
   * lets the browser scroll.
   */
  step(direction: number): boolean
  /** Rail click: glide to the centre of that stop. An unknown index does nothing. */
  goTo(stopIndex: number): void
  dispose(): void
}

export function createSettle(deps: SettleDeps): Settle {
  const { track, store, scroller, clock, motionAllowed, screenHeight } = deps
  const cardAt = deps.cardAt ?? (() => track.length + CARD_LEAD)

  let disposed = false
  let touching = false
  let active = false
  let generation = 0
  let target = -1
  let direction: 1 | -1 = 1
  let last = scroller.read()
  let frame: unknown = null
  let frameOn = false
  let timer: unknown = null
  let timerOn = false

  function clearTimer(): void {
    if (!timerOn) return
    clock.clearTimeout(timer)
    timerOn = false
    timer = null
  }

  function arm(ms: number): void {
    clearTimer()
    timer = clock.setTimeout(rest, ms)
    timerOn = true
  }

  function stopFrame(): void {
    if (!frameOn) return
    clock.cancelFrame(frame)
    frameOn = false
    frame = null
  }

  /** The prototype's `halt`: the glide is over. A pending idle timer is left alone. */
  function halt(): void {
    active = false
    target = -1
    generation += 1
    stopFrame()
  }

  function centre(index: number): number {
    const stop = track.stops[index]!
    return (stop.from + stop.to) / 2
  }

  function commit(position: number): void {
    last = position
    scroller.write(position)
    store.setPosition(position)
  }

  function arrive(): void {
    const position = scroller.read()
    store.setPosition(position)
    if (holdAt(track, position) < 0) return
    store.land()
  }

  function glide(position: number, to: number): void {
    halt()
    if (disposed || touching) return
    const origin = scroller.read()
    const distance = position - origin
    if (Math.abs(distance) * screenHeight() < ALREADY_THERE_PX) {
      arrive()
      return
    }
    target = to
    if (!motionAllowed()) {
      active = true
      commit(position)
      active = false
      target = -1
      arrive()
      return
    }
    const duration = Math.min(GLIDE_MAX_MS, GLIDE_MIN_MS + Math.abs(distance) * GLIDE_MS_PER_SCREEN)
    const started = clock.now()
    const mine = generation
    let wrote = origin
    active = true

    const onFrame = (now: number): void => {
      if (mine !== generation || disposed) return
      if (touching) {
        halt()
        return
      }
      // `scrollY - wrote > 3` in the prototype. Both sides are pixels there.
      if (Math.abs(scroller.read() - wrote) * screenHeight() > DIVERGE_PX) {
        halt()
        return
      }
      const k = Math.min(1, Math.max(0, (now - started) / duration))
      wrote = origin + distance * (1 - Math.pow(1 - k, 3))
      commit(wrote)
      // The write is the adapter's scroll event. If that cancelled the glide, do not
      // schedule the next frame and do not land.
      if (mine !== generation || disposed) return
      if (k < 1) {
        frame = clock.requestFrame(onFrame)
        frameOn = true
        return
      }
      frameOn = false
      frame = null
      active = false
      target = -1
      generation += 1
      arrive()
    }

    frame = clock.requestFrame(onFrame)
    frameOn = true
  }

  function rest(): void {
    timerOn = false
    timer = null
    if (disposed || active || touching) return
    const position = scroller.read()
    store.setPosition(position)
    // The prototype returns before the hold check at the exact top and at the exact end.
    if (position <= 0 || position >= track.length) return
    if (holdAt(track, position) >= 0) {
      arrive()
      return
    }
    const index = track.stops.findIndex((stop) => position < stop.from)
    const next = track.stops[index]
    const previous = track.stops[index - 1]
    if (!next || !previous || next.travel === 0) return
    const progress = (position - previous.to) / next.travel
    const onward = direction > 0 ? progress > RETURN_FRACTION : progress >= 1 - RETURN_FRACTION
    const toPosition = onward
      ? direction > 0
        ? centre(index)
        : next.from + RETURN_INSET
      : direction < 0
        ? centre(index - 1)
        : previous.to - RETURN_INSET
    glide(toPosition, onward ? index : index - 1)
  }

  function scroll(): void {
    if (disposed) return
    const position = scroller.read()
    store.setPosition(position)
    if (position !== last) {
      if (!active) direction = position > last ? 1 : -1
      last = position
    }
    if (!active) arm(IDLE_MS)
  }

  function scrollEnd(): void {
    if (disposed || active) return
    arm(SCROLL_END_IDLE_MS)
  }

  function wheel(): void {
    if (disposed) return
    halt()
    arm(IDLE_MS)
  }

  function touchStart(): void {
    if (disposed) return
    touching = true
    halt()
    clearTimer()
  }

  function touchEnd(): void {
    if (disposed) return
    touching = false
    arm(IDLE_MS)
  }

  function cancel(): void {
    if (disposed) return
    halt()
  }

  function step(stepDirection: number): boolean {
    if (disposed) return false
    const position = scroller.read()
    const lastStop = track.stops.length - 1
    if (position > track.length + PAST_TRACK) {
      const slack = CARD_SLACK_PX / screenHeight()
      if (stepDirection < 0 && position <= cardAt() + slack) {
        glide(centre(lastStop), lastStop)
        return true
      }
      return false
    }
    let index = target
    if (index < 0) {
      index = holdAt(track, position)
      if (index < 0) {
        const next = track.stops.findIndex((stop) => position < stop.from)
        index = stepDirection > 0 ? next - 1 : next
      }
    }
    const to = index + stepDirection
    if (to < 0) return false
    if (to > lastStop) {
      glide(cardAt(), -1)
      return true
    }
    glide(centre(to), to)
    return true
  }

  function goTo(stopIndex: number): void {
    if (disposed) return
    if (!track.stops[stopIndex]) return
    glide(centre(stopIndex), stopIndex)
  }

  function dispose(): void {
    disposed = true
    touching = false
    halt()
    clearTimer()
  }

  return {
    scroll,
    scrollEnd,
    wheel,
    touchStart,
    touchEnd,
    pointerDown: cancel,
    cancel,
    step,
    goTo,
    dispose,
  }
}
