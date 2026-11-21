# Test scenarios — the behaviour the final site must reproduce

These scenarios are the contract between this prototype and the Astro rewrite. Each one names a state that
can be frozen with `?stage=S&t=T` here, and must be reproducible there (ideally with the same URL contract).
Use them in three ways: as a manual checklist, as the matrix for `tools/snap.sh` visual diffs, and later as
Playwright specs (assertions in brackets).

## A. Equation (stage 0)
| # | t | Expected |
|---|---|---|
| A1 | 0.00 | Empty paper; the blob bottom-centre (title `the start`, name below); no guide; dots off. [`.rule` not `.on`, `.guide[hidden]`] |
| A2 | 0.05 | The line is drawn from the centre. [`.rule.on`] |
| A3 | 0.09 | `+` sits bottom-left of the stack, nothing else above the line. [`.plus.on`, no `.row.on`] |
| A4 | 0.13 | `what?` alone (question first). [`row[0].q-on`, answer not `.in`] |
| A5 | 0.20 | `what?` with its answer; `why?` not yet. |
| A6 | 0.45 | All three questions answered; the line pulsed once; no `how?` yet. |
| A7 | 0.50 | `how?` centred below the line, no answer. [`.howrow.on`, not `.left`] |
| A8 | 0.58 | `how?` slid left, `=` visible, answer "scroll. It builds as you go." present. [`.howrow.left`] |
| A9 | 0.70 | Questions and line dissolving (warp); the `how` row intact. [`.above.warped`] |
| A10 | 0.82 | Only "how? scroll. It builds as you go." on screen, held. [`.sum.alone`] |
| A11 | 0.88 | The answer has melted; `how?` alone. |
| A12 | 0.95 | `how` is in the top-left corner; the equation block hidden; band on. [`.guide` visible, `.sum[hidden]`] |
| A13 | reverse | Scrolling back through A12→A2 replays each state; sparks fire again at the crossings. |

## B. Words (scene 1)
| # | t | Expected |
|---|---|---|
| B1 | 0.0 | Guide "how 1 First, only words. Read them." melts in; the message not yet visible. |
| B2 | 0.3 | One compact block; the first sentences visible, later ones still faded (order: headline, lead, list, who, call). |
| B3 | 1.0 | Whole block visible, monospace, no labels, no boxes. [`data-skin="words"`, `.tag` hidden] |

## C. Structure (scene 2)
| # | t | Expected |
|---|---|---|
| C1 | 0.0 | Scene 1 held at its end while the guide heading for scene 2 melts in (no snap-back). |
| C2 | 0.1 | Five boxes with lowercase names on the top edge; same words as B3. |
| C3 | 0.3 | Names capitalised (`Headline`), no syntax yet. [`.tag.c1`] |
| C4 | 0.5 | `<Headline as="h1" />` unfolded. [`.tag.c2`] |
| C5 | 0.8 | `tokens="…"` unfolded; monospace letting go; headline growing; boxes fading. [`.tag.c3`] |
| C6 | 1.0 | Sans, large headline, boxes almost gone, labels still readable. |

## D. Look (scene 3)
| # | t | Expected |
|---|---|---|
| D1 | 0.0 | Scene 2 held at its end while "how 3 Now the look. Read it again." melts in. |
| D2 | 0.1 | Two-column hero: headline (second half accent), lead; tiles not yet in; the rule above `who` in place. |
| D3 | 0.25 | Tiles 01, 02 in; 03 entering. Colour already solid. |
| D4 | 0.5 | Name line visible, the weight wave mid-sentence. |
| D5 | 0.75 | Wave passed: "I'm Jan Mirecki," at 800, rest at 400; the call entering with air. |
| D6 | 1.0 | Call visible with the pill; payoff text under the guide; everything still. |
| D7 | hold | Further scroll keeps D6 until the track ends; then the page flows to the card. |

## E. The card and the work (`?stage=jan`)
| # | Expected |
|---|---|
| E1 | Kicker row (`= how? · the same question, answered` + monogram) with one hairline below. |
| E2 | Name and the three paths start on the same height; hairlines only between paths. |
| E3 | Three project cards with visual headers; copy from `docs/FACTS.md`; hover lifts a card. |
| E4 | Guide, dots, skip and band are gone once the track is behind. [`body.after`] |

## G. Stops and navigation (live scroll, not frozen; `tools/rest.mjs`)
| # | Expected |
|---|---|
| G1 | After any wheel, trackpad, touch or key input comes to rest inside the track, the position is inside a hold. [`html[data-stop]` set] |
| G2 | Each hold shows a complete state: no half-revealed block, no scene seam, no heading over an empty page. |
| G3 | A 100 px wheel tick from any hold never returns to the same hold twice in a row unless the hold is wider than the tick. |
| G4 | ArrowDown / PageDown / Space go to the next stop, ArrowUp / PageUp / Shift+Space to the previous; after the last stop the next key lands on the card; outside the track the keys scroll natively. |
| G5 | Rail: chapter ticks and dots jump to their stop; the two arrows step one stop; the marker of the landed stop animates once. |
| G6 | Any input during a glide cancels it immediately; a finger on the screen never fights a programmatic scroll. |
| G7 | The payoff sentence is visible only with the finished look (scene 3, t > 0.9). |
| G8 | Sound is on unless the reader turned it off (stored); it can start only after the first tap, click or key. One click on entering a hold, a beat before the glide settles; passing several holds quickly gives a drier, quieter rattle. |
| G10 | The blob shows the name of the nearest stop and `n/12`; its name row leads to the card (on touch the first tap unfolds, the second goes) and folds away with the finished look and on the card, where the title reads `the card`. |
| G12 | Unfolded, the blob offers sound on/off, the start, the work, the lab; it folds back after ~4.5 s without interaction, on Escape, on a tap outside, or when the reader scrolls on. Folded, its menu is inert. |
| G13 | Scrolling on from the look, the board warps, blurs and fades over ~0.55 screens as the stage leaves; scrolling back re-forms it; at rest on the look there is no filter. [`#msg` style filter and opacity empty] |
| G11 | The rail marks the chapter and the nearest stop from the scroll position at once, not after the scene has rendered. |
| G9 | 390×664: the finished look fits the stage including the call; the stage does not resize when a toolbar moves. |

## F. Cross-cutting
| # | Expected |
|---|---|
| F1 | Reduced motion: the final page (D6) without animation; no empty states. |
| F2 | No JS: the final page (to be implemented in the rewrite: server-render the `look` state). |
| F3 | 1280×700: every scene fits the viewport under the guide band. |
| F4 | 390 and 360 px: single column, tiles numbered on the text axis, no dots, nothing clipped. |
| F5 | Keyboard: skip link, paths and the pill are focusable with visible focus. |
| F6 | `skip the tour` lands on the card. |
