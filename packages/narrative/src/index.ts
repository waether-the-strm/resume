// The scroll engine: scroll position in, derived state out. Pure TypeScript, no framework,
// no knowledge of Astro, no DOM in the core.
export { defaultStops, layout } from "./stops.ts"
export type { PlacedStop, Stage, StopDef, Track } from "./stops.ts"
export { holdAt, nearest, place, reached, stopFor } from "./map.ts"
export type { Place } from "./map.ts"
export { parseFrozen } from "./url.ts"
export type { Frozen } from "./url.ts"
export { createStore } from "./store.ts"
export type { Listener, State, Store } from "./store.ts"
