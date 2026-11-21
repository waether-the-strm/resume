---
name: session
description:
  How a working session on strm.dev starts and ends, so the repository keeps documenting and
  planning itself. Use at the start of every session (read NOW, pick the goal) and before ending one
  (update NOW, write the log, park what is unfinished).
---

# Session

The repository is its own memory. What is not written down in `docs/NOW.md`, the log or an issue is
lost when the session ends. Everything here is public: no private notes, no employer material.

## Start

1. `git switch rebuild && git pull`, then `nvm use` (Node 24; Astro does not support odd majors).
2. Read `docs/NOW.md`. Read the latest file in `docs/log/` if NOW leaves a question open.
3. Look at the "now" column of the board and the open issues of the current milestone:
   `gh issue list --milestone "<milestone>"`.
4. Say the goal of the session in one sentence before starting. If it does not serve the goal in
   NOW, say so and ask Jan.

## During

- One branch and one small pull request per unit of work, into `rebuild`. Link the issue
  (`Closes #n` or `Refs #n`). Add evidence: a render, a measurement, a test.
- Every pull request gets a preview at `https://pr-<number>-strm-dev.mirecki-janek.workers.dev`.
  `rebuild` itself is at `https://rebuild-strm-dev.mirecki-janek.workers.dev`.
- Merge only when CI and Preview are green. Check that a green job did what it claims: read the log
  of anything that deploys or measures.
- A decision that is not obvious goes to Jan, one question at a time, with a recommendation; a
  visual one on a render. His answer becomes `docs/adr/NNNN-title.md`, including the options
  rejected and why.
- Never tag from `rebuild`. A `v*.*.*` tag deploys to production.

## End

1. **Park what is unfinished.** Open an issue only for something that will not be finished in this
   session. Each one records: done when, where it stopped, the first step on return. Give it a
   milestone and a label, add it to the board with a horizon.
2. **Close what is finished**, with a sentence of evidence in the closing comment. `rebuild` is the
   default branch, so `Closes #n` in a pull request closes the issue on merge and links the two.
3. **`docs/NOW.md`**: rewrite, do not append. The goal of the phase, the state, what is in progress,
   one next step. A few lines; it is read first by every session.
4. **`docs/log/YYYY-MM-DD.md`**: add to today's file or create it. Sections: Planned, What happened,
   Decided (who decided, link to the ADR), Open, Next. Write for a reader who was not there. Include
   what went wrong and what it taught; that is the useful part.
5. `pnpm format`, commit, push. Confirm CI is green on `rebuild`.
6. Name the next step to Jan in one sentence, with a rough size in minutes.

## Delegated work

The lead session coordinates; cheaper agents (Copilot, Cursor, a smaller model) take the issues
labelled `delegable`. Their contract is `AGENTS.md`.

- **Before delegating an issue:** its blockers are closed, and it says Do, Do not, Done when and
  Evidence. An issue that needs a judgement call is `lead`, not `delegable`.
- **Reviewing a delegated pull request:** read the diff against the issue, not against the
  description. Check each point of "What review checks" in `AGENTS.md`. Open the preview. Read the
  CI log of anything that measures or deploys. Run the new tests locally when they are the evidence.
- **Out of scope or a touched forbidden file:** ask for the change on the pull request; do not fix
  it silently, the next delegated task would repeat it. A recurring mistake means `AGENTS.md` or the
  issue template is unclear: fix that.
- **Merging:** squash into `rebuild` when CI and Preview are green and the review holds. The issue
  closes itself through `Closes #n`; check that it did. Unblock what it blocked: move the next
  issues to "now".
- A pull request from a bot may need its workflows approved before CI runs.

## The board

Project 3 of `waether-the-strm`, private for now. It holds the whole plan: every issue has a
milestone (the phase), a Horizon (now / next / later) and a Who (Delegate / Lead / Jan). Needs the
`project` scope on the `gh` token.

```
gh project item-add 3 --owner waether-the-strm --url <issue url> --format json -q .id
gh project field-list 3 --owner waether-the-strm --format json   # Horizon field and option ids
gh project item-edit --project-id <project id> --id <item id> \
  --field-id <Horizon field id> --single-select-option-id <now|next|later id>
```

"Now" holds the goal of the week and stays short. Moving something to "later" is a decision, not a
failure; say it in the log.

## Labels

`decision` a question for Jan · `parked` stopped on purpose · `site`, `strm-ui`, `narrative` the
package · `process` CI, docs, the agent layer.
