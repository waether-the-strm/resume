// The number of a stop, shared by the rail and the blob (ADR 0010).
//
// `<chapter>.<place>`. The chapter is the stop's stage. The place counts from 1
// among the stops of that stage, in track order. The same in every language, so
// nobody writes it. Jan has not confirmed that the equation is chapter 0; until
// he does, this is the numbering both use (`start` is `0.1`, `words` is `1.1`,
// `tokens` is `2.3`, `look` is `3.2`).

/** A stop needs only its stage. The track order is the array order. */
export interface NumberedStop {
  readonly stage: number
}

/**
 * The number of the stop at `index`. Throws when the index is outside the track,
 * so a caller cannot show a number for a stop that is not there.
 */
export function stopNumber(stops: readonly NumberedStop[], index: number): string {
  const stop = stops[index]
  if (!stop) throw new Error(`No stop at index ${index}.`)
  let place = 0
  for (let i = 0; i <= index; i++) {
    if (stops[i]!.stage === stop.stage) place += 1
  }
  return `${stop.stage}.${place}`
}
