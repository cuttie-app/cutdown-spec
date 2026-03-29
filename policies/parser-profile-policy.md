---
title: Cutdown Parser Profile Policy
Status: Active
Owner: Language
Scope: Deterministic parse configuration for core and extensions
Related:
  - `./conformance-policy.md`
  - `./extensions-registry-policy.md`
---

# Cutdown Parser Profile Policy

## Profile Model

Every parse must run under an explicit parser profile.

Profile fields:

- `base`: `core`
- `extensions`: ordered list of enabled extension IDs
- `experimental_flags`: ordered list of enabled experimental flag IDs

Two parsers given the same input and same profile must produce the same AST.

## Standard Profiles

- `core-only`: `base=core`, `extensions=[]`
- `core-plus`: `base=core`, `extensions=[...]` (explicit IDs)

There is no implicit "auto" profile.

Profile activation source is external parser/runtime configuration. In-source document declarations are non-authoritative.

## Enablement Rules

- Extension syntax is only recognized when that extension ID is enabled in the active profile.
- If disabled, extension-looking tokens are handled by core fallback rules.
- Experimental extensions must be opt-in; they are disabled by default.

## Parse Output Metadata

A conforming parser must expose parse profile metadata alongside AST output:

- `cutdown_version`
- `profile.base`
- `profile.extensions`
- `profile.experimental_flags`

Metadata can be attached to a parse result envelope or equivalent API field.

## Conformance Requirements

Conformance tests for extension features must declare the active profile.

For each extension case, include at least:

- enabled-profile expectation,
- disabled-profile fallback expectation.

## Governance Integration

Any new extension proposal must define:

- profile ID to enable behavior,
- disabled-profile fallback,
- conformance vectors for both enabled and disabled states.
