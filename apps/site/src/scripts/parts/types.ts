// A part of the tour: something on the page that follows the story or steers it (the rail,
// the blob, the keys, sound). The adapter (../tour.ts) starts the engine and hands every
// part the same running tour. A part reads the store and calls settle; it never reads the
// scroll position itself and never keeps its own copy of the state.
import type { Settle, Store, Track } from "@strm/narrative"
import type { Prefs } from "../../lib/prefs"

export interface Tour {
  /** The engine's state. Subscribe to it. */
  store: Store
  track: Track
  /**
   * Steering: `step`, `goTo`, `cancel`. Null when the URL froze a moment (`?stage=S&t=T`):
   * there is nothing to scroll then, and a part only shows where the moment is.
   */
  settle: Settle | null
  /** Theme, motion and sound, as the reader set them. */
  prefs: Prefs
  /**
   * `how` changes place: it leaves the equation for the guide's corner (direction 1) or
   * comes back from it (direction -1). Called when the reader crosses that point, not when
   * the page lands on a state past it. The prototype fires a spark at each end. Returns the
   * function that stops listening.
   */
  onHowMoves(listener: (direction: 1 | -1) => void): () => void
}

/** Called once, after the first scene is on show. */
export type TourPart = (tour: Tour) => void
