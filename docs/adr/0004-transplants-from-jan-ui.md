# 0004. What strm-ui takes from jan-ui

Status: accepted, 20 Nov 2026. Decided by Jan.

## Context

jan-ui is Jan's own design system for small offline tools. It is a different visual world (dark
base, system fonts, a blue accent, Lit components) and does not set the language of strm.dev. It is
a donor: some of its mechanisms solve problems strm-ui has from the first day.

A check of the prototype's colours on its paper background (`#f6f4ef`) made the first item concrete:

| Token      | Value     | Contrast | Used as a text colour |
| ---------- | --------- | -------- | --------------------- |
| `--ink`    | `#161513` | 16.60:1  | yes                   |
| `--link`   | `#1a4fd6` | 6.10:1   | yes                   |
| `--mute`   | `#6b675f` | 5.12:1   | yes                   |
| `--el`     | `#3a6ea5` | 4.83:1   | yes                   |
| `--tok`    | `#5f7f2a` | 4.19:1   | once                  |
| `--accent` | `#e4482c` | 3.63:1   | 13 times              |
| `--soft`   | `#a39e94` | 2.43:1   | 5 times               |

The accent passes for the large headline (3:1) and fails for small labels (4.5:1).

## Decision

Four mechanisms are carried over. Ideas only: no values, no components, no code.

1. **Signal and text pairs.** Every colour that carries meaning has two tokens: a signal hue for
   lines, marks and large type (3:1 is enough), and a `-text` variant that guarantees 4.5:1 on the
   paper of each theme. Plus one focus ring token, applied on `:focus-visible`.
2. **The theme axis.** Auto from the system setting, an override with `data-theme` on `<html>`, the
   choice persisted, and a short inline script in `<head>` that sets the attribute before the first
   paint. One change from the donor: values are written once with `light-dark()`, not in three
   copies of the same block.
3. **A profile as a separate axis.** In jan-ui a display profile sits next to the theme, zeroes the
   motion tokens, and one gate in JavaScript switches animation off. strm-ui uses the same mechanism
   for reduced motion from the start; a print profile for `/cv` can follow.
4. **A key binding registry.** One list of bindings yields both the keyboard handler and the content
   of the shortcut hint. Recorded now, built in phase 6 with the stop navigation.

## Rejected

Everything else stays behind: the palette and type scale, the Lit components, the single-file
offline build, the content anchor line, the entry animation helpers, the persisted state store (the
narrative state is derived from scroll, not stored), and the rules written for tools rather than for
a public page.

## Consequences

- The prototype's `--accent`, `--soft` and `--tok` each need a `-text` partner before they are used
  for small text. Choosing those values is a look decision and goes to Jan on a render.
- `light-dark()` requires `color-scheme` to be set; the theme attribute switches `color-scheme`, and
  every colour token follows.
