---
title: Cutdown Compliance Failure Response Policy
Status: Active
Scope: Required status transitions when published compliance claims fail
Related:
  - ./compliance-claims-policy.md
  - ./compliance-evidence-freshness-policy.md
---

# Cutdown Compliance Failure Response Policy

## Decision

Compliance claims are withdrawn on failure.

If a published claim no longer passes required conformance evidence, the implementation must immediately withdraw it. A consumer claim may instead drop the conditional clauses that fail and keep the rest.

## Required Actions on Failure

- Recheck the claim against current claim evidence requirements.
- Withdraw the claim, or drop the failing consumer clauses, without grace period.
- Publish failure scope and impacted areas.
- Publish remediation plan and target revalidation steps.

## Disclosure Requirements

Failure notice must include:

- the withdrawn claim, or the consumer clauses dropped,
- failing corpus snapshot/version references,
- known user impact,
- expected remediation timeline (if available).

## Restoration Rules

- Claim restoration requires new passing evidence for the restored claim.
- Restoration must reference updated evidence artifacts and run metadata.
