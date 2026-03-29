---
title: Cutdown Extension Promotion Policy
Status: Active
Owner: Language
Scope: Mandatory criteria for `experimental` -> `stable` promotion
Related:
  - `./extensions-registry-policy.md`
  - `./conformance-policy.md`
---

# Cutdown Extension Promotion Policy

## Decision

Extension promotion uses a mandatory scorecard with hard pass gates.

An extension cannot be promoted to `stable` unless all required gates pass.

## Promotion Gates (All Required)

1. Conformance coverage
   - Comprehensive enabled/disabled profile tests.
   - Canonical serialization snapshots for representative cases.
2. Fallback quality
   - Deterministic behavior when extension is disabled/unsupported.
   - Compatibility fallback cases documented and tested.
3. Diagnostics maturity
   - Stable diagnostic codes for malformed and denied-capability cases.
   - Recovery behavior documented per diagnostic code.
4. Migration and docs
   - Mini-spec finalized and linked.
   - Migration notes and consumer guidance published.
5. Adoption evidence
   - Demonstrated real-world usage or tracer deployments with feedback.
   - Known edge cases tracked with resolution status.

## Scoring Rule

- Scorecard is pass/fail per gate.
- Any failed gate blocks promotion.
