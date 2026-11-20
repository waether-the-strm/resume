---
name: strm-ui
description:
  The rules of strm-ui, the design system of strm.dev - token tiers, signal and text colour pairs,
  the theme and motion axes, how to add a primitive and how to show it at /ui. Use before changing
  anything in packages/strm-ui or writing styles in apps/site.
---

# strm-ui

Plain CSS in `packages/strm-ui/src`. No build step, no framework, no dependency on the site.
Decisions behind it: `docs/adr/0003` (CSS is the token source), `0004` (what came from jan-ui),
`0005` (documented at `/ui`).

## The three tiers

| Tier         | File                    | Names                                                                        | May read                 |
| ------------ | ----------------------- | ---------------------------------------------------------------------------- | ------------------------ |
| 1 primitives | `tokens/primitives.css` | `--p-*`                                                                      | nothing: raw values only |
| 2 semantic   | `tokens/semantic.css`   | roles: `--paper`, `--ink`, `--accent`, `--space-*`, `--type-*`, `--motion-*` | tier 1                   |
| 3 component  | `tokens/component.css`  | `--pill-*`, `--tiles-*`, …                                                   | tier 2                   |

Components (`components/*.css`) and `base.css` read tiers 2 and 3. Never a `--p-*`, never a raw
colour. `pnpm test` enforces all of this, and that every `var()` used is defined.

A component token exists only for a value that is a decision of that component. Everything else the
component reads from tier 2 directly.

## Colour

- Colour only where it means something. Lines sit between things, never around them.
- **Signal and text pairs.** `--accent` is a signal: lines, marks, type of 24px and up (3:1). Small
  coloured text uses `--accent-text` (4.5:1). The same for the notes.
- **Fill and on.** A surface filled with the accent is `--accent-fill`; text on it is `--on-accent`.
- `--ink-soft` is for marks and deliberately faint words. It is not a text colour.
- Every colour is written once: `light-dark(light, dark)`. Do not add theme blocks.
- A new or changed colour is a look decision: propose it, show it at `/ui`, Jan decides. `/ui`
  measures the contrast from the CSS; "Every pair below passes" must stay true.

## Axes on `<html>`

- `data-theme="light|dark"`: switches `color-scheme` only. No attribute: the system decides.
- `data-motion="reduced|full"`: reduced sets every `--motion-*` duration to `0ms`. No attribute:
  `prefers-reduced-motion` decides.
- A new skin is a new set of tier 2 values under a new attribute. It touches no component.

## Motion

Time every transition with a `--motion-*` role and an `--ease-*` curve. Then the reduced profile
stops it without the component knowing. Animate `translate`, `scale`, `opacity`; not layout.

## Adding a primitive

1. Check it is needed by a real page, in its finished state. Take the values from the prototype.
2. `components/<name>.css`: classes prefixed `ui-`, states as `is-*`, parts as `ui-name__part`.
   Start the file with a comment that says what it is for and shows the markup.
3. Its decisions go to `tokens/component.css`. Phone values are overrides of those tokens in the
   media query there, not new rules in the component.
4. Import it in `components/index.css`.
5. Show it on `/ui/primitives` (`apps/site/src/pages/ui/primitives.astro`), composed the way a page
   uses it, with real copy.
6. `pnpm test && pnpm check && pnpm build`, then look at it: 1280 wide, 390 wide, light and dark.

The layout that arranges primitives on a page belongs to the page, not to strm-ui.

## Not yet

Rail, blob and hint (they need the engine, phase 6). Font subsetting. A print profile for `/cv`.
