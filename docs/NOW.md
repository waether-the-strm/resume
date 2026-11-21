# NOW

Updated 21 Nov 2026, during the third session, after the equation was merged.

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
- **The tour runs.** With motion allowed, scrolling takes the reader through the equation, in
  phases, then the one message as words, as structure with its notes, and as the look. Reduced
  motion and no JavaScript keep the finished page. The adapter is `apps/site/src/scripts/tour.ts`,
  the equation's view `scripts/equation.ts`, the looks `apps/site/src/styles/tour.css` (ADR 0009,
  proposed). Other parts plug in through `scripts/parts` (rail and blob are stubs).
- The narrative is content: `equation`, `guide`, `stops` per locale; `track` and `structure` for
  every language. `narrative(locale)` in `i18n/content.ts` reads and joins them.
- The engine, `packages/narrative`: `stops`, `map`, `url`, `store`, `phases`, `settle`, `sound`,
  `transitions`, `keys`, `scenes`, `equation`. Wired to the page: store, scenes, transitions,
  settle, phases, equation. Not yet: sound, keys.
- The page: home in English and Polish, `/cv` with a real italic face, 404 pages, prefetch on
  intent, a production-only indexing flag (not yet set in `deploy.yml`, see #47).
- CI: format, types, unit tests, build, 74 Playwright tests. The older specs ask for reduced motion
  (they check the finished page); `tour.spec.ts` asks for motion.
- Decisions: ADR 0001 to 0008 and 0010 (what the blob holds) accepted, 0009 proposed.

## How the work is split

The lead session keeps judgement; the rest is given away (the `session` skill, "Delegated work").
Cursor takes delegable issues, in local worktrees or in its remote environment. Everything is handed
over on GitHub: the current batch is issue #96, a finished pull request gets the label
`ready for review`, the review is a comment on it (`AGENTS.md`, "Handing work over"). `rebuild` is
protected: it changes only through a pull request with green checks.

**On starting a session:** `gh pr list --label "ready for review"` before anything else, and start a
watcher for new ones. Brief Jan before each batch.

## In progress

- With Cursor, batch 4 (issue #96): #86 the performance budget, round 2; #32 scenarios A to E as
  specs; #34 the rail; #35 the blob. Rail and blob fill the stubs in `scripts/parts` and share one
  numbering function (`2.3`, chapter and place; ADR 0010).
- #36 key bindings: the registry is merged; wiring it and the G4 spec are the lead session's.

## Waiting for Jan

- **#89 Verify the tour in motion** (22 Nov, 20 min), with ADR 0009 and the four-second fallback. It
  comes before the equation is built on top.
- #33 what the blob holds (22 Nov, 20 min). It blocks the blob.
- #12 Polish copy, now also the drafts in `equation`, `guide` and `stops`.
- #47: whether `/ui` is indexed; what the parity table leaves out (v1 analytics, klosy.pl,
  Biletomat's status).
- #46 device check before the domain (23 to 24 Nov). #42 the case studies.
- "staff‑level" on the card renders with a gap after the hyphen. Not investigated.

## Next step

The lead session, in this order:

1. Review and merge batch 4 as it arrives; wire the rail and the blob if they need the adapter.
2. What #30 still lacks: the rule travelling from the equation to above the name line, the band and
   the haze under the guide, scenarios C6 and D7.
3. Wire keys (#36) and sound; set `STRM_PRODUCTION` on the production job (#47).
4. Then delegate #38 (sparks, the exit warp, the hint) and #39.

Also the lead session's: #57 the 404 page and caching on the host, #23 the visual baseline.
