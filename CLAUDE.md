# strm.dev

The site of Jan Mirecki, design engineer. This repository is public: only public facts go in. No
private notes, no employer code or internal material.

## Start and end of every session

1. Read `docs/NOW.md`: the goal, what is in progress, the next step.
2. Before each new batch of work, brief Jan in a few sentences: what, why now, what to expect, how
   it fits the architecture (`AGENTS.md`, "The briefing").
3. Work in small pull requests into `rebuild`, each linked to its issue, each with evidence (a
   render, a measurement, a test).
4. End by updating `docs/NOW.md` and adding to `docs/log/YYYY-MM-DD.md`.

Details: the `session` skill (`.claude/skills/session`).

Before touching `packages/strm-ui` or writing styles in the site: the `strm-ui` skill. Before
changing copy, content files or schemas: the `content-and-facts` skill.

Other agents work here too, on issues labelled `delegable`. Their contract is `AGENTS.md`; the lead
session reviews and merges (see the `session` skill, "Delegated work").

## Where things are

| Path                  | What                                                              |
| --------------------- | ----------------------------------------------------------------- |
| `apps/site/`          | Astro: pages, layouts, content collections, i18n routing          |
| `packages/strm-ui/`   | the design system: tokens, themes, primitives                     |
| `packages/narrative/` | the scroll engine: pure TypeScript, no framework, no Astro        |
| `tests/`              | Playwright: scenarios, rest measurements, accessibility           |
| `docs/NOW.md`         | current state                                                     |
| `docs/log/`           | the working log, one file per day                                 |
| `docs/estimates.md`   | estimates against actual time; read before giving Jan a time      |
| `docs/adr/`           | one record per architectural decision, with the options rejected  |
| `docs/v1-content/`    | the v1 pages, the source for the v2 content collections (phase 3) |

`narrative` and `strm-ui` depend on nothing. `site` depends on both. Do not cross that line.

## Rules

- **Branches.** `main` is v1, the live site. `rebuild` is v2 and the default branch. Production
  deploys only from a `v*.*.*` tag; the swap is `v2.0.0`. Never tag from `rebuild` before parity.
- **HTML is the product.** The server renders the finished page in every language. No JS and
  `prefers-reduced-motion` get that page. Motion is a layer on top.
- **Facts only.** No invented claims, no metrics. The only numbers: 15 years designing, 11 building.
  Polish and Norwegian copy is written and goes through Jan, never machine-substituted.
- **Jan decides** the narrative, the copy, the look and every architectural choice that is not
  obvious. Ask with a recommendation; show visual questions on a render. Each answer becomes an ADR.
- **Issues are units of intent.** Open one only for something that will not be finished in the
  current session. Record where it stopped and the first step on return.
- **Versions.** Check the current version and its migration notes before adding or upgrading a
  dependency. Do not trust memory.
- English everywhere in the repository.

## Commands

Node 24 (`.nvmrc`), pnpm.

```
pnpm dev      # the site, locally
pnpm check    # type check every package
pnpm test     # unit tests
pnpm build    # static build to apps/site/dist
pnpm format   # prettier
```

## The spec

The behaviour of the home page is defined by a prototype, frozen at its tag `v0.16.0`. A read-only
copy is in `docs/spec` (ADR 0008): the HTML file, scenarios A to G, the notes and the measuring
tools. `docs/spec/README.md` indexes it by line and lists where the product differs on purpose.
