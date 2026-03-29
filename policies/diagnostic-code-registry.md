---
title: Cutdown Diagnostic Code Registry
Status: Active
Owner: Language
Scope: Canonical list of all stable diagnostic codes emitted by conforming Cutdown parsers
Related:
  - `./diagnostics-policy.md`
  - `./diagnostic-code-registry-policy.md`
  - `./versioning-policy.md`
---

## Cutdown Diagnostic Code Registry

All codes use the prefix `CDN-`. Codes are permanently assigned — retired codes are marked `removed` but never reused.

---

### CDN-0001 — Unclosed CodeBlock fence

| Field | Value |
|---|---|
| code | CDN-0001 |
| title | Unclosed CodeBlock fence |
| level | warning |
| trigger | A ` ``` ` opening fence has no matching closing ` ``` ` before end of document |
| recovery | Content from the opening fence to end of document is treated as CodeBlock content |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0002 — Unclosed MetaBlock fence

| Field | Value |
|---|---|
| code | CDN-0002 |
| title | Unclosed MetaBlock fence |
| level | warning |
| trigger | A `~~~` opening fence has no matching closing `~~~` before end of document |
| recovery | Content from the opening fence to end of document is treated as Meta raw content |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0003 — Unclosed MathBlock fence

| Field | Value |
|---|---|
| code | CDN-0003 |
| title | Unclosed MathBlock fence |
| level | warning |
| trigger | A `$$$` opening fence has no matching closing `$$$` before end of document |
| recovery | Content from the opening fence to end of document is treated as MathBlock formula content |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0004 — Unclosed NamedBlock

| Field | Value |
|---|---|
| code | CDN-0004 |
| title | Unclosed NamedBlock |
| level | warning |
| trigger | A `:::name` opening line has no matching closing `:::` before end of document |
| recovery | Content from the opening line to end of document is treated as NamedBlock children |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0010 — ThematicBreak text content dropped

| Field | Value |
|---|---|
| code | CDN-0010 |
| title | ThematicBreak text content dropped |
| level | warning |
| trigger | A ThematicBreak line (`---`) contains non-whitespace, non-attribute text (e.g., `--- some text {.x}`) |
| recovery | Text between the dashes and optional `{attrs}` is silently discarded; ThematicBreak node is emitted normally |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0011 — Orphaned scope-chain attributes

| Field | Value |
|---|---|
| code | CDN-0011 |
| title | Orphaned scope-chain attributes |
| level | warning |
| trigger | One or more `{...}` blocks at the front of a trailing attribute chain have no slot to claim (chain has fewer slots than `{...}` blocks) |
| recovery | Excess `{...}` blocks at the front of the chain are discarded; no AST output for them |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0012 — Heading level out of range

| Field | Value |
|---|---|
| code | CDN-0012 |
| title | Heading level out of range |
| level | warning |
| trigger | A line begins with 10 or more `=` characters followed by a space (would be heading level > 9) |
| recovery | The entire line is emitted as literal `Text`; no Section node is created |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |
