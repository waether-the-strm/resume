// What the equation shows in each phase. `phases.ts` says which phase a progress is in; this
// says what that phase looks like, as plain flags the page turns into attributes
// (prototype-v0.16.0.html, `applyPhase`, line 464). It is a function of the phase alone, so
// every state can be reached from either side and frozen by the URL.
//
// One place differs from the prototype on purpose. There, `how` leaves the equation in phase
// 13 and appears in the corner in phase 14, so a reader who stops in between, or a URL that
// freezes `t=0.9`, shows an empty page. Here the corner has it from phase 13 on: the word
// is never nowhere.

export interface EquationRow {
  /** The row has opened and its question is there. */
  asked: boolean
  /** Its answer is there. */
  answered: boolean
}

export interface EquationState {
  /** The line is drawn. */
  line: boolean
  /** The plus sits at the foot of the stack. */
  plus: boolean
  /** The three questions above the line, in order. */
  rows: readonly [EquationRow, EquationRow, EquationRow]
  /** The line has pulsed. The pulse itself plays once, when this turns true. */
  pulsed: boolean
  /** `how?` is on the page, below the line. */
  how: boolean
  /** `how?` is centred: it has arrived and not yet moved left. */
  centred: boolean
  /** `how?` sits left, with its `=`. */
  left: boolean
  /** The answer to `how?` is there. */
  howAnswered: boolean
  /** Everything above `how?` has gone; the row stands alone. Also set by the dissolve. */
  alone: boolean
  /** `how?` itself has gone from the equation. */
  gone: boolean
  /** `how` is in the corner, as the guide's heading. */
  corner: boolean
  /** The equation is off the page. */
  hidden: boolean
}

/** The state of the equation in a phase, 0 to 14 on the default thresholds. */
export function equationAt(phase: number): EquationState {
  const row = (index: number): EquationRow => ({
    asked: phase >= 3 + 2 * index,
    answered: phase >= 4 + 2 * index,
  })
  return {
    line: phase >= 1,
    plus: phase >= 2,
    rows: [row(0), row(1), row(2)],
    pulsed: phase >= 9,
    how: phase >= 9,
    centred: phase === 9,
    left: phase >= 10,
    howAnswered: phase >= 10 && phase < 12,
    alone: phase >= 12,
    gone: phase >= 13,
    corner: phase >= 13,
    hidden: phase >= 14,
  }
}
