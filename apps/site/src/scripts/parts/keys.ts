// The keys that move between stops (scenario G4). Which key does what is the engine's
// registry (`createKeys`); this only describes each keydown to it and prevents the browser's
// own scrolling when the registry says the key was used. Outside the track `step` has
// nothing to do, the registry says so, and the key scrolls as it always does.
import { createKeys, type FocusKind } from "@strm/narrative"
import type { TourPart } from "./types"

/** What the registry needs to know about focus: a link or a field wins over a button. */
function focusKind(target: EventTarget | null): FocusKind | undefined {
  if (!(target instanceof Element)) return undefined
  const holder = target.closest("a, input, textarea, select") ?? target.closest("button")
  return holder ? (holder.tagName.toLowerCase() as FocusKind) : undefined
}

export const keys: TourPart = ({ settle }) => {
  // A moment frozen by the URL has nowhere to step to.
  if (!settle) return
  const registry = createKeys(
    { step: (direction) => settle.step(direction), cancel: () => settle.cancel() },
    // The rows of a shortcut hint. Nothing shows them yet, so they have no words yet.
    { next: "", previous: "" }
  )
  addEventListener("keydown", (event) => {
    const focus = focusKind(event.target)
    const used = registry.handle({
      key: event.key,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      ...(focus ? { focus } : {}),
    })
    if (used) event.preventDefault()
  })
}
