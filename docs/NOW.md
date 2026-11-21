# NOW

Updated 21 Nov 2026, end of the second session.

## Goal

**Milestone 1, the prototype recreated**, due 22 Nov: the whole prototype works in the product
(engine, scenes, the equation, navigation, sound, effects) in English and Polish, and project pages
have a template.

## The roadmap

| #   | Milestone                | What                                                              | Due               |
| --- | ------------------------ | ----------------------------------------------------------------- | ----------------- |
| 1   | Prototype recreated      | the narrative works; a template for project pages                 | 22 Nov            |
| 2   | Domain                   | strm.dev serves the new design from Cloudflare, still in progress | 24 Nov            |
| 3   | Content and case studies | Polish copy, the case studies                                     | 6 Dec (proposed)  |
| 4   | Warmth                   | interactions and decorations                                      | 20 Dec (proposed) |
| 5   | AI and tokens            | the browser's built-in AI restyles the page through design tokens | 17 Jan (proposed) |
| 6   | Later                    | Norwegian, analytics, experiments, the insight loop               | 31 Jan (proposed) |

The board: [strm.dev v2](https://github.com/users/waether-the-strm/projects/3). Every issue has a
milestone, a Status, a Horizon, a Who (Delegate / Lead / Jan) and Start and Target dates. Jan's own
queue is `who:Jan is:open`, each with a kind (Decide, Brief, Write, Verify) and a timebox.

## State

- `rebuild` is v2 and the default branch. `main` and the live site are untouched (v1, `v1.2.0`).
- The page: static home in English and Polish, `/cv`, 404 pages, social meta, sitemap. One font file
  of 49 KB, no synthesized italics.
- strm-ui: tokens, themes, primitives, tested tier rules.
- The engine, in `packages/narrative`, all unit-tested and none of it wired to the page yet:
  `stops`, `map`, `url`, `store`, `phases`, `settle`, `sound`. `transitions` is in review (#66).
- Preferences (theme, motion, sound) in `apps/site/src/lib/prefs.ts`.
- CI: format, types, unit tests, build, 52 Playwright tests including accessibility scans.
- The spec is in `docs/spec`. Decisions: ADR 0001 to 0008, all accepted.

## How the work is split

The lead session keeps judgement; the rest is given away (the `session` skill, "Delegated work").
Cursor runs delegable issues in parallel worktrees and hands each pull request over through a local
file, `pr-<number>-claude-review.md`, in the repository root. Its instructions are in the local,
uncommitted `cursor-tasks.md`.

**On starting a session:** look for hand-off files with `Status: ready for review` before anything
else, and start a watcher for new ones.

## In progress

- With Cursor: #66 transitions (third round), then batch 3: #75 load ahead of need and real italics,
  #36 key bindings, #44 performance budget, #45 release preparation, #78 words rendering, #41
  project page template.
- Nothing is half-done in the lead session.

## Waiting for Jan

- #33 what the blob holds (22 Nov, 20 min). It blocks the blob.
- #46 device check before the domain (23 to 24 Nov).
- #12 Polish copy; #42 the case studies, in a session of their own.
- The dates of milestones 3 to 6 are proposals until he confirms them.

## Next step

The lead session's own work, in this order:

1. #22 narrative content as data: the equation, the guide, the stops with names per locale, the
   per-block data of the structure scene. Polish drafts are marked for Jan.
2. The adapter that wires store, settle, phases, sound and transitions to the page, and #30 the
   scenes, starting with the words scene. Then open a `Verify` issue for Jan with the preview URL.
3. #31 the equation, from the table of what each phase triggers (pull request #67).

Also the lead session's: #57 the 404 page and caching on the host, #23 the visual baseline.
