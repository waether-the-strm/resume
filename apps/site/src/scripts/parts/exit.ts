// Leaving the look for the card: the message warps, blurs and fades as the stage scrolls
// away, and re-forms on the way back (#38, scenario G13). Not built yet. It follows the
// store: `state.position` runs on past the end of the track (`tour.track.length`).
import type { TourPart } from "./types"

export const exit: TourPart = () => {}
