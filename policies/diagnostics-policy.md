---
title: Cutdown Diagnostics Policy
Status: Active
Owner: Language
Scope: Parser diagnostics contract for deterministic tooling and author-safe recovery
Related:
  - `./conformance-policy.md`
  - `./parser-profile-policy.md`
  - `./diagnostic-code-registry-policy.md`
---

# Cutdown Diagnostics Policy

## Goal

Diagnostics must be machine-readable, stable, and non-blocking for normal authoring workflows.

## Output Contract

A parser returns:

- `ast`
- `diagnostics[]`

Each diagnostic includes:

- `code` (stable identifier, for example `CDN-XXXX`)
- `level` (`error` | `warning` | `info`)
- `message` (human-readable)
- `span` (`start_line`, `start_col`, `end_line`, `end_col`)
- `recovery` (how parsing proceeded)

## Severity Rules

- `error`: malformed or invalid input requiring fallback/recovery, but parser still returns AST.
- `warning`: valid parse with potentially unintended author input.
- `info`: non-problem metadata signals.

The parser must not fail-fast on the first issue. It must continue with deterministic recovery and report all encountered diagnostics for the parse pass.

## Recovery Rules

- Recovery behavior must be deterministic and documented per diagnostic code.
- If a construct is invalid/unclosed, parser follows the spec fallback rule and emits corresponding diagnostics.
- Recovery must preserve as much surrounding valid structure as possible.

## Stability Requirements

- Diagnostic `code` values are part of the language contract.
- Changing meaning of an existing diagnostic code requires at least a `minor` policy review and migration note.
- Removing a diagnostic code requires major-version justification.

Diagnostic code definitions and lifecycle are governed by `./diagnostic-code-registry-policy.md`.

## Conformance Requirements

Conformance tests must assert:

- expected AST output,
- expected diagnostic codes and levels,
- expected recovery mode for malformed cases.

## Decision Record (Q14)

- Q14.1: Parser exposes structured diagnostics with levels.
- Q14.2: Diagnostics are machine-readable and code-stable.
- Q14.3: Parser is non-fail-fast and returns AST with deterministic recovery.
