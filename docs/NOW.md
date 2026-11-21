# NOW

Updated 20 Nov 2026.

## Goal of the phase

**Phase 3, the content model and the static finished page**, in English and Polish, with no JS.
`/cv` from the same data.

## State

- `rebuild` is v2 in progress; `main` and the live site are untouched (v1, tag `v1.2.0`).
- Workspace: `apps/site` (Astro 7), `packages/strm-ui`, `packages/narrative` (still empty).
- CI on every pull request: format, type check, unit tests, build. Every pull request and `rebuild`
  get a preview on Cloudflare with `noindex`; `rebuild` is at
  <https://rebuild-strm-dev.mirecki-janek.workers.dev>. Production deploys from a `v*.*.*` tag
  (written, never run). The strm.dev domain still points at v1 on GitHub Pages (#6).
- strm-ui: tokens in three tiers, light and dark, type and motion roles, and the first primitives
  (words, pill, tiles, rule, panel, paths, work). Shown at `/ui` and `/ui/primitives`. Tier rules
  are tested. Token values are provisional: Jan tunes them on the assembled page.
- Content: collections with strict schemas for the message, the card and the projects, one file per
  entry and locale. The home page at `/` and `/pl/` is the finished look, the card and three
  projects, rendered on the server with no JS.
- Agent layer: `CLAUDE.md` and the skills `session`, `strm-ui`, `content-and-facts`.
- Decisions: ADR 0001 workspace, 0002 Cloudflare, 0003 CSS tokens, 0004 transplants from jan-ui,
  0005 docs at `/ui`, 0006 content in git. ADR 0007 (words with roles) is proposed.

## Plan

The board: [strm.dev v2](https://github.com/users/waether-the-strm/projects/3). It holds the whole
plan to `v2.0.0` and the milestones after it: every issue has a phase (milestone), a Horizon (now /
next / later) and a Who (Delegate / Lead / Jan). Issues labelled `delegable` can go to another agent
under `AGENTS.md`; the lead session reviews and merges into `rebuild`.

## In progress

- Polish copy is a draft waiting for Jan (#12).
- The finished look does not fit a 390×664 phone in Polish; the short-phone layout is not ported
  (#13, delegable).

## Waiting for Jan

- #15 where the behavioural spec lives. It gates every delegable task of phases 4 to 6: an agent
  working only in this repository cannot see the prototype.
- #16 confirm words with roles (ADR 0007), before phase 5.

## Next step

Ready to delegate now, with no blocker: #17 `/cv` from content, #20 Playwright on the static page,
#13 the phone fit, #18 site basics, #19 font subsetting. The lead session reviews and merges.

Parked for phase 6, with the engine: rail, blob, hint. The `verify` skill is written with the first
Playwright checks.
