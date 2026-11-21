# NOW

Updated 21 Nov 2026, end of the third session.

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
- **The tour runs**, with motion allowed: the first frame holds a seed of the line; scrolling draws
  the equation in phases, then takes the one message through words, structure and the look. The rail
  and the blob show where the reader is; keys step between stops; stops click. Reduced motion and no
  JavaScript keep the finished page.
- How it is built: the adapter `apps/site/src/scripts/tour.ts` writes attributes, the looks are
  `apps/site/src/styles/tour.css` (ADR 0009, proposed). Everything else is a part in `scripts/parts`
  (rail, blob, keys, sound). The engine, `packages/narrative`, has no DOM; all of its modules are
  wired.
- The narrative is content: `equation`, `guide`, `stops` per locale; `track` and `structure` for
  every language (`narrative(locale)` in `i18n/content.ts`).
- The page: home in English and Polish, `/cv` with a real italic face, project pages for projects
  that have a body (none published), 404 pages, prefetch on intent, a production-only indexing flag
  (not yet set in `deploy.yml`, #47).
- CI: format, types, unit tests, build, about 290 Playwright tests (scenarios A to E by id, the
  tour, rail, blob, accessibility) and a performance budget for the finished page and the tour.
- Decisions: ADR 0001 to 0008 and 0010 accepted, 0009 proposed. Decided and not yet written: ADR
  0011, the notation (#110).

## How the work is split

The lead session keeps judgement; the rest is given away (the `session` skill, "Delegated work").
Cursor takes delegable issues, in local worktrees or in its remote environment. Everything is handed
over on GitHub: the current batch is issue #96, a finished pull request gets the label
`ready for review`, the review is a comment on it (`AGENTS.md`, "Handing work over"). `rebuild` is
protected: it changes only through a pull request with green checks.

**On starting a session:** `gh pr list --label "ready for review"` before anything else, and start a
watcher for new ones. Brief Jan before each batch.

## In progress

- With Cursor, batch 5 (issue #96), not started: #108 the blob's surface and a two-column menu, #109
  a theme switch in the footer, #39 scenarios G and the rest measurements.
- Nothing is half-done in the lead session.

## Waiting for Jan

- **#89 Verify the tour in motion** (22 Nov, 30 min), twelve points: the scenes, the equation and
  whether its line fades with the questions, the seed's pulse and glint, the rail after the tour,
  the blob on the finished page, keys and sound by ear, ADR 0009, the four-second fallback, and
  which is the contract where the scenario table and the prototype's thresholds disagree.
- #12 Polish copy, now also the drafts in `equation`, `guide`, `stops` and the interface strings of
  the rail and the blob.
- #47: whether `/ui` is indexed; what the parity table leaves out.
- #46 device check before the domain (23 to 24 Nov). #42 the case studies.
- Milestone 1 is due 22 Nov and will not be complete that day: see "Next step". Its date is his to
  move.
- "staff‑level" on the card renders with a gap after the hyphen. Not investigated.
- Local leftovers in `.handoff/` (the old instruction file and 17 merged hand-off files): delete?

## Next step

The lead session, in this order:

1. **#110 the notation**: ADR 0011, the questions as shared content in English, the marks (`0`, `+`,
   `=`, `1`, `2.1`…) as a faint badge left of the title in the blob and on the rail, the first stop
   as `w+w+w`. First step: the content schema.
2. Review batch 5 as it arrives.
3. What #30 still lacks: the rule travelling from the equation to above the name line, the band and
   the haze under the guide.
4. The stubs and hooks that let #38 be delegated: the exit warp as a part, two events from
   `equation.ts` for the sparks.
5. #111 stylesheet inlining, `STRM_PRODUCTION` on the production job (#47), #57 the 404 page on the
   host, #23 the visual baseline.

What milestone 1 still needs after today: #110, #108, #109, #39, the rest of #30, #38, and Jan's
#89. That is more than one day.
