# 0007. Words carry roles in the content

Status: proposed, 20 Nov 2026. In use on the static page; to be confirmed by Jan before the scenes
are ported (phase 5).

## Context

In the prototype the choreography depends on English. The headline accent starts "at the third
word". The weight wave bolds "the first three words" of the name line. In Polish the accented phrase
is four words and the name sits after a different verb. Any rule that counts words breaks in the
second language.

## Decision

Content marks a run of words with a role, inline:

```yaml
headline: "Your product, [clear at a glance.]{accent}"
who: "[I'm Jan Mirecki,]{name} a design engineer: fifteen years designing for the web, …"
```

- Roles so far: `accent` and `name`. The schema rejects any other.
- Text is rendered one word at a time (`<span class="ui-w" data-role="accent">`). The word stays the
  unit of continuity, and each word carries the role of its run.
- Styles and, later, the engine select by role, never by position.
- A non-breaking space does not split a word unit, so a Polish one-letter word travels with the word
  after it.

## Rejected

**Counting words** (the prototype). Breaks per language.

**Explicit segments** (`- "Your product,"` then `- accent: "clear at a glance."`). Checkable without
a parser, but awkward to write and to translate: a sentence becomes a list.

**HTML in content** (`<em>`). Leaks markup into data and invites anything.

## Consequences

- A small parser (`src/lib/rich.ts`) with tests.
- Translators keep the brackets and move them to wherever the phrase falls.
- The structure scene needs more per block (component name, element, tokens). That data is added
  with the scenes, not now.
