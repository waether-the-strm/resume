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
4. Brief Jan before the first change, and again whenever a new batch of work starts within the
   session: what it is about, why now, what to expect once it is merged, how it fits the
   architecture. Three to five sentences, as `AGENTS.md` ("The briefing") describes. If the batch
   does not serve the goal in NOW, say so and ask him.

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

Jan's standing preference (21 Nov 2026): the lead session keeps what needs judgement and gives the
rest away. It worked on the first two batches, so it is the default.

| Kind of work                                                                                                        | Goes to                                     |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Architecture, choreography, anything Jan judges in motion, the adapter between modules                              | the lead session                            |
| A well-specified, independent task with a test or a measurement as evidence                                         | Cursor (or Copilot), as a `delegable` issue |
| A simple, mechanical step inside the lead session's own task: a search, a sweep, a rename, a first draft of a table | a cheaper subagent of the lead session      |
| A decision, copy, a check by eye, ear or hand                                                                       | Jan, as an issue in his queue               |

Before starting a task, ask which row it is. If the lead session is about to do something from the
second or third row itself, that is the mistake to catch.

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

## Jan's queue

Jan's own work is short and specific: a decision, a brief for the agents, a piece of copy, a check
of what was built. The board has to show him, at a glance, what is his, in what order, and for how
long.

- Everything that needs him is an issue with **Who = Jan**, assigned to him, with:
  - **Jan**: the kind of work. `Decide` (unblocks others), `Brief` (he describes what he wants so
    tasks can be written), `Write` (copy only he can write), `Verify` (he checks what was built: in
    motion, on a device, by ear).
  - **Timebox**: minutes. An honest upper bound, so he can stop. Above 90, split the issue.
  - **Target**: the day it is due. Order follows from it: what blocks the most comes first.
- **When built work needs his eyes, open a `Verify` issue**; do not bury the request in a pull
  request or a chat message. Say exactly what to open (the preview URL), what to look at, and what
  the possible answers are. One screen, one question.
- **A decision issue states the options and a recommendation**, so deciding is choosing, not
  researching.
- When he answers, the lead session does the rest: writes the ADR, splits tasks, closes the issue.
- Keep his queue for any one day under about two hours. If it is more, say so and move something.

## The board

Project 3 of `waether-the-strm`, private for now. It holds the whole plan: every issue has a
milestone, a Status, a Horizon (now / next / later), a Who (Delegate / Lead / Jan), and Start and
Target dates. Needs the `project` scope on the `gh` token.

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
