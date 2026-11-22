# NOW

Updated 22 Nov 2026, end of the day.

## Goal

**Milestone 2, the domain**, due 24 Nov: strm.dev serves the new design, in English. Polish waits
for Jan's reading (#47, #12); v2 is released in English only.

Milestone 1, the prototype recreated, was closed by Jan on 22 Nov (30 issues). His words on the
state: better than good enough for now.

## The roadmap

| #   | Milestone                | What                                                              | Due               |
| --- | ------------------------ | ----------------------------------------------------------------- | ----------------- |
| 1   | Prototype recreated      | done: the narrative works; a template for project pages           | 22 Nov, done      |
| 2   | Domain                   | strm.dev serves the new design, in English; the goal now          | 24 Nov            |
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
  The landmark holds the blob and the `tldr` link. The blob works without the tour (reduced motion);
  without JavaScript the other language is a `noscript` link. The footer's language and theme
  controls are gone (#149, ADR 0012 amended).
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
  `apps/site/src/styles/tour.css` (ADR 0009). Everything else is a part in `scripts/parts`: rail,
  blob, keys, sound, sparks and exit. The engine, `packages/narrative`, has no DOM. A preference
  store also hears changes of the theme and motion attributes made elsewhere. The settle tells the
  store what the page kept of its write (#155).
- The page: home in English and Polish (v2 is released in English only), `/cv` with a real italic
  face, project pages for projects that have a body (none published), 404 pages, prefetch on intent,
  a production-only indexing flag (not yet set in `deploy.yml`, #47). Stylesheets under 16 KB are
  inlined on purpose (`astro.config.mjs`): the home page loads one stylesheet file.
- **Search and sharing** (#154): JSON-LD `Person`, `WebSite` and `ProfilePage` from content, a share
  image per language (a start), the slash form everywhere, a sitemap of the four indexable pages.
  The desktop scroll hint hides once the page is more than 8 px down, the prototype's rule (#153).
- CI: format, types, unit tests, build, about 350 Playwright tests (scenarios A to E and G by id, G
  in its own project; the tour, rail, blob, accessibility) and a performance budget for the finished
  page and the tour. Run Playwright locally with a port of your own (`E2E_PORT`).
- Decisions: ADR 0001 to 0008 and 0010 to 0012 accepted, 0009 accepted on 22 Nov.

## How the work is split

The lead session keeps judgement; the rest is given away (the `session` skill, "Delegated work").
Cursor takes delegable issues, in local worktrees or in its remote environment. Everything is handed
over on GitHub: the current batch is issue #96, a finished pull request gets the label
`ready for review`, the review is a comment on it (`AGENTS.md`, "Handing work over"). `rebuild` is
protected: it changes only through a pull request with green checks.

**On starting a session:** `gh pr list --label "ready for review"` before anything else, and start a
watcher for new ones. Brief Jan before each batch.

## In progress

- With Cursor: nothing. No batch is open (#96); batch 7 is merged in full, the phone's swipe finger
  last (#161). No watcher is running.
- Nothing is half-done in the lead session.

## Waiting for Jan

- **One round, prepared on renders**: the role as Product Design Engineer (#157), where the note on
  the still page goes (#151), the `/cv` link on the home page, and whether `/ui` is indexed (#47).
  The renders for #157 are not prepared yet.
- **#46** the device check; **#6** the domain to Cloudflare, at the DNS.
- **#12** Polish copy and fit, mid-week; **#42**; **#156** a share image that makes people curious.
- "staff‑level" on the card renders with a gap after the hyphen; still not investigated.

## Next step

1. Prepare the renders for the round with Jan (#157, #151, `/cv`, `/ui`), then hold it.
2. The release path of milestone 2: take `pl` out of `launched` and decide what `/pl/` answers;
   `STRM_PRODUCTION` on the production job (#47); #57 the 404 page on the host.
3. Jan looks at the phone's swipe finger on his own phone (merged after he saw it under the blob;
   the place was measured on the preview, not on a device). #158 (G3 at 1280x820) when the engine is
   next opened. If Safari is not smooth enough during the exit, one octave of noise in the map
   instead of two.
