# NOW

Updated 21 Nov 2026.

## Goal

**Milestone 1, the prototype recreated**, due 22 Nov: the whole prototype works in the product
(engine, scenes, the equation, navigation, sound, effects) in English and Polish, and project pages
have a template.

## The roadmap

| #   | Milestone                | What                                                              | Due    |
| --- | ------------------------ | ----------------------------------------------------------------- | ------ |
| 1   | Prototype recreated      | the narrative works; a template for project pages                 | 22 Nov |
| 2   | Domain                   | strm.dev serves the new design from Cloudflare, still in progress | 24 Nov |
| 3   | Content and case studies | Polish copy, how projects are written about, the first case study | open   |
| 4   | Warmth                   | interactions and decorations                                      | open   |
| 5   | AI and tokens            | the browser's built-in AI restyles the page through design tokens | open   |
| 6   | Later                    | Norwegian, analytics, experiments, the insight loop               | open   |

The board: [strm.dev v2](https://github.com/users/waether-the-strm/projects/3). Every issue has a
milestone, a Status, a Horizon (now / next / later), a Who (Delegate / Lead / Jan) and, for the
first two milestones, Start and Target dates. Issues labelled `delegable` go to other agents under
`AGENTS.md`; the lead session reviews and merges.

## State

- `rebuild` is v2 and the default branch. `main` and the live site are untouched (v1, `v1.2.0`).
- Done: the workspace, CI with previews on Cloudflare, strm-ui (tokens, themes, primitives), the
  content model, the static home page in English and Polish, `/cv`, the 404 pages, social meta and
  sitemap, the self-hosted font, the engine's stop table, map, URL contract and store.
- The behavioural spec is in `docs/spec` (ADR 0008).
- Decisions: ADR 0001 to 0008. ADR 0007 (words with roles) is still proposed.

## In progress

- With other agents (batch 2): #20 Playwright (pull request #62, second round), #61 font subset, #29
  preferences, #26 phases, #27 settle, #28 transitions, #37 sound; #21 accessibility after #62.
- With the lead session: #22 narrative content, then #30 scenes and #31 the equation.

## Waiting for Jan

- #16 confirm words with roles, before the scenes.
- #40 how deep a case study goes and which is first; it blocks the project page template (#41).
- #33 what the blob holds; it blocks the blob (#35).
- #12 Polish copy, including the selected-work wording on `/cv`.

## Next step

The lead session ports the narrative content (#22) and starts the scenes (#30) while the engine
modules come back from review. The first thing Jan sees in motion is the words scene on the preview.
