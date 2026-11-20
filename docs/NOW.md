# NOW

Updated 20 Nov 2026.

## Goal of the phase

**Phase 2, strm-ui, first slice.** Tokens in three tiers, light and dark, type and motion roles, the
few primitives the home page needs, and a page at `/ui` that shows them.

## State

- Branch `rebuild` exists with the workspace skeleton: `apps/site` (Astro 7, a placeholder page),
  `packages/strm-ui` and `packages/narrative` (empty, contracts in their READMEs).
- CI runs format, type check, tests and build on every pull request.
- The agent layer: `CLAUDE.md` as the navigator and the `session` skill (start and end of a
  session).
- Hosting: a Cloudflare Worker serves the static build. `rebuild` and every pull request get a
  preview on workers.dev with `noindex`; `rebuild` is at
  <https://rebuild-strm-dev.mirecki-janek.workers.dev>. Production deploys from a `v*.*.*` tag
  (written, not yet run). The strm.dev domain still points at v1 on GitHub Pages (#6).
- Decided: workspace (ADR 0001), Cloudflare hosting (ADR 0002), CSS custom properties as the token
  source (ADR 0003), four mechanisms taken from jan-ui (ADR 0004), strm-ui documented at `/ui` (ADR
  0005).
- `main` and the live site are untouched: v1, tag `v1.2.0`.

## Plan

The board: [strm.dev v2](https://github.com/users/waether-the-strm/projects/3), with a horizon field
(now / next / later). Milestones are the phases.

## In progress

- Phase 1 is complete. Phase 2 has its two decisions and no code yet.

## Next step

The token slice: primitives and semantic tokens from the prototype's `:root`, signal and text pairs,
a dark theme proposal, type and motion roles, and the `/ui` page. The dark palette and the `-text`
values are look decisions: Jan judges them on the preview.

The remaining agent skills are written with the phase that gives them something to describe:
`strm-ui` in phase 2, `content-and-facts` and `verify` in phase 3.
