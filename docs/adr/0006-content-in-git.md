# 0006. Content is files in git, with no CMS

Status: accepted, 20 Nov 2026. Decided by Jan.

## Context

AI will be the main editor of the site's content, with Jan. A simple CMS may be wanted later and
must not require a rebuild of the content layer.

## Decision

Content is data files in `apps/site/src/content`, validated by schemas in
`apps/site/src/content.config.ts`. Editing happens through pull requests, which have a preview.

- One file per entry and locale: `message/en.yaml`, `projects/pl/gsr.yaml`.
- English is the source. A missing translation falls back to English and the build output says so.
- Content holds plain text. Typography (non-breaking spaces, later quotes) is applied per locale at
  build time.
- Interface strings live in a typed dictionary (`src/i18n/ui.ts`); a missing key is a type error and
  fails the build.

## Rejected

**A git-based CMS from the start** (a form in the browser that writes the same files). Convenient
for small fixes from a phone. Rejected for now: it needs configuration and sign-in today, and the
narrative content (words with roles, stops) fits form fields badly while its shape is still moving.

## Consequences

- The schemas are the contract a CMS would have to honour. Strict objects, no free-form fields.
- Language-independent facts of a project (year, link, stack) are repeated in each locale file.
  Accepted for now; if it starts to drift, split them into a shared file.
