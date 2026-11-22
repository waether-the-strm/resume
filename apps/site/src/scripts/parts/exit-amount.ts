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
