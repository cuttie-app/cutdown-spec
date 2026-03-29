---
title: Cutdown Extensions Registry
Status: Active
Owner: Language
Related:
  - `./change-gate.md`
  - `./versioning-policy.md`
  - `./parser-profile-policy.md`
  - `./capability-policy.md`
  - `./extension-promotion-policy.md`
---

# Cutdown Extensions Registry

## Lifecycle States

- `experimental`
- `stable`
- `deprecated`
- `removed`

## Entry Schema (Mandatory Fields)

Each extension entry must include:

- `id`
- `status`
- `syntax`
- `ast_node`
- `introduced_in`
- `fallback_behavior`
- `owner`
- `profile_id`
- `capabilities`

## Governance Rules

- New extensions must start as `experimental`.
- `experimental` extensions are disabled by default in Cuttie and require opt-in/feature-flag.
- Moving `experimental` -> `stable` requires:
  - passing scorecard gates per `./extension-promotion-policy.markdown`
  - owner approval
- `deprecated` extensions keep parser emission for at least one major version before `removed`.
- Every status transition must include version bump classification (`patch`/`minor`/`major`) per policy.
- Every extension must define behavior for both enabled and disabled profiles.
- Every extension must declare required capabilities and denied-capability fallback.

## Registry

| id | status | syntax | ast_node | introduced_in | fallback_behavior | owner | profile_id | capabilities |
|---|---|---|---|---|---|---|---|---|
| task-items | stable | `- [ ] item`, `- [x] item` | `TaskItem` | `0.1.x` | Disabled profile: parsed as regular list item text. Enabled profile: emit `TaskItem`; consumer may render as regular list items preserving checkbox state. | Language | `ext.task-items` | `[]` |

## Notes

- Features not listed here are either core or out of scope.
- `@handle` user mention is core (not extension).
