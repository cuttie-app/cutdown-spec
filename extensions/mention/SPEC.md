# Extension: Mention

- **Status:** Active
- **Layer:** Extension
- **AST Node:** `Mention`
- **Inline / Block:** Inline
- **Parser profile:** `mention`

---

## Summary

The `Mention` extension recognizes `@handle` tokens in inline content and emits a structured `Mention` node. Consumers that support user/entity references (notifications, access control, linking) use this node; consumers that do not may ignore it and fall back to treating the source text as `Text`.

---

## Syntax

```
@handle
```

- `@` followed by one or more characters matching `[A-Za-z0-9_.-]` (ASCII only).
- Mention parsing is available in any inline context where inline parsing is active.
- If `@` is not followed by a valid handle character, `@` is emitted as literal `Text("@")`.
- Cutdown performs no user/account validation. Resolution is the consumer's responsibility.

---

## AST

```
Mention { value: string, attributes: Attributes }
```

`value` is the handle string without the leading `@`.

---

## Examples

```
Input:  Hello @alice
AST:    Text("Hello ") + Mention { value: "alice" }

Input:  @alice.bob
AST:    Mention { value: "alice.bob" }

Input:  @ not-a-mention
AST:    Text("@ not-a-mention")

Input:  email@example.com
AST:    Text("email") + Mention { value: "example.com" }
```

---

## Precedence

Mention parsing runs after emphasis/strong/strikethrough/links (priority 9, per §11). Inside the second bracket of a special link (`[text][@cite]`), the `@` is the citation-link classifier — mention parsing does not run in that slot.

---

## Fallback for Non-Supporting Consumers

A consumer that does not implement this extension SHOULD treat `Mention` nodes as `Text("@" + value)`.

---

## Rationale

`Mention` is an extension (not core) because `@handle` semantics are application-specific. Any consumer may find the structural signal useful (link analysis, notifications, access control), but a consumer with no concept of users gains nothing from it. Keeping it as an extension allows lightweight consumers to opt out cleanly.
