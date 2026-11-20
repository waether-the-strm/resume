# 0003. CSS custom properties are the source of strm-ui tokens

Status: accepted, 20 Nov 2026. Decided by Jan.

## Context

strm-ui tokens come in three tiers: primitives (raw values), semantic (paper, ink, accent, line,
space, type and motion roles) and component tokens. A skin is a set of semantic values selected by
an attribute on `<html>`. The question is where the values are written down.

Many of the prototype's values are expressions, not constants: `color-mix()` veils, `calc()` on the
scroll progress `--t`, easing curves. The web is the only consumer today.

## Decision

Tokens are hand-written CSS custom properties, one file per tier. There is no token build step.
Names follow the tier convention of the Design Tokens Community Group format, so a JSON export can
be generated from the CSS if another consumer appears.

```css
/* primitives */
:root {
  --p-paper-100: #f6f4ef;
}

/* semantic: a skin is a set of these */
:root,
[data-theme="light"] {
  --paper: var(--p-paper-100);
  --veil: color-mix(in oklab, var(--paper) 84%, transparent);
}
```

## Rejected

**DTCG JSON compiled to CSS** (Style Dictionary or a small script). Typed, machine-checkable, ready
for Figma variables and for documentation generated from data. Rejected for now because it adds a
build dependency from the first day, and the format has no expressions, so the computed values would
live in a second, hand-written file anyway.

## Consequences

- Nothing checks a token name at build time. A test that every `var(--x)` used by a component is
  defined in the semantic or component tier is worth adding in phase 2.
- The documentation page reads the CSS, not a data file.
- Revisit if a second consumer appears (Figma variables, a native app).
