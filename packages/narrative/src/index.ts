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
// phases.ts
export {
  WARP_PHASE,
  WARP_SCALE,
  WARP_SPAN,
  WARP_START,
  createPhaseTracker,
  defaultThresholds,
  phaseOf,
  phasesToApply,
  warpAt,
} from "./phases.ts"
// phases.ts
export type { PhaseDirection, PhaseStep, PhaseTracker, Warp } from "./phases.ts"
// sound.ts
export { createSound } from "./sound.ts"
export type {
  Sound,
  SoundClock,
  SoundContext,
  SoundDeps,
  SoundDestination,
  SoundGain,
  SoundOscillator,
  SoundParam,
  SoundWave,
} from "./sound.ts"
export { createSettle } from "./settle.ts" // settle.ts
export type { Clock, Scroller, Settle, SettleDeps } from "./settle.ts" // settle.ts
// transitions.ts
export { createTransitions } from "./transitions.ts"
export type {
  StartViewTransition,
  Transition,
  TransitionDeps,
  ViewTransitionHandle,
} from "./transitions.ts"
