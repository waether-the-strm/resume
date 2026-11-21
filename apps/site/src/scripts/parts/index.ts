// Every part of the tour, in the order they start. A new part is one file here and one line.
import { blob } from "./blob"
import { rail } from "./rail"
import type { TourPart } from "./types"

export const parts: readonly TourPart[] = [rail, blob]
