// The mark of a stop: the small sign that sits left of its title in the blob and on the
// rail (ADR 0011). It is notation, the same in every language, and nobody writes it: it
// follows from the track.
//
// The numbers mean a step of the answer, as the guide counts them (`how 1`, `how 2`,
// `how 3`), so the question has none:
//
//   0      the first stop: nothing is on the page yet, and an index starts at zero
//   +      a term of the equation: every later stop of scene 0 before its chapter stop
//   =      the equation itself, the chapter stop of scene 0, and whatever follows it there
//   1      a scene with one stop
//   2.3    a scene with several: the scene, then the place of the stop in it, from 1

/** What the mark needs to know of a stop. The track order is the array order. */
export interface MarkedStop {
  readonly stage: number
  /** Set on the stop that stands for its whole scene. */
  readonly chapter?: number | undefined
}

/**
 * The mark of the stop at `index`. Throws when the index is outside the track, so a caller
 * cannot show a mark for a stop that is not there.
 */
export function stopMark(stops: readonly MarkedStop[], index: number): string {
  const stop = stops[index]
  if (!stop) throw new Error(`No stop at index ${index}.`)
  const scene = stops
    .map((other, at) => ({ other, at }))
    .filter(({ other }) => other.stage === stop.stage)
  const place = scene.findIndex(({ at }) => at === index) + 1

  if (stop.stage === 0) {
    if (place === 1) return "0"
    const chapter = scene.findIndex(({ other }) => other.chapter !== undefined) + 1
    return chapter > 0 && place >= chapter ? "=" : "+"
  }
  return scene.length === 1 ? String(stop.stage) : `${stop.stage}.${place}`
}
