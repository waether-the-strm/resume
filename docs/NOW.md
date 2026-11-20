# NOW

Updated 20 Nov 2026.

## Goal of the phase

**Phase 1, Foundation.** A workspace that builds, checks itself on every pull request, has a place
to preview work, and explains itself.

## State

- Branch `rebuild` exists with the workspace skeleton: `apps/site` (Astro 7, a placeholder page),
  `packages/strm-ui` and `packages/narrative` (empty, contracts in their READMEs).
- CI runs format, type check, tests and build on every pull request.
- Decided: workspace (ADR 0001), Cloudflare hosting (ADR 0002), CSS custom properties as the token
  source (ADR 0003).
- `main` and the live site are untouched: v1, tag `v1.2.0`.

## Plan

The board: [strm.dev v2](https://github.com/users/waether-the-strm/projects/3), with a horizon field
(now / next / later). Milestones are the phases.

## In progress

- Hosting on Cloudflare: not connected yet (#3).
- Agent skills for this repository: not written yet (#4).

## Next step

Connect the repository to Cloudflare so that `rebuild` and every pull request get a preview URL
(#3). That closes phase 1 together with the skills (#4). Then phase 2: the first slice of strm-ui,
starting with two questions for Jan (what to transplant from jan-ui, and how strm-ui is documented).
