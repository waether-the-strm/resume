# 0002. Hosting on Cloudflare

Status: accepted, 20 Nov 2026. Decided by Jan. Not yet implemented.

## Context

v1 is deployed to GitHub Pages when a `v*.*.*` tag is pushed. `v2.0.0` is still a fully static site,
so Pages could serve it. Two things argue against waiting:

- The rebuild has to be felt in motion on real phones long before the tag. GitHub Pages serves one
  site per repository and has no preview for a branch or a pull request.
- The milestones after the release (a cloud AI proxy, first-party analytics, server-side experiment
  assignment) need functions. Their interfaces are designed for `v2.0.0`, and it is better to design
  them against the real target.

## Decision

Move to Cloudflare during phase 1.

- The site stays static: Astro `output: "static"`, served as Workers static assets. No adapter.
- Every pull request and the `rebuild` branch get a preview URL.
- Production still deploys only from a `v*.*.*` tag.
- Functions are added when the first milestone needs one, not before.

## Rejected

**Stay on GitHub Pages until the first server-side need.** Smallest change for `v2.0.0`, but no
previews, and the hosting move would land in the middle of feature work later.

**Netlify.** Equivalent previews and functions. Rejected for a smaller free allowance and a less
complete offering for the later milestones (edge logic, analytics, AI gateway).

## Consequences

- One more account in the delivery chain, and a DNS change for strm.dev.
- The moment of the domain cutover is a separate step. Proposed: before `v2.0.0`, with v1 built from
  tag `v1.2.0`, so that the release itself changes content only. Jan confirms when the previews
  work.
- `.github/workflows/deploy.yml` and `public/_redirects` are replaced as part of this work.
- A cookieless analytics option exists on the same platform; the provider is still an open question
  for after the release.
