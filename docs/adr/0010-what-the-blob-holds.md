# 0010. What the blob holds

Status: accepted, 21 Nov 2026. Decided by Jan (#33).

## Context

In the prototype the blob shows the title of the stop and `n/12`, the name as the way to the card,
and on a tap four controls: sound, the start, the work, the lab. Beside it sits `skip the tour`,
which also leads to the card. v2 has more that could go in (theme, language). The blob could not be
built until its contents were decided.

## Decision

- **The controls stay as they are in the prototype**: sound, the start, the work, and a fourth row.
  Theme and language are not added to the blob.
- **The fourth row is a site map**, where the lab was. It will list the site's pages, public ones
  and, later, some only Jan can open. It is not designed yet (#91); until it is, the row is left
  out. Nothing links to a page that does not exist.
- **The step number moves to the left, before the title, and counts by chapter**: `2.3`, not `9/12`.
  The number is derived from the track (the stop's chapter and its place in it), so it is the same
  in every language and nobody writes it.
- **The chapter marks on the rail carry their chapter number**, as quietly as the marks themselves.
- **The note (♪) stays where it is.**
- **`skip the tour` becomes `tldr`**: shorter and with more of a wink. It is a visible link to the
  card. Its accessible name still says where it goes and contains the visible text.

## Open

Which number the chapters get. The guide already numbers the scenes: `how 1` the words, `how 2` the
structure, `how 3` the look. Recommended, and built until Jan says otherwise: the blob and the rail
use the same numbers, so the equation is chapter 0 (`0.1` to `0.6`) and "the tokens" is `2.3`. The
alternative, the equation as chapter 1, makes the blob say `3.x` while the guide says `how 2`.

## Rejected

**Theme and language in the blob.** They are settings of the site, not of the tour, and the blob is
also there after the tour. They keep their place in the footer.

**`n/12`.** A count of twelve says how long the tour is; `2.3` says where in the story the reader
is, which is what the title beside it is about.

## Consequences

- The numbering is one pure function of the track, shared by the blob and the rail.
- The site map is a later piece of work with a question of its own: a page "only for Jan" on a
  static site needs a gate at the host, not in the page.
