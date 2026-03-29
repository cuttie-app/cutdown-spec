---
title: Cutdown Experimental Flags Policy
Status: Active
Owner: Language
Scope: Exposure model for experimental language behavior
Related:
  - `./parser-profile-policy.md`
  - `./extensions-registry-policy.md`
---

# Cutdown Experimental Flags Policy

## Decision

Cutdown uses a single release channel with explicit experimental flags.

There is no separate preview/stable channel split at the language level.

## Flag Rules

- Experimental behavior must be behind explicit opt-in flags.
- Flags must be named, documented, and tied to specific extension IDs or grammar proposals.
- Default behavior remains current stable semantics when flags are not enabled.

## Determinism Requirements

- Parse profile metadata must include active experimental flags.
- Conformance tests for experimental behavior must include flag-on and flag-off expectations.
- If flag is absent, parser must not activate experimental behavior implicitly.

## Governance

- Experimental flags require Language owner approval.
- Promotion of flagged behavior to default semantics must follow versioning + conformance + change gate requirements.
- Flag deprecation/removal must include migration notes.
