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

## Working beside the lead session, on one machine

When several agents work in one clone at once (Cursor in parallel worktrees, the lead session in the
main checkout), they pass work through a folder that is never committed: `.handoff/` in the main
checkout. The main checkout is the first line of `git worktree list`.

| Path                         | What                                                       | Lives                       |
| ---------------------------- | ---------------------------------------------------------- | --------------------------- |
| `.handoff/batch.md`          | the current batch: which issues, which branch, what is new | overwritten with each batch |
| `.handoff/reviews/pr-<n>.md` | one pull request handed over for review, and the review    | removed once merged         |
| `.handoff/shots/pr-<n>/`     | evidence images for that pull request                      | removed once merged         |

Nothing in `.handoff/` is a record. What has to last goes where it belongs: a note on a task is a
comment on its issue, a review is a comment on its pull request, a decision is an ADR.

**Start.** Read `.handoff/batch.md`, then your issue with its comments
(`gh issue view <n> --comments`). Take only an issue the batch lists. One worktree per issue:

```bash
git fetch origin
git worktree add ../resume-wt/<branch> -b <branch> origin/rebuild
cd ../resume-wt/<branch> && nvm use && pnpm install
```

Never work in the main checkout and never switch its branch: the lead session is in it.

**Finish.**

1. `git fetch origin && git rebase origin/rebuild`, then the four commands. Rebase before you
   measure: CI tests your branch merged with `rebuild`, and a number taken on an old base is wrong.
2. Push, and open the pull request into `rebuild` from `.github/pull_request_template.md`.
3. Wait for the checks (`gh pr checks <n> --watch`). A failing check is yours to fix.
4. Only then write `.handoff/reviews/pr-<n>.md` in the main checkout:

   ```markdown
   # PR <n>: <title>

   Status: ready for review

   - Issue: #<issue>
   - Branch: <branch>
   - Checks: verify <pass|fail>, preview <pass|fail>, playwright <pass|fail>
   - Model: <the model that did the work>

   ## What changed

   ## Evidence

   ## Not verified

   ## Decisions I made that the issue did not spell out

   ## Questions for the reviewer
   ```

**After review.** The lead session answers in the same file under `## Review` and changes the status
line. The same review is posted on the pull request.

- `Status: changes requested`: do what it asks on the same branch, push, wait for the checks, add
  `## Round 2` with what you changed, and set the line back to `Status: ready for review`.
- `Status: merged`: done. Remove your worktree (`git worktree remove ../resume-wt/<branch>`).

**Stuck.** Do not guess and do not widen the scope. Write the file with `Status: blocked` and a
`## Blocked` section. With no pull request yet, name it `issue-<issue>.md`.

**Never**, in addition to "Not yours to change": push to `rebuild` or `main`, merge, tag, run
`wrangler deploy`, edit `docs/NOW.md` or `docs/log`, or commit anything from `.handoff/`.

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
