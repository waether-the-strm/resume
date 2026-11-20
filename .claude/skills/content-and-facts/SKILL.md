---
name: content-and-facts
description:
  How content works on strm.dev - where it lives, the schemas, locales and fallback, words with
  roles, build-time typography, and what may be claimed. Use before adding or changing any copy,
  content file, schema or interface string.
---

# Content and facts

Decisions: `docs/adr/0006` (content in git), `0007` (words with roles).

## What may be said

- This repository is public. Facts only; nothing invented, no metrics.
- The only numbers: 15 years designing for the web, 11 building it.
- LetsReg: only the public sign-in page. No internals, no numbers, no screenshots of non-public
  screens. No client names beyond those already in the content.
- A new claim about a project or about Jan is Jan's to make. Ask.
- **Polish and Norwegian are written, not translated word for word, and go through Jan.** A draft is
  marked `# DRAFT` on the first line of the file until he has read it.

## Where things are (`apps/site/src`)

| What                             | Where                                                         |
| -------------------------------- | ------------------------------------------------------------- |
| Schemas                          | `content.config.ts`                                           |
| One entry per locale             | `content/message/<locale>.yaml`, `content/card/<locale>.yaml` |
| Many entries per locale          | `content/projects/<locale>/<slug>.yaml`                       |
| Reading by locale, with fallback | `i18n/content.ts` (`single`, `many`)                          |
| Interface strings                | `i18n/ui.ts`                                                  |
| Locales and paths                | `i18n/locales.ts`                                             |
| Typography per locale            | `i18n/typography.ts`                                          |
| Words and roles                  | `lib/rich.ts`, `components/Words.astro`                       |

## Rules

- **English is the source.** A missing entry in another locale falls back to English and prints
  `[i18n] … falling back` in the build. Read the build output; a launched language should print
  none.
- **Interface strings:** add the key to `en` first. Every other dictionary must then have it, or the
  build fails.
- **Plain text in content.** No entities, no hand-placed non-breaking spaces, no HTML. Typography is
  applied at build time by `typeset`.
- **Roles, not positions.** Mark a run with `[words]{role}`. Roles: `accent`, `name`. Never style or
  animate "the third word". A new role is added in `lib/rich.ts`, styled in strm-ui's `words.css`,
  and recorded in ADR 0007.
- **Schemas are strict.** A new field is a schema change first, then content in every launched
  locale.
- Render marked-up text with `<Words text locale />`, never by hand.

## Check after a change

`pnpm test && pnpm build`, then look at the page in every launched language at 1280×820 and 390×664.
A longer language is the test: Polish wraps where English does not.
