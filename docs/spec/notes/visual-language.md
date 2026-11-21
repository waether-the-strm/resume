---
name: visual-language
description: Tokens, type, colour roles, line discipline, and the "quiet UI, not a zine" rule for strm.dev. Use for any change to layout, spacing, colour, typography, cards, tiles, or the final board.
---

# Visual language

## Tokens (in `:root`)
- Surfaces: `--bg #f6f4ef` (paper), white cards, `--line #d8d3c8` hairlines.
- Ink: `--ink #161513`, `--mute #6b675f`, `--soft #a39e94`.
- Accent: `--accent #e4482c`, used only where it means something: the second half of the headline, tile
  numbers, the primary path, the pill, the monogram.
- Syntax colours (annotations): semantic names `--sem` (= accent, they carry content), HTML elements `--el`
  steel blue `#3a6ea5`, tokens `--tok` moss `#5f7f2a`, punctuation grey. Consistent on every scene.

## Type
- One family: Recursive (variable). Axes used: `MONO` 1 → 0 for the mono-to-sans morph, `wght` 300–1000 for
  weight waves and hierarchy, `CASL` kept at 0. Mono for the guide, signature, kickers, labels; sans for the
  built page. Weight contrast must be real (800 vs 400), not 600 vs 450.
- Hero headline ~52 px / 1.0 / −0.025 em, weight 800. Body 17 px / 1.55. Guide 14 px mono.

## Line discipline ("linioza")
- Lines separate; they never frame. Tiles and menu rows get a hairline **between** items only, not above the
  first nor below the last. Avoid a rule close to a box edge or stacked within ~40 px of another rule.
- The one strong line is the travelling rule (equation → above `who` → card kicker).

## Forms
- Prefer UI forms over typography-only composition: numbered tiles, a card with a monogram, menu rows with an
  arrow that slides on hover, a pill for the single primary action, project cards with visual headers
  (gradient with rings, grid with a court, token swatches with "Aa").
- Cards: 1 px `--line` border, radius 8, white, soft long shadow. Inner rhythm: 32–40 px padding, kicker row
  with a hairline below, columns aligned at the top.
- Air: when something enters last (the call), give it more space than the things before it.

## Balance checks
- Nothing heavy at the top of a card; the kicker row carries the small things (label, monogram).
- Accent appears at most 4–5 times on a screen.
- Mobile: single column, tiles with the number on the text axis, no step dots, the guide gets 150 px of room.
