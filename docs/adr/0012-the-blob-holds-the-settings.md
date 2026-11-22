# 0012. The blob holds the settings: a quiet strip that unfolds

Status: accepted, 22 Nov 2026. Decided by Jan on a rendered page with three working layouts (#124).
Amends [ADR 0010](0010-what-the-blob-holds.md), which kept language and theme out of the blob.

## Context

ADR 0010 left language and theme in the footer as "settings of the site". After seeing the blob with
its surface and the theme switch in the footer, Jan wanted both in the blob. That makes more than
two columns hold well: sound, the start, the work, language, theme, and later a site map (#91).

## Decision

- **Language and theme move into the blob.**
- **Navigation and settings are told apart.** The grid holds what leads somewhere: the start, the
  work, later the site map. Settings change the page in place: sound, theme, language.
- **A `settings` cell in the grid unfolds the settings below it, inside the blob**; the grid stays
  where it is. No second level that replaces the menu.
- **What unfolds is a quiet strip**, not three full rows: small, compact controls on one line (or
  two on a phone), each showing its current value.
- **Every change of shape is animated**: the strip unfolding, the blob growing, a value changing.
  Dynamic and finished, timed by the motion roles so the reduced profile stops them. Spacing is
  worked out, not left at the defaults of the sketch.

How this was read: Jan's words were "combo B, but with the quiet strip". B was settings unfolding
under the grid as rows; C was a strip of small toggles always visible. The reading was B's unfolding
with C's strip as what unfolds. Jan confirmed it on the first build (#129, 22 Nov 2026).

## Rejected

**A second level** (the settings replace the menu, with a way back): an extra step and a hidden
menu, for three settings.

**The strip always visible**: nothing to unfold, but the blob is taller every time it opens and the
settings compete with the navigation.

**Theme and language in the footer only** (ADR 0010): they were hard to find, and the blob is where
the reader's controls already are.

## Consequences

- Language stays a link in the markup, because it changes the address, even though it looks like a
  setting.
- The footer keeps language and theme as the fallback: without the tour (reduced motion, no
  JavaScript) the blob's menu cannot be opened today. Whether the blob's controls should work there
  too is the open point 8 of #89.
- The sound control moves from the grid to the strip, so the grid becomes navigation only.
- The first build settled four things. `settings` spans both columns, so the site map (#91) can take
  a cell beside it. The strip sits in a well of the page's colour, which separates it from the title
  of the current stop below. The language control shows the current language and links to the next,
  with the target in its accessible name. The landmark holds the blob and the `tldr` link.
