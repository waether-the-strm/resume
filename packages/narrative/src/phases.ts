// Stage 0, the equation, moves through phases as `t` crosses a list of thresholds. `t` is the
// scene progress the store reports, from 0 to 1: the same number `place` returns. The phase is
// how many thresholds `t` has reached. Applying a phase is idempotent, so the same phase again
// calls nothing. A move that skips phases applies every phase from the next one through the
// destination, in order, and the same on the way back, so a one-shot on a skipped phase still
// runs (scenario A13).
//
// The first apply has no previous phase. It lands on the destination with direction 0, which is
// how a frozen moment and reduced motion arrive: the phases in between are not replayed.
//
// The callback is the whole effect. The page decides what a phase shows. While the phase landed
// on is the dissolve, the prototype also advances a continuous warp on every sample of `t`,
// including when the phase did not change. `warpAt` is that formula. A replay that only passes
// through the dissolve on the way to another phase does not sample it.

/** t where the line draws from the centre. Opens phase 1. */
const LINE = 0.03
/** t where the plus appears. Opens phase 2. */
const PLUS = 0.07
/** t where the question `what?` opens. Opens phase 3. */
const WHAT = 0.11
/** t where the answer to `what?` shows. Opens phase 4. */
const WHAT_ANSWER = 0.17
/** t where the question `why?` opens. Opens phase 5. */
const WHY = 0.23
/** t where the answer to `why?` shows. Opens phase 6. */
const WHY_ANSWER = 0.29
/** t where the question `who?` opens. Opens phase 7. */
const WHO = 0.35
/** t where the answer to `who?` shows. Opens phase 8. */
const WHO_ANSWER = 0.41
/** t where `how?` appears, centred, and the line may pulse. Opens phase 9. */
const HOW = 0.48
/** t where `how?` sits left and its answer shows. Opens phase 10. */
const HOW_ANSWER = 0.55
/** Opens phase 12: the answer is no longer shown, and the block stays alone. */
const PAST_DISSOLVE = 0.8
/** t where `how?` is gone. Opens phase 13. */
const HOW_VANISHES = 0.86
/** t where `how` is in the corner and the equation block is hidden. Opens phase 14. */
const CORNER = 0.92

/**
 * t where the questions and the line start to dissolve. Opens phase 11.
 * The prototype writes this threshold as `.63`.
 */
export const WARP_START = 0.63
/**
 * How far `t` moves while the dissolve runs. It finishes before the next threshold:
 * `WARP_START + WARP_SPAN` is 0.77, and phase 12 opens at 0.80.
 */
export const WARP_SPAN = 0.14
/** The dissolve filter's scale at the end of the span. The prototype's filter units. */
export const WARP_SCALE = 22
/** The dissolve runs in this phase. On the default list, the phase `WARP_START` opens. */
export const WARP_PHASE = 11

/** Thresholds of `t` from the prototype at v0.16.0. Crossing one raises the phase by one. */
export const defaultThresholds: readonly number[] = [
  LINE,
  PLUS,
  WHAT,
  WHAT_ANSWER,
  WHY,
  WHY_ANSWER,
  WHO,
  WHO_ANSWER,
  HOW,
  HOW_ANSWER,
  WARP_START,
  PAST_DISSOLVE,
  HOW_VANISHES,
  CORNER,
]

/** How many thresholds `t` has reached. 0 before the first, the length of the list at the last. */
export function phaseOf(thresholds: readonly number[], t: number): number {
  return thresholds.reduce((phase, threshold) => phase + (t >= threshold ? 1 : 0), 0)
}

/** 1 scrolling forward, -1 back, 0 when there is no previous phase. */
export type PhaseDirection = -1 | 0 | 1

export interface PhaseStep {
  phase: number
  direction: PhaseDirection
}

function directionFrom(from: number, to: number): PhaseDirection {
  if (from < 0) return 0
  if (to > from) return 1
  if (to < from) return -1
  return 0
}

/**
 * The phases to apply when moving from `from` to `to`.
 * Empty when they are equal. `from < 0` (nothing applied yet) yields the destination alone,
 * with direction 0. Otherwise every phase from the one after `from` through `to`, in order.
 * Phases are whole numbers, the counts `phaseOf` returns.
 */
export function phasesToApply(from: number, to: number): PhaseStep[] {
  if (from === to) return []
  const direction = directionFrom(from, to)
  if (direction === 0) return [{ phase: to, direction }]
  const steps: PhaseStep[] = []
  for (
    let phase = from + direction;
    direction > 0 ? phase <= to : phase >= to;
    phase += direction
  ) {
    steps.push({ phase, direction })
  }
  return steps
}

export interface PhaseTracker {
  /** The phase last applied, or -1 before the first update. */
  phase(): number
  /** Apply the phase of `t`. The same phase again calls nothing. */
  update(t: number): void
}

/**
 * Remembers the last phase. `onPhase` runs once per phase `phasesToApply` names.
 * Once an update has phases to apply, `phase()` is already the destination, including
 * while those callbacks run.
 */
export function createPhaseTracker(
  thresholds: readonly number[],
  onPhase: (step: PhaseStep) => void
): PhaseTracker {
  let current = -1
  return {
    phase: () => current,
    update(t) {
      const next = phaseOf(thresholds, t)
      const steps = phasesToApply(current, next)
      if (steps.length === 0) return
      current = next
      for (const step of steps) onPhase(step)
    },
  }
}

export interface Warp {
  /** 0 at `WARP_START`, 1 once `WARP_SPAN` has elapsed. */
  progress: number
  /** Opacity of the questions and the line: 1 at the start of the dissolve, 0 at the end. */
  opacity: number
  /** Displacement amount: 0 at the start, `WARP_SCALE` at the end. */
  scale: number
  /** True while the dissolve is between its ends. */
  dissolving: boolean
  /** True once the dissolve has finished. */
  alone: boolean
}

/** The continuous dissolve. The prototype evaluates it only while the phase is `WARP_PHASE`. */
export function warpAt(t: number): Warp {
  const progress = Math.min(1, Math.max(0, (t - WARP_START) / WARP_SPAN))
  return {
    progress,
    opacity: 1 - progress,
    scale: Math.round(progress * WARP_SCALE),
    dissolving: progress > 0 && progress < 1,
    alone: progress >= 1,
  }
}
