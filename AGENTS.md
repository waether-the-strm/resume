# AGENTS.md

For any coding agent that picks up an issue in this repository (Copilot, Cursor, Claude, others).
The lead session reviews every pull request against this file. `CLAUDE.md` has the map of the
repository; `docs/NOW.md` has the current state.

This repository is public. Only public facts go in.

## The contract

1. **Work from an issue labelled `delegable`.** One issue, one branch, one pull request. If the
   issue says "Blocked by #n" and #n is open, stop and say so on the issue.
2. **Base branch is `rebuild`.** It is the default branch. Branch from it and open the pull request
   into it, with `Closes #<issue>` in the body. `main` is the live v1 site: never target it, never
   tag.
3. **Stay inside the issue.** Do what "Do" says and respect "Do not". If the task needs something
   outside its scope, write that in the pull request instead of doing it.
4. **Before you push:** `pnpm format`, `pnpm check`, `pnpm test`, `pnpm build`. Node 24, pnpm.
5. **Evidence in the pull request:** what the issue asks for (a render, a measurement, a test run),
   and a plain list of what you did not verify.
6. **A failing test is a finding.** Never weaken, skip or delete a test to get green, and never tune
   a value to make a measurement pass. Report it.

## The spec

The home page is a port of a prototype. A frozen copy is in `docs/spec`: the HTML file, the test
scenarios, the notes, the measuring tools. `docs/spec/README.md` says where each thing is in the
prototype, by line, and where the product differs from it on purpose. Read the part your issue names
before writing code. Port the behaviour and the numbers; do not copy the prototype's structure (one
script, global state, DOM reads) into the product.

## Not yours to change

Stop and ask on the issue instead:

- **Copy.** Any wording in `apps/site/src/content` or `apps/site/src/i18n/ui.ts`, in any language.
  No new claims about Jan or a project. Do not translate into Polish or Norwegian.
- **Token values** in `packages/strm-ui/src/tokens`. Add a token when a component needs one;
  changing a colour, a size or a duration is a look decision.
- **Decisions.** `docs/adr`, the workflows in `.github/workflows` (unless the issue is about CI),
  `AGENTS.md`, `CLAUDE.md`, `.claude/`, and everything in `docs/spec` (it is frozen).
- **Dependencies.** Add one only when the issue names it or cannot be done without it; check its
  current version and say why in the pull request. No UI framework, no state library, no CSS
  framework.

## How the code is laid out

- `packages/narrative`: the scroll engine. Pure TypeScript, no DOM in the core, no imports from the
  site or strm-ui. Everything that touches time, scroll or storage is injected, so unit tests use
  fakes. Tests are `node:test` files next to the code.
- `packages/strm-ui`: plain CSS in three token tiers. Components read semantic and component tokens
  only, never a `--p-*` primitive and never a raw colour. The rules are in
  `.claude/skills/strm-ui/SKILL.md` and enforced by `pnpm test`.
- `apps/site`: Astro, static output. Content is data in `src/content`, validated by
  `src/content.config.ts`; rules in `.claude/skills/content-and-facts/SKILL.md`. Text with roles is
  rendered with `<Words>`, never by hand. Styles select by role, never by word position.
- The server renders the finished page in every language. It must stay complete without JavaScript
  and under `prefers-reduced-motion`. Motion is a layer on top, timed by `--motion-*` tokens.

## What review checks

Scope matches the issue. The four commands pass in CI. The evidence is there and says what was not
verified. Nothing from "Not yours to change" was touched. New code has tests where the issue asks
for them. The preview (`https://pr-<number>-strm-dev.mirecki-janek.workers.dev`) shows what the pull
request claims.
