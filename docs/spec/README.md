# The spec

The behaviour of the home page is defined by a prototype: one HTML file, frozen at its tag
`v0.16.0` (20 Nov 2026) after it was tested on Android, iOS and macOS. This folder is a copy of
that prototype and of the notes that explain it. It is a reference. Nothing here is built or
shipped, and nothing here is edited: a change to the behaviour is made in the product and recorded
in an ADR.

| File | What it is |
| --- | --- |
| `prototype-v0.16.0.html` | The prototype. Open it in a browser; `?stage=S&t=T` freezes a moment, `?stage=jan` shows the card. |
| `TEST-SCENARIOS.md` | The behavioural contract, scenarios A to G. The port is accepted against these. |
| `scroll-navigation.md` | Why the page has stops, holds and a settle, with the measurements behind it. |
| `FACTS.md` | The facts that may appear on the page. |
| `notes/continuity.md` | One DOM, words as the unit of continuity, heading first, reversibility. |
| `notes/narrative.md` | The story: what each scene says and in what order. |
| `notes/visual-language.md` | Quiet UI: lines between things, colour only with meaning. |
| `notes/verify.md` | How the prototype was rendered and checked. |
| `tools/` | `rest.mjs` and `stops.mjs` measure where scrolling comes to rest; `snap.sh` and `phone.html` render the frozen moments. |
| `lab/exit-effects.html` | Seven ways for the look to leave towards the card, as stills. |

## Where to find things in the prototype

Line numbers in `prototype-v0.16.0.html`:

| Lines | What |
| --- | --- |
| 12 to 311 | all the CSS |
| 389 to 398 | the message: five blocks as data |
| 407 to 457 | building and switching scenes: `build`, `renderMsg`, `annotate`, `moveRule`, `applyT`, `set` |
| 435 | `vt`: view transitions with a fallback |
| 458 to 490 | the equation: thresholds `PH`, `applyPhase`, `equation` |
| 494 to 526 | the stop table, `place`, `holdAt`, `reached`, `nearest` |
| 530 to 550 | the blob title, the exit warp, the frame loop `onScroll` |
| 551 to 556 | frozen states and reduced motion |
| 562 to 603 | settle: `halt`, `glide`, `arrive`, `detent`, `rest`, the input listeners |
| 604 to 623 | `step`, the keys, the rail clicks and arrows |
| 624 to 640 | sound: `wake`, `tick`, the toggle |
| 641 to 660 | the blob's folding, the scroll hint |

## When the spec and this repository disagree

The ADRs in `docs/adr` win. Known differences, all on purpose:

- The prototype counts words ("the accent starts at the third word"). The product marks words with
  roles in the content (ADR 0007).
- The prototype is English only and has no dark theme.
- The prototype's notes say "no dependencies, one file". That was the prototype's rule, not the
  product's.
- The phone scroll hint in casual italic ("pssst… swipe it up") is not ported; the hint will be
  visual, and the font no longer carries those axes.
- Known defects to fix, not copy: the equation's frozen frame at `t=0.9`; the exit warp is
  unverified on iOS.
