---
title: Cutdown Diagnostic Code Registry Policy
Status: Active
Scope: Governance of stable diagnostic code IDs and their lifecycle
Related:
  - ../spec/017-diagnostics.md
  - ./versioning-policy.md
---

# Cutdown Diagnostic Code Registry Policy

## Decision

The diagnostic object and every code, with its level, trigger, recovery, and the release that introduced it, are defined in the specification (§17). This policy governs how codes enter, change, and leave that list.

Codes are contract-level identifiers and must remain stable for tooling.

## Entry Requirements

Each code in §17.2 states:

- `code` (`CDN-` and four digits)
- `title`
- `level` (`warning` | `info`)
- `trigger`
- `recovery`
- the release that introduced it
- at least one example pointer to a fixture in `tests/diagnostics/`

A retired code moves to §17.3 with its status (`deprecated` | `removed`) and the reason.

## Compatibility Rules

- Reusing an existing code for different semantics is forbidden.
- Meaning changes require a new code ID and a migration note.
- A code that is no longer emitted is marked `deprecated`; its number stays reserved and is never reused.
- Deprecation may occur in minor releases.
- Removal requires major-version justification.

## Tooling Guarantees

- Parsers must emit the codes §17 defines, and no others.
- Unknown codes in downstream tooling should be handled as non-fatal and surfaced with raw metadata.
