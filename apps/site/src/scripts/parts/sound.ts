// The click a stop makes when the reader enters it (scenario G8). The sound itself is the
// engine's (`createSound`); this gives it a real audio context, wakes it on the first tap,
// click or key (a browser plays nothing before a gesture), and tells it when a hold is
// entered. Whether sound is on is the reader's preference; the blob has the switch.
import { createSound, type SoundContext } from "@strm/narrative"
import type { TourPart } from "./types"

/** The prototype waits this long after sound is turned on before the click that confirms it. */
const CONFIRM_MS = 40

export const sound: TourPart = ({ store, track, prefs }) => {
  const Context =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Context) return

  const clicks = createSound({
    createContext: () => new Context() as unknown as SoundContext,
    clock: performance,
    enabled: () => prefs.sound(),
    random: Math.random,
  })

  for (const gesture of ["pointerdown", "keydown", "touchend"] as const) {
    addEventListener(gesture, () => clicks.wake(), { passive: true })
  }

  // Entering a hold clicks at once, a beat before the glide settles. A chapter is lower.
  store.subscribe((state, previous) => {
    if (state.stop === previous.stop || state.stop < 0) return
    clicks.detent(track.stops[state.stop]?.chapter !== undefined)
  })

  // Turning sound back on answers with one chapter click.
  prefs.subscribe((state, previous) => {
    if (!state.sound || previous.sound) return
    clicks.wake()
    window.setTimeout(() => clicks.tick(true, false), CONFIRM_MS)
  })
}
