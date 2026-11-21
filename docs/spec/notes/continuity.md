---
name: continuity
description: The motion doctrine of the page — one DOM, words as the unit of continuity, view transitions, scroll-driven --t, heading-first timing, frozen edges, reversible phases. Use when adding or changing any transition, scene, or scroll mapping.
---

# Continuity

## Rules
1. **One DOM.** From scene 1 to 3 the message is built once; only `data-skin` and labels change. Never
   re-render the message between scenes (that is what caused the flicker in v7).
2. **Words are elements.** Every word is `<span class="w">` with its own `view-transition-name` (and `--j`
   index). Layout changes are animated by the browser per word; words fly to their new places.
3. **Scroll drives `--t`.** Inside a scene, progress is a CSS variable; everything continuous (font axes via
   Recursive `MONO`/`wght`, sizes, colour via `color-mix`, opacity, staggered entries) derives from `--t` in CSS.
   Reverse scroll must look right because it is the same function evaluated backwards.
4. **Heading first.** On a scene change the guide heading melts in immediately; the page changes ~480 ms
   later inside `document.startViewTransition`.
5. **Freeze the edge.** While the heading speaks, the scene still on screen keeps `--t` at the edge it leaves
   from (1 going forward, 0 going back). Only the scene actually shown (`shown`, not `cur`) receives live
   progress. This is the fix for "the previous scene snaps back to its base state".
6. **Labels grow in place.** One label element per block; its parts unfold (`h` → `H`, then `< as="h1" />`,
   then `tokens="…"`) with width transitions. Nothing is swapped.
7. **Stage 0 is phases.** Thresholds in `PH`; `applyPhase(p, dir)` is idempotent for static state and fires
   one-shot effects (pulse, sparks) only on crossing, in both directions. Skipped phases are replayed in order.
8. **The line travels.** The equation's rule is the same DOM node that moves above the `who` block in the
   look (`moveRule`), with `view-transition-name: rule`.
9. **Reduced motion and no-JS** get the final page. Animations off, nothing missing.
10. **Stops, holds, settle.** Scroll maps to the story through the `STOPS` table: each stop is a complete state
   with a hold in which nothing changes; change lives only in the travel between holds, and scene seams sit
   inside a travel. No CSS snap. After the scroll rests in a travel the page glides into the hold ahead; any
   input cancels. A new moment worth resting on gets a stop; a moment that is only motion stays travel.
   Rationale and sources: `docs/scroll-navigation.md`.

## Checklist for any new transition
- Does the element exist before and after, with the same identity? If not, can it?
- What does it look like at 25 %, 50 %, 75 % of the scroll? Render those moments (`?stage=S&t=T`).
- What happens scrolling back? Render t descending.
- Does the guide heading change before the content? Is the old content frozen meanwhile?
- Does it still read with `prefers-reduced-motion: reduce`?
- Where does the reader rest before and after it? Is each rest a complete state (`tools/rest.mjs`)?
