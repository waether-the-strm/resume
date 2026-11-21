# 0007. Words carry roles in the content

Status: accepted, 21 Nov 2026. Decided by Jan, with the amendment below.

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

## Amendment, 21 Nov 2026: a span per word only where words move

Jan read the page source and found every word of every text in its own span. That is the narrative's
need, not the site's.

- **In the message** (the five blocks the tour builds) each word is its own element. The engine
  moves single words: the weight wave crosses the name line word by word, and a word keeps its
  identity from the plain words to the finished look. The server renders the elements the engine
  will animate, so nothing shifts when it attaches.
- **Everywhere else** (the card, `/cv`, project pages) text is plain, with one span around each
  marked run and nothing around the rest.

The content format does not change. Only the rendering has two modes (#78).
