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

## The briefing

Before the first change of a new batch of work (an issue you pick up, a group of issues, the goal of
a session), tell Jan what is coming. He reads it as the owner of the product and as its tech lead:
he wants to know where the project is and whether it is still growing in one direction. In the chat,
in the language he writes in, three to five sentences:

- **What** the batch is about.
- **Why now:** what it follows from and what it unblocks.
- **What to expect once it is merged:** what he will be able to see, use or decide, and what will
  still be missing.
- **How it fits:** which part of the architecture it touches, and whether it follows the decisions
  already made (`docs/adr`) or needs a new one.

Dense, not detailed: no file lists, no function names, no plan of steps. Then start; the briefing is
not a question and does not wait for an answer.

## Handing work over

Agents work in different places: a worktree beside the lead session, or a remote environment. What
they share is GitHub, so that is where work is handed over. No file in the repository and no local
file is part of it.

| What                        | Where                                                         |
| --------------------------- | ------------------------------------------------------------- |
| The current batch           | issue #96, pinned. Its text is replaced with each batch       |
| Notes on one task           | a comment on its issue, headed "Notes for whoever takes this" |
| The hand-over               | the pull request, written from the template                   |
| "Ready", "changes", "stuck" | the labels `ready for review`, `changes requested`, `blocked` |
| The review                  | a comment on the pull request                                 |

**Start.** Read the batch (`gh issue view 96`), then your issue with its comments
(`gh issue view <n> --comments`). Take only an issue the batch lists. One branch per issue, cut from
`origin/rebuild`. On a shared machine use a worktree of your own
(`git worktree add ../resume-wt/<branch> -b <branch> origin/rebuild`) and never work in the main
checkout or switch its branch: the lead session is in it.

**Finish.**

1. `git fetch origin && git rebase origin/rebuild`, then the four commands. Rebase before you
   measure: CI tests your branch merged with `rebuild`, and a number taken on an old base is wrong.
2. Push, and open the pull request into `rebuild`. Fill in every section of the template; "Not
   verified" must be honest.
3. Wait for the checks (`gh pr checks <n> --watch`). A failing check is yours to fix.
4. Only then: `gh pr edit <n> --add-label "ready for review"`. That label is the hand-over.

**After review.** The lead session comments on the pull request and either merges it or replaces the
label with `changes requested`. Then: do what the review asks on the same branch, push, wait for the
checks, comment `Round 2` with what you changed, and swap the label back
(`gh pr edit <n> --remove-label "changes requested" --add-label "ready for review"`).

**Stuck.** Do not guess and do not widen the scope. Comment on the issue with what you need and add
the label `blocked` to it (or to the pull request, if one exists).

**Evidence** is something the reviewer can open: a preview address with a frozen moment
(`https://pr-<n>-strm-dev.mirecki-janek.workers.dev/?stage=2&t=0.5`), a test run in CI, numbers in
the job summary. Not an image on your disk.

**Never**, in addition to "Not yours to change": push to `rebuild` or `main` (the branch refuses
it), merge, tag, run `wrangler deploy`, or edit `docs/NOW.md` or `docs/log`.

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
