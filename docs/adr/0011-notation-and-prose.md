# 0011. Notation is the same in every language; prose is written

Status: accepted, 21 Nov 2026. Decided by Jan, in conversation and on a rendered page (#110).

## Context

The page speaks in two voices. Sentences: the message, the answers, the guide. And signs: `+`, `=`,
the four questions, the names of components and tokens, `tldr`. In Polish the questions had been
translated (`co?`, `po co?`, `dla kogo?`, `jak?`) and Jan did not like how they read. At the same
time the blob and the rail needed a number beside each title, and a number for "the chapter before
the first" kept looking invented: chapter 0, with its mark half-way down its own stops.

## Decision

**Two layers of language.**

- **Notation** is set in the monospace voice, mostly in the accent, and is the same in every
  language: `+`, `=`, `what?`, `why?`, `who?`, `how?`, `how` in the guide's corner, the title of the
  first stop, component and token names, `tldr`, the marks. It lives in one file
  (`content/notation/main.yaml`), never one per locale, and a locale that tries to name a stop that
  notation names fails the build. On the page it is marked `lang="en"`.
- **Prose** is written per language: the answers, the guide's sentences, the message, the card, the
  names of scenes and stops. An answer answers the English question, so in Polish `who?` takes a
  nominative.

The four English words are short and understood by nearly every reader of this page, and keeping
them keeps a small joke: what, why and who are www.

**The first stop is `w+w+w`.** No spaces, no question mark. It is the web, and it is the three terms
the equation is about to add; each of the next three stops opens one of them.

**The mark of a stop says what the stop is in the story**, and it follows from the track; nobody
writes it (`lib/stop-mark.ts`).

| Mark           | Stops                              | Reads as                               |
| -------------- | ---------------------------------- | -------------------------------------- |
| `0`            | the first stop                     | nothing yet, and where an index starts |
| `+`            | `what?`, `why?`, `who?`            | a term of the equation                 |
| `=`            | the equation, and the answer alone | the result                             |
| `1`            | the words                          | step 1 of the answer                   |
| `2.1` to `2.3` | the structure, components, tokens  | step 2, and the place in it            |
| `3.1`, `3.2`   | the tiles, the look                | step 3                                 |

The numbers are the guide's: `how 1`, `how 2`, `how 3`. The question has no number. This closes the
point ADR 0010 left open.

**The mark is a badge to the left of the title**, in the blob and beside the rail's labels: the sign
in the page's colour on a ground half dissolved into the page (`ui-badge`). It is decoration and
deliberately faint, chosen by Jan from five rendered variants. The rail's ticks and dots carry
nothing. Because it is decoration it is painted, not written: it is not in the accessibility tree
and adds nothing to a button's name. What a stop is called is its title.

## Rejected

**Translating the questions.** They stop being a sign and become the start of a sentence, they are
longer, and the joke is gone. Polish needed a wider column for `dla kogo?`.

**The equation as chapter 0, counted `0.1` to `0.6`.** A number for something that is not a step.
The guide never says `how 0`.

**The equation as chapter 1**, the scenes 2 to 4. The blob would say `3.x` while the guide says
`how 2`.

**`www?`, `w-w-w`, `w + w + w`.** A question mark belongs to the four questions. A hyphen reads as
subtraction beside an equation. With spaces it is a sum to work out and no longer the web.

**"nothing yet", "from emptiness", "zero" as the first title.** The first frame already shows
nothing but a seed; saying so is the sentence the page would rather not write. `0` as the mark
carries it.

**A badge the weight of the title** (a full circle), **an outline**, **the bare sign**. Seen side by
side; the faint ground was the one that reads as a badge and stays behind the title.

## Consequences

- A translator cannot change the questions; the schema has no field for them per locale.
- Screen readers get English pronunciation for the notation on a Polish page, and never hear the
  marks.
- The rail on a Polish page mixes `what?` with `równanie`. Accepted: those three stops show exactly
  that word on the screen. Whether scene and stop names should be English too is left open by Jan.
- The contrast of the mark is far below what text needs, in both themes, on purpose. If a mark ever
  has to carry information the title does not, this decision has to be revisited.
