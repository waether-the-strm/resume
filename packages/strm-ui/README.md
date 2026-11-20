# strm-ui

The design system of strm.dev: tokens, themes and the few primitives the site needs.

- Depends on nothing. The site depends on it, never the other way round.
- Tokens are CSS custom properties in three tiers: primitives (raw values), semantic (paper, ink,
  accent, line, space, type and motion roles), component. Components read only the last two.
- A skin is a set of semantic values selected by an attribute on `<html>`. Adding one touches no
  component.
- Motion tokens and a reduced-motion profile exist from the start.

Status: empty skeleton. The first slice is phase 2. See `docs/adr/0003-token-source-format.md`.
