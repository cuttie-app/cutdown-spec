## 1. Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **MAY** are used as defined in [RFC 2119].

**Examples** are shown as:

```
Input:
  <cutdown source>

AST:
  <node representation>
```

A `→` symbol means "produces AST node."

### Identifier Character Set

Throughout this spec, `ID_LITERAL` refers to the following ASCII character class:

```
ID_LITERAL = [a-zA-Z0-9._-]
```

This charset is used for all identifier-like tokens: block names, span names, code language tags, and reference definition IDs. It is ASCII-only and case-sensitive. Matching against `ID_LITERAL` is always case-sensitive unless explicitly stated otherwise.

---
