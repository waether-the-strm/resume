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

- strm-ui: tokens in three tiers, light and dark, type and motion roles, and the first primitives
  (pill, tiles, rule, panel, paths, work). Shown at `/ui` and `/ui/primitives`. Tier rules are
  tested. Token values are provisional: Jan tunes them on the assembled page.

## Next step

Phase 3: the content model and the static finished page, in English and Polish, with no JS. It
starts with two questions for Jan: Q5 (files in git edited by AI only, or a git-based CMS from the
start) and where the public copy of the test scenarios lives. Decide the data shape for words with
roles (`name`, `accent`) before any scene is ported.

Left in phase 2, to do with the engine in phase 6: rail, blob, hint. The agent skills
`content-and-facts` and `verify` are written in phase 3.
