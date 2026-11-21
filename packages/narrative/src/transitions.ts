// One DOM change, inside a view transition when one may run, and directly otherwise.
//
// This is the prototype's `vt` (prototype-v0.16.0.html, line 435): call
// `startViewTransition(change)` when that function exists and motion is allowed, and call
// `change()` in every other case. Both are passed in. This module does not read the
// document, listen, or import another engine module.
//
// `startViewTransition` returns before it runs the update. Until that callback runs, further
// changes wait and are applied inside the same callback, after the first, in the order they
// were requested. Once the callback has run, and until `finished` settles, a further change
// is applied in the same turn. The runner keeps that guard itself, so the page uses one
// runner for the document.
//
// A change handed to the runner is always applied, exactly once. The transition is
// decoration. If `startViewTransition` throws, or the update never runs, the runner applies
// the change and anything queued directly and returns to idle.
//
// Callers leave the document root out of the transition and name only the elements that
// move. The page stylesheet sets `::view-transition { pointer-events: none }` (prototype
// line 24) so the overlay lets clicks through for the length of the animation.

/** The part of a `ViewTransition` this module waits on. */
export interface ViewTransitionHandle {
  /** Settles when the update callback finishes, and rejects when it throws. */
  readonly updateCallbackDone: Promise<void>
  /** Settles when the animation finishes, and rejects when the transition is skipped. */
  readonly finished: Promise<void>
}

/**
 * Enough of `document.startViewTransition` to run one DOM update. The adapter passes
 * `document.startViewTransition.bind(document)`, or undefined where the API is missing.
 * The method returns before it calls the update.
 */
export type StartViewTransition = (change: () => void) => ViewTransitionHandle

export interface TransitionDeps {
  startViewTransition: StartViewTransition | undefined
  /** False when the reader has asked for reduced motion. Read on every call. */
  motionAllowed: () => boolean
}

/** Runs one DOM change. */
export type Transition = (change: () => void) => void

type Phase = "idle" | "pending" | "animating"

/** Returns the function the adapter calls with each DOM change. */
export function createTransitions(deps: TransitionDeps): Transition {
  let phase: Phase = "idle"
  let epoch = 0
  const queued: (() => void)[] = []

  return function run(change: () => void): void {
    if (phase === "pending") {
      queued.push(change)
      return
    }
    if (phase === "animating") {
      change()
      return
    }

    const start = deps.startViewTransition
    if (start === undefined || !deps.motionAllowed()) {
      change()
      return
    }

    const epochAtStart = ++epoch
    phase = "pending"
    let settled = false
    let applied = false
    const stillOurs = () => epoch === epochAtStart

    // One shot for this transition. The wrapper and a skipped update share it, so a late
    // callback cannot apply the same change again.
    const applyAll = () => {
      if (applied) return
      applied = true
      const errors: unknown[] = []
      const step = (fn: () => void) => {
        try {
          fn()
        } catch (error) {
          errors.push(error)
        }
      }
      step(change)
      while (queued.length > 0) {
        const next = queued.shift()
        if (next !== undefined) step(next)
      }
      const failure = errors[0]
      if (failure !== undefined) throw failure
    }

    // The update never ran. Apply directly and leave the transition. A throwing change
    // has already been applied; this path has no API callback to report it to.
    const applyIfPending = () => {
      if (!stillOurs() || phase !== "pending") return
      settled = true
      try {
        applyAll()
      } catch {
        // Applied above. Swallowing keeps the promise chain free of a second rejection.
      } finally {
        if (stillOurs() && phase === "pending") phase = "idle"
      }
    }

    let handle: ViewTransitionHandle
    try {
      // The browser calls this wrapper later, after it has captured the old state.
      handle = start(() => {
        try {
          applyAll()
        } finally {
          // Flip before returning. `updateCallbackDone` settles on a later microtask,
          // which is too late: a change in this same turn would queue behind a callback
          // that has already run.
          if (stillOurs()) phase = settled ? "idle" : "animating"
        }
      })
    } catch {
      // A page without the animation is still correct. A page without the change is not.
      try {
        applyAll()
      } finally {
        if (stillOurs() && phase === "pending") {
          phase = "idle"
          queued.length = 0
        }
      }
      return
    }

    const release = () => {
      if (!stillOurs()) return
      settled = true
      if (phase === "pending") {
        applyIfPending()
        return
      }
      phase = "idle"
    }
    // Both branches fulfil, so neither chain adds an unhandled rejection.
    void handle.finished.then(release, release)
    void handle.updateCallbackDone.then(applyIfPending, applyIfPending)
  }
}
