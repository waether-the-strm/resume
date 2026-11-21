# Scroll navigation — research, measurements and the v15 model

19 Nov 2026. Why v15 replaced CSS snapping with **stops, holds and a settle**. Supersedes section 3 of
`scroll-affordances.md`. [V] = read in the source, [S] = search summary only, [I] = inference.

## The complaint
Scrolling felt neither fluid nor controlled on phone and desktop; the reader came to rest "between frames"
instead of at the moments that matter — "driving through tunnels with the lights switched on at random places".

## What was measured in v14.1 (headless Chrome, `tools/rest.mjs`)
- **Phone swipes rested on the seams.** Rest positions 1.3, 2.2, 3.1, 4.0 screens: exactly where one scene ends
  and the next has not started. At 1.3 the screen showed the heading "how 1" over an empty page.
- **A mouse wheel got stuck.** 100 px ticks reached 0.75 screens and every further tick was pulled back, because
  the next snap point was 256 px away. Synthetic wheel; confirm on a real mouse. Not visible on a trackpad.
- **Rest states were half-built** (words half revealed, the weight wave mid-sentence).
- **The payoff line appeared at the start of the look**, not at its end as the narrative says.
- On a 390×664 phone viewport (iPhone with the toolbar showing) the finished message did not fit: the call was
  below the fold. `100vh` had been hiding this behind the toolbar.

## What the evidence says
Pacing and control
- Step-triggered and scrubbed are both legitimate; timed transitions "avoid the possibility of sitting in a
  transition indefinitely". Snapping to fixed positions is "extraordinarily sensitive". Support the standard scroll
  keys. [V] https://bost.ocks.org/mike/scroll/
- The newsroom toolchain is step-first; continuous progress is opt-in. [V] https://github.com/russellsamora/scrollama
- Fast scrolls skip steps: replay every in-between step in order. [V] https://vallandingham.me/scroller.html
- Scrolljacking threatens "user control and freedom"; what restores it: a tested scroll rate, little text inside
  the sequence, visible navigation the reader can use to leave. Carrying it to mobile makes it worse.
  [V] https://www.nngroup.com/articles/scrolljacking-101/
- Hold zones are an explicit technique (empty tweens on a pinned timeline; snap to labels, directional).
  No source gives a hold-to-travel ratio. [V] https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- "If you make the reader click or do anything other than scroll, something spectacular has to happen" — buttons
  are an addition to scroll, not the path. [V] https://garciamedia.com/blog/interactive_graphics_less_is_best_at_ft/
- On phones: keep it scrolly or stack it; do not override swipes; do not size steps in `vh`.
  [V] https://pudding.cool/process/responsive-scrollytelling/
- Gaps: no primary source for Apple, Stripe or Linear pacing rules; no discoverability data on dots or arrows.

Browser mechanics
- `proximity` is engine-defined: about a third of the viewport in Chromium and WebKit, 200 px in Firefox. With
  stops ~100 px apart every position is in range of some stop, so it behaves like `mandatory`. [V/I]
  https://www.w3.org/TR/css-scroll-snap-1 · https://trac.webkit.org/changeset/278862/webkit
- iOS Safari drops momentum under scroll snap (WebKit bug 243582, still open). [V] https://bugs.webkit.org/show_bug.cgi?id=243582
- Chrome snaps a wheel tick in a separate animation after a timeout; Firefox can fail to leave a snap point with
  slow ticks. [V] https://issues.chromium.org/issues/40762499 · https://bugzilla.mozilla.org/show_bug.cgi?id=1753188
- `scrollend`: Chrome 114, Firefox 109, Safari 26.2 — a timer fallback is still required. [V] https://caniuse.com/mdn-api_element_scrollend_event
- GSAP's snap, the model for the settle: wait for idle, pick the stop in the direction of travel, short eased
  tween, cancel on wheel/touch or when the scroll position diverges from what the tween wrote. [V] GSAP source.
- iOS: never write the scroll position during a touch or a fling. [S] https://github.com/TanStack/virtual/issues/1307
- `vh` on phones is the large viewport, so a `100vh` stage overflows while the toolbar shows; `svh` is stable,
  `dvh` resizes mid-scroll. [V] https://web.dev/blog/viewport-units
- During a view transition the overlay swallows clicks unless `::view-transition{pointer-events:none}`. [V] CSSWG 7797
- `scrollTo({behavior:'smooth'})` has no controllable duration or easing. [V] MDN

Sound and haptics
- Evidence exists only against unexpected sound; guidance is muted by default, one action to change. [S] Awwwards,
  Material. Scroll and wheel are not user activations, so audio must be unlocked by a click or key. [S] HTML spec
- Web Audio follows the iOS silent switch; leave it that way. [S]
- Haptics: `navigator.vibrate` is Android only; the iOS switch trick needs a real tap since iOS 26.5. Not
  achievable for scroll stops on an iPhone. [S]

## The v15 model
1. **Stops.** Twelve complete states of the story (table `STOPS` in `index.html`): the start, `what?`, `why?`,
   `who?`, the equation, the answer alone, the words, the structure, components, tokens, the tiles, the look.
2. **Holds.** Each stop owns a stretch of scroll (0.12–0.45 screens) in which nothing narrative changes. All
   change happens in the travel between two holds. A seam between scenes is always inside a travel.
3. **Native scroll, then a settle.** No CSS snap, no wheel or touch interception. Once the scroll has been idle
   (170 ms, or `scrollend`) inside a travel, the page glides the rest of the way into the hold ahead; if the reader
   left a hold by less than 12 % of the travel, it returns. Cubic ease-out, 260–900 ms. Cancelled by wheel, touch,
   pointer, keys, or a 3 px divergence. Never runs while a finger is down.
4. **Previous / next as an addition.** Arrow keys, Space, Page keys and two rail arrows step one stop. The rail
   lists every stop (chapter ticks with labels, quiet dots between, dots hidden on phones; arrows stay).
5. **Landing cue.** The rail marker of the stop clicks into place; a polite live region names it;
   `html[data-stop]` carries the index (also the test hook).
6. **Sound is on unless turned off** (Jan's decision on the artefact, 19 Nov, against the opt-in guidance above:
   the tick is quiet, it helps navigation, and one tap turns it off). `sound: on` beside the skip link, a note in
   the rail gutter on phones; the choice is stored. Browsers start audio only after the first tap, click or key,
   so a reader who only scrolls hears nothing. The click fires on entering a hold, a beat before the glide
   settles; holds passed within 260 ms of each other get a drier, quieter click, so a fast scroll rattles like a
   ratchet. No haptics.
7. **`svh`** for the stage and the track; a compact layout for short phones so the call fits.
8. **The payoff line** appears with the finished look (t > 0.9), not with the scene heading.

Dropped on purpose: a stop on the name line (the weight wave and the call overlap in time, so no clean rest
exists there; the wave is travel), haptics, one-gesture-one-step wheel hijacking.

## Measured after (same tool)
Wheel ticks, trackpad drags, touch swipes of three lengths, keys and rail clicks: every rest inside the track is
inside a hold. One 100 px wheel tick moves one stop in the equation; no trap.

## Not verifiable here — to feel on devices
Real iOS Safari (momentum, the settle after a fling, toolbar collapse), desktop Safari and Firefox, a real mouse
wheel, the feel of the glide durations and hold lengths, the sound itself. 360×640 phones still clip the pill by
a few pixels.
