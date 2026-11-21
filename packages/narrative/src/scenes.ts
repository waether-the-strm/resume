// Which scene is on show, and when it changes. The page has one message and four scenes;
// this decides the order of events when the reader crosses from one scene to the next
// (prototype-v0.16.0.html, `set`, line 449, and the frame loop, line 537).
//
// Heading first. On a change the heading of the new scene is given at once, and the page
// follows a beat later, inside a transition. While the heading speaks, the scene still on
// screen is frozen at the edge it is being left from: 1 going forward, 0 going back. Only
// the scene that is shown receives live progress, so the old one never snaps back to its
// start. Going to the equation has no beat: the message leaves at once.
//
// What a heading, a scene and its progress look like is the page's business. They are
// callbacks. Time and the transition are passed in too.
import type { Stage } from "./stops.ts"
import type { Transition } from "./transitions.ts"

export interface ScenesClock {
  setTimeout(callback: () => void, ms: number): unknown
  clearTimeout(id: unknown): void
}

export interface ScenesDeps {
  clock: ScenesClock
  /** Runs the DOM change of a scene switch. `createTransitions` makes one. */
  transition: Transition
  /** Say the heading of this scene. Called before the page changes. */
  heading(stage: Stage): void
  /** Put the page into this scene. Called inside the transition. */
  show(stage: Stage): void
  /** The progress of a scene, 0 to 1. Called for the scene on show, and for the equation. */
  progress(stage: Stage, t: number): void
  /** Milliseconds between the heading and the page. The prototype's 480. */
  beat?: number
}

export interface Scenes {
  /** A sample of where the reader is. Call it on every change of stage or progress. */
  update(stage: Stage, t: number): void
  /** Lands on a state with no beat and no transition: a frozen moment, or the first paint. */
  jump(stage: Stage, t: number): void
  /** The scene the page is showing, or -1 before the first sample. */
  shown(): Stage | -1
  dispose(): void
}

/** The beat between the heading and the page, in the prototype. */
export const BEAT_MS = 480

export function createScenes(deps: ScenesDeps): Scenes {
  const { clock, transition, heading, show, progress } = deps
  const beat = deps.beat ?? BEAT_MS

  /** Where the reader is. */
  let current: Stage | -1 = -1
  /** What the page shows. It trails `current` by the beat. */
  let shown: Stage | -1 = -1
  let wanted = 0
  let timer: unknown = null
  let waiting = false
  let disposed = false

  function clear(): void {
    if (!waiting) return
    clock.clearTimeout(timer)
    waiting = false
    timer = null
  }

  function land(stage: Stage, t: number): void {
    clear()
    current = stage
    shown = stage
    wanted = t
    heading(stage)
    show(stage)
    progress(stage, t)
  }

  function change(stage: Stage): void {
    current = stage
    clear()
    heading(stage)

    if (stage === shown) {
      // Back before the page followed: nothing to switch, the scene is live again.
      progress(stage, wanted)
      return
    }
    if (stage === 0) {
      transition(() => {
        show(0)
        shown = 0
        progress(0, wanted)
      })
      return
    }
    // Freeze the scene still on screen at the edge it is being left from.
    if (shown > 0) progress(shown as Stage, stage > shown ? 1 : 0)
    waiting = true
    timer = clock.setTimeout(() => {
      waiting = false
      timer = null
      if (disposed) return
      transition(() => {
        show(stage)
        shown = stage
        progress(stage, wanted)
      })
    }, beat)
  }

  return {
    update(stage, t) {
      if (disposed) return
      if (current === -1) {
        land(stage, t)
        return
      }
      wanted = t
      if (stage !== current) {
        change(stage)
        return
      }
      // The equation follows the scroll even while the message is still leaving.
      if (stage === 0 || stage === shown) progress(stage, t)
    },
    jump(stage, t) {
      if (disposed) return
      land(stage, t)
    },
    shown: () => shown,
    dispose() {
      clear()
      disposed = true
    },
  }
}
