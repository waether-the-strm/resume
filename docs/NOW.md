# NOW

Updated 22 Nov 2026, after the effects.

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
- **The blob holds the settings** (ADR 0012, built in #129, confirmed by Jan on the preview): its
  grid is navigation only (the start, the work); a `settings` row across both columns, marked with
  three dots, unfolds a quiet strip with sound, theme and language, in a well of the page's colour.
  The landmark holds the blob and the `tldr` link.
- **Notation** (ADR 0011): the four questions, `how` and the first stop's title (`w+w+w`) are
  English in every language and live in `content/notation`. Each stop has a mark (`0`, `+`, `=`,
  `1`, `2.1`…) from `lib/stop-mark.ts`, drawn as a faint `ui-badge` left of its title.
- **The effects are built.** The exit bends the message through the prototype's displacement map
  (`#exit-warp`) and blurs it, one exit on every pointer (#133). Sparks mark where `how` leaves the
  equation and where it lands, in the accent (#135). `how?` stands in the middle for a one-second
  beat (`HOW_BEAT_MS`) and fades there on the way back (#136).
- **The visual baseline exists**: 27 stills of the prototype in `docs/spec/baseline/`, with
  `regenerate.sh` (#134).
- How it is built: the adapter `apps/site/src/scripts/tour.ts` writes attributes, the looks are
  `apps/site/src/styles/tour.css` (ADR 0009, proposed). Everything else is a part in
  `scripts/parts`: rail, blob, keys, sound, sparks and exit. The engine, `packages/narrative`, has
  no DOM. A preference store also hears changes of the theme and motion attributes made elsewhere,
  so the blob's and the footer's controls stay in step.
- The page: home in English and Polish, a theme switch in the footer, `/cv` with a real italic face,
  project pages for projects that have a body (none published), 404 pages, prefetch on intent, a
  production-only indexing flag (not yet set in `deploy.yml`, #47). Stylesheets under 16 KB are
  inlined on purpose (`astro.config.mjs`): the home page loads one stylesheet file.
- CI: format, types, unit tests, build, about 350 Playwright tests (scenarios A to E and G by id, G
  in its own project; the tour, rail, blob, theme switch, accessibility) and a performance budget
  for the finished page and the tour. Run Playwright locally with a port of your own (`E2E_PORT`).
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

- With Cursor: nothing. No batch is open (#96).
- Nothing is half-done in the lead session.

## Waiting for Jan

- **#89 Verify the tour in motion**, at the end of 22 Nov. The points to rule on are in its last
  comment: the headline's weight against the baseline, the beat of `how?`, Safari during the exit,
  ADR 0009, the four-second fallback, G3 at 1280x820, tile 3 at 72%. It closes #30 and #31.
- **#12 Polish copy and fit**, mid-week. Not part of milestone 1.
- #47, #46, #42 stay as they were. "staff‑level" on the card renders with a gap after the hyphen;
  not investigated.
- Milestone 1's date is his to move.

## Next step

1. Jan's #89, then close #30, #31 and milestone 1.
2. Milestone 2: `STRM_PRODUCTION` on the production job (#47), #57 the 404 page on the host, #46 the
   device check.
3. If Safari is not smooth enough during the exit, one octave of noise in the map instead of two.
