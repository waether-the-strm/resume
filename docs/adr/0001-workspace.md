# 0001. A pnpm workspace with three packages

Status: accepted, 20 Nov 2026. Decided by Jan.

## Context

v2 has three parts with different lifetimes: the site (Astro pages and content), the design system
(strm-ui) and the scroll engine (narrative). The engine must stay framework-free and testable on its
own, and the design system must not learn about the site that uses it.

## Decision

A pnpm workspace:

```
apps/site/            Astro: pages, layouts, content collections, i18n routing
packages/strm-ui/     tokens, themes, primitives
packages/narrative/   the scroll engine, pure TypeScript
```

`narrative` depends on nothing. `strm-ui` depends on nothing. `site` depends on both. Packages are
private and consumed as source through `workspace:*`; nothing is published.

`.npmrc` no longer sets `shamefully-hoist`, so a package can import only what it declares.

## Rejected

**One Astro package with folders** (`src/narrative`, `src/strm-ui`) and a lint rule for the
boundaries. Less configuration, and easy to split later. Rejected because the boundary would rest on
a rule that can be switched off, and leaks tend to appear before anyone gets round to splitting.

## Consequences

- Three `package.json` files and a shared `tsconfig.base.json` to maintain.
- The engine can be type-checked and unit-tested without Astro.
- If strm-ui is ever published or reused, it is already a package.
