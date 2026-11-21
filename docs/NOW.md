# NOW

Updated 22 Nov 2026, end of the third session. subagents).

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

- `rebuild` is v2 and the default branch, and it is protected: it changes only through a pull
  request with green checks. `main` and the live site are untouched (v1, `v1.2.0`).
- **The tour runs**, with motion allowed: the first frame holds a seed of the line that glints once;
  scrolling draws the equation in phases, then takes the one message through words, structure and
  the look, with a band and a haze under the guide. The rail and the blob show where the reader is;
  keys step between stops; stops click. Reduced motion and no JavaScript keep the finished page.
- **Notation** (ADR 0011): the four questions, `how` and the first stop's title (`w+w+w`) are
  English in every language and live in `content/notation`. Each stop has a mark (`0`, `+`, `=`,
  `1`, `2.1`…) from `lib/stop-mark.ts`, drawn as a faint `ui-badge` left of its title.
- How it is built: the adapter `apps/site/src/scripts/tour.ts` writes attributes, the looks are
  `apps/site/src/styles/tour.css` (ADR 0009, proposed). Everything else is a part in
  `scripts/parts`: rail, blob, keys, sound, and the empty `sparks` and `exit`. The engine,
  `packages/narrative`, has no DOM.
- The page: home in English and Polish, a theme switch in the footer, `/cv` with a real italic face,
  project pages for projects that have a body (none published), 404 pages, prefetch on intent, a
  production-only indexing flag (not yet set in `deploy.yml`, #47). Stylesheets under 16 KB are
  inlined on purpose (`astro.config.mjs`): the home page loads one stylesheet file.
- CI: format, types, unit tests, build, about 300 Playwright tests (scenarios A to E by id, the
  tour, rail, blob, theme switch, accessibility) and a performance budget for the finished page and
  the tour. Run Playwright locally with a port of your own (`E2E_PORT`).
- Decisions: ADR 0001 to 0008 and 0010 to 0012 accepted, 0009 proposed.

## How the work is split

The lead session keeps judgement; the rest is given away (the `session` skill, "Delegated work").
Cursor takes delegable issues, in local worktrees or in its remote environment. Everything is handed
over on GitHub: the current batch is issue #96, a finished pull request gets the label
`ready for review`, the review is a comment on it (`AGENTS.md`, "Handing work over"). `rebuild` is
protected: it changes only through a pull request with green checks.

**On starting a session:** `gh pr list --label "ready for review"` before anything else, and start a
watcher for new ones. Brief Jan before each batch.

## In progress

- With Cursor: #119 (scenarios G, #39), round 2 after the review on the pull request.
- Ready to delegate next: #38 (sparks and the exit warp; the seams are in, the notes are on the
  issue).
- Nothing is half-done in the lead session.

## Waiting for Jan

- **#89 Verify the tour in motion** (30 min), seventeen points by now. The ones that decide
  something: ADR 0009, the four-second fallback, whether the equation's line fades with the
  questions, the seed's pulse and glint, the badges in dark, the rail after the tour, whether the
  rule should travel from the equation into the look, and which is the contract where the scenario
  table and the prototype's thresholds disagree.
- **#12 Polish copy**: the drafts in `equation`, `guide`, `stops`, the interface strings of the
  rail, the blob and the theme switch. And a measured defect: the Polish look does not fit a phone
  in the tour (numbers on the issue); it needs shorter Polish or per-language sizes.
- #47: whether `/ui` is indexed; what the parity table leaves out.
- #46 device check before the domain. #42 the case studies.
- Milestone 1 was due 22 Nov and is not complete: see "Next step". Its date is his to move.
- "staff‑level" on the card renders with a gap after the hyphen. Not investigated.
- Local leftovers in `.handoff/` (the old instruction file and 17 merged hand-off files): delete?

## Next step

The lead session, in this order:

1. **#127 the blob's settings** (ADR 0012): a `settings` cell that unfolds a quiet strip with sound,
   theme and language; every change of shape animated, the spacing worked out. Jan judges it in
   motion. First step: the strip's markup and its unfolding in strm-ui, shown at `/ui/primitives` in
   both themes, before it is wired.
2. Review #119 when its round 2 arrives; then write batch 6 into #96 (#38 first).
3. What Jan decides on #89.
4. `STRM_PRODUCTION` on the production job (#47), #57 the 404 page on the host, #23 the visual
   baseline.

What milestone 1 still needs: #39 (in review), #38, #127, the Polish fit on phones (#12), and Jan's
#89.
