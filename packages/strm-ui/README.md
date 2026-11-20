# strm-ui

The design system of strm.dev: tokens, themes and the few primitives the site needs.

- Depends on nothing. The site depends on it, never the other way round.
- Tokens are CSS custom properties in three tiers: primitives (raw values), semantic (paper, ink,
  accent, line, space, type and motion roles), component. Components read only the last two.
- A skin is a set of semantic values selected by an attribute on `<html>`. Adding one touches no
  component.
- Motion tokens and a reduced-motion profile exist from the start.

## Files

- `src/tokens/primitives.css`: tier 1, raw values (`--p-*`). Only `semantic.css` may read them.
- `src/tokens/semantic.css`: tier 2, roles. The theme and the motion profile live here.
- `src/tokens/component.css`: tier 3, empty until the first primitives.
- `src/base.css`: the document base and the type role classes.
- `src/theme-init.js`: inlined in `<head>`; restores the stored theme and motion choice before
  paint.
- `src/index.css`: all of the above plus the font, in order.

## Axes on `<html>`

- `data-theme="light|dark"`. No attribute: the system decides. Colours are written once with
  `light-dark()`; the attribute only switches `color-scheme`.
- `data-motion="reduced|full"`. No attribute: `prefers-reduced-motion` decides. Reduced sets every
  motion role to `0ms`.

## Colour rule

A colour that carries meaning has a signal token (3:1 on paper: lines, marks, large type) and a
`-text` partner (4.5:1: small text). The page at `/ui` measures every pair in both themes.

Status: the first slice (tokens, themes, type and motion roles). Primitives come next. See ADR 0003
and 0004 in `docs/adr`.
