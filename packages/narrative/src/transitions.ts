// One DOM change, inside a view transition when one may run, and directly otherwise.
//
// This is the prototype's `vt` (prototype-v0.16.0.html, line 435): call
// `startViewTransition(change)` when that function exists and motion is allowed, and call
// `change()` in every other case. Both are passed in. This module does not read the
// document, listen, or import another engine module.
//
// A change requested while a transition from this runner is still running is applied in
// the same turn. The runner keeps that guard itself, so the page uses one runner for the
// document.
//
// Callers leave the document root out of the transition and name only the elements that
// move. The page stylesheet sets `::view-transition { pointer-events: none }` (prototype
// line 24) so the overlay lets clicks through for the length of the animation.

/** The part of a `ViewTransition` this module waits on. */
export interface ViewTransitionHandle {
  /** Settles when the animation finishes, and rejects when the transition is skipped. */
  readonly finished: Promise<void>
}

/**
 * Enough of `document.startViewTransition` to run one DOM update. The adapter passes
 * `document.startViewTransition.bind(document)`, or undefined where the API is missing.
 */
export type StartViewTransition = (change: () => void) => ViewTransitionHandle

export interface TransitionDeps {
  startViewTransition: StartViewTransition | undefined
  /** False when the reader has asked for reduced motion. Read on every call. */
  motionAllowed: () => boolean
}

/** Runs one DOM change. */
export type Transition = (change: () => void) => void

/** Returns the function the adapter calls with each DOM change. */
export function createTransitions(deps: TransitionDeps): Transition {
  let running = false

  return function run(change: () => void): void {
    const start = deps.startViewTransition
    if (running || start === undefined || !deps.motionAllowed()) {
      change()
      return
    }

    // The update callback runs inside `start`, so the guard is up before that call.
    running = true
    let handle: ViewTransitionHandle
    try {
      handle = start(change)
    } catch (error) {
      running = false
      throw error
    }

    // `finished` rejects when the transition is skipped. Either settlement lifts the guard.
    // Both branches fulfil, so this chain adds no unhandled rejection.
    void handle.finished.then(
      () => {
        running = false
      },
      () => {
        running = false
      }
    )
  }
}
