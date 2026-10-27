---
title: Cutdown Diagnostics Policy
Status: Active
Scope: Parser diagnostics contract for deterministic tooling and author-safe recovery
Related:
  - ./conformance-policy.md
  - ./parser-profile-policy.md
  - ./diagnostic-code-registry-policy.md
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
- `level` (`warning` | `info`)
- `message` (human-readable)
- `loc` (`{ file?, start, end }` — raw-file UTF-16 code-unit offsets, end-exclusive, per spec §14 Location Type; line/column presentation is derived by the reporting tool)
- `recovery` (how parsing proceeded)

## Severity Rules

- `warning`: valid parse with potentially unintended author input.
- `info`: non-problem metadata signals.

There is no `error` level: every input is a valid document and the parser always returns an AST (§9). The parser must not stop at the first issue. It continues with deterministic recovery and reports all encountered diagnostics for the parse pass.

## Recovery Rules

- Recovery behavior must be deterministic and documented per diagnostic code.
- If a construct is invalid/unclosed, parser follows the spec fallback rule and emits corresponding diagnostics.
- Recovery must preserve as much surrounding valid structure as possible.

## Stability Requirements

- Diagnostic `code` values are part of the language contract.
- Changing meaning of an existing diagnostic code requires at least a `minor` policy review and migration note.
- A code that is no longer emitted is marked `deprecated` with its recovery history; its number stays reserved and is never reused.

Diagnostic code definitions and lifecycle are governed by `./diagnostic-code-registry-policy.md`.

## Conformance Requirements

Conformance tests must assert:

- expected AST output,
- expected diagnostic codes and levels,
- expected recovery mode for malformed cases.

## Codes

Every code, with its level, trigger, and recovery, is defined in the [Diagnostic Code Registry](./diagnostic-code-registry.md). This policy does not repeat them.

## Tools

A tool MAY treat any warning as a failure of its own — a build gate or a linter, for example. The parse result does not change: the same input gives the same AST and the same diagnostics under every parser profile.
