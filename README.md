# strm.dev

The site of Jan Mirecki, design engineer.

- `main` is v1, the live site (tags `v1.0.1` to `v1.2.0`).
- `rebuild` is v2: a home page that builds itself as you scroll, on its own design system, in
  English and Polish. It replaces v1 at the tag `v2.0.0`.

The repository documents itself: [`docs/NOW.md`](docs/NOW.md) for the current state,
[`docs/log/`](docs/log) for the working log, [`docs/adr/`](docs/adr) for the decisions.

```
apps/site/            Astro: pages, layouts, content collections, i18n routing
packages/strm-ui/     the design system: tokens, themes, primitives
packages/narrative/   the scroll engine: pure TypeScript, no framework
tests/                Playwright: scenarios, rest measurements, accessibility
```

Node 24, pnpm. `pnpm install`, then `pnpm dev`, `pnpm check`, `pnpm build`.
