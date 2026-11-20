# 0005. strm-ui is documented by pages inside the site

Status: accepted, 20 Nov 2026. Decided by Jan.

## Context

strm-ui needs a place where tokens, themes, type, motion and primitives can be seen and judged,
including on a phone. Its primitives are mostly CSS and Astro components.

## Decision

Documentation pages live in `apps/site` under `/ui`. They render from the same CSS as the home page,
ship with every preview deployment, and add no dependency.

## Rejected

**Storybook.** The industry standard, with isolated states, controls and accessibility add-ons.
Rejected for its weight: a second build and deploy, and no good native support for Astro components
and plain CSS primitives.

**Nothing for now** (the package README and the CSS only). Rejected because themes and contrast
cannot be judged without a page that shows them.

## Consequences

- Documentation cannot drift from the product: it is the product's CSS.
- Component states are composed by hand; there is no controls panel.
- `/ui` is public once v2 ships. Whether it is linked from the site, and indexed, is decided before
  `v2.0.0`.
