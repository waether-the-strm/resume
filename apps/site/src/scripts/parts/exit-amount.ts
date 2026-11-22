/** Screens the warp takes. The prototype divides `(raw - length)` by `.55`. */
export const EXIT_SCREENS = 0.55

/**
 * 0 on the look and 1 once the stage has left by {@link EXIT_SCREENS}. Reduced motion
 * and any scene but the look stay at 0: the prototype only warps while scene 3 is
 * showing, and a reduced page never calls `exitWarp`.
 */
export function exitAmount(
  position: number,
  length: number,
  stage: number,
  motionAllowed: boolean
): number {
  if (!motionAllowed || stage !== 3) return 0
  const past = (position - length) / EXIT_SCREENS
  if (past <= 0) return 0
  if (past >= 1) return 1
  return past
}

/** The displacement map's scale at full warp. The prototype sets `x * 90` (line 535). */
export const EXIT_DISPLACEMENT = 90

/** The scale of the displacement map: nothing at rest and at the far end, where the filter is off. */
export function exitDisplacement(amount: number): number {
  if (amount <= 0 || amount >= 1) return 0
  return amount * EXIT_DISPLACEMENT
}
