// Every part of the tour, in the order they start. A new part is one file here and one line.
import { blob } from "./blob"
import { keys } from "./keys"
import { rail } from "./rail"
import { sound } from "./sound"
import type { TourPart } from "./types"

export const parts: readonly TourPart[] = [rail, blob, keys, sound]
