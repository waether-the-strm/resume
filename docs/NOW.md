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

The board: [strm.dev v2](https://github.com/users/waether-the-strm/projects/3), with a horizon field
(now / next / later). Milestones are the phases.

## In progress

- Polish copy is a draft waiting for Jan (#12).
- The finished look does not fit a 390×664 phone in Polish; the short-phone layout is not ported
  (#13).
- ADR 0007, words with roles: for Jan to confirm before the scenes are ported in phase 5.

## Next step

`/cv` and the experience collection from the v1 content in `docs/v1-content`, in English first. Then
the first Playwright checks on the static page (complete without JS, both languages, three sizes).
They need the test scenarios in a public form: a question for Jan.

Parked for phase 6, with the engine: rail, blob, hint. The `verify` skill is written with the first
Playwright checks.
