# 0008. The behavioural spec lives in this repository

Status: accepted, 21 Nov 2026. Decided by Jan.

## Context

The home page is a port of a prototype kept in a separate, private repository. Work is now shared
between a lead session and other agents that see only this repository. Without the prototype they
cannot port the engine, the scenes or the navigation, and the test scenarios cannot be turned into
Playwright specs.

The prototype was private only because it was work in progress. Jan's rule: whatever a task needs in
order to be done may be published.

## Decision

A read-only copy of the prototype at its tag `v0.16.0`, with its scenarios, notes and measuring
tools, is kept in `docs/spec`. It is a reference: not built, not shipped, not edited. Where it and
an ADR disagree, the ADR wins; `docs/spec/README.md` lists the known differences.

Before copying, the files were scanned for anything private. They hold only the public facts already
on the site.

## Rejected

**Make the prototype repository public and link the tag.** Works, but a second repository with its
own agent instructions (one file, no dependencies, push to `main`) invites confusion.

**Keep it private; only the lead session ports.** Makes every task of the engine, the scenes and the
navigation undelegable.

## Consequences

- Engine and navigation tasks can be delegated: each issue points at line ranges of the prototype.
- The copy is frozen. If the prototype is ever changed, that is a new decision and a new copy.
- `docs/spec` is excluded from formatting.
