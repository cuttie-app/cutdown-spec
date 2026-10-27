---
title: Cutdown Compliance Claims Policy
Status: Active
Scope: Evidence required for an implementation's conformance claim
Related:
  - ./conformance-policy.md
  - ./parser-profile-policy.md
  - ./compliance-evidence-freshness-policy.md
  - ./compliance-failure-response-policy.md
---

# Cutdown Compliance Claims Policy

## Principle

Compliance claims must be evidence-based and scoped.

The specification defines what conforms: one conformance class (parser, writer, or consumer) for one language version, with no levels (`spec/018-conformance.md`). This policy defines the evidence a published claim carries.

## Claim Requirements

Any compliance claim must include:

- conformance class,
- language version,
- for a consumer, the conditional clauses it implements (interpolation, injection, streaming),
- corpus snapshot version,
- test run evidence.

Evidence freshness and revalidation triggers are governed by `./compliance-evidence-freshness-policy.md`.

Failure-triggered claim transitions are governed by `./compliance-failure-response-policy.md`.

## Forbidden Claims

- Unqualified "Cutdown compliant" without class and version.
- Claiming a consumer clause not covered by published evidence.
- Reusing old evidence after language/corpus version change.
