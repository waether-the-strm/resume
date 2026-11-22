// Where the two sparks of a `how` crossing go (#38, scenario A13). Pure: a point and a
// pause, no DOM. The prototype's order (docs/spec/prototype-v0.16.0.html, lines 471 to 475):
// the spark at the place `how` leaves, then one at the place it lands a beat later.

export interface Point {
  x: number
  y: number
}

export interface Spark extends Point {
  /** Waits one beat (`--spark-beat`) before it starts. */
  late: boolean
}

/** The centre of a box, in the viewport's pixels. */
export function centre(box: { left: number; top: number; width: number; height: number }): Point {
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

/**
 * Forward (1): `how` leaves the equation for the corner, so the first spark is at the
 * equation and the late one at the corner. Back (-1) mirrors it. A place that is not on
 * the page (null) gets no spark.
 */
export function plan(
  direction: 1 | -1,
  equation: Point | null,
  corner: Point | null
): readonly Spark[] {
  const [from, to] = direction === 1 ? [equation, corner] : [corner, equation]
  const sparks: Spark[] = []
  if (from) sparks.push({ ...from, late: false })
  if (to) sparks.push({ ...to, late: true })
  return sparks
}
