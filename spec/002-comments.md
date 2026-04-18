## 2. Comments

A line whose first non-whitespace character is `#` is a **comment line**.

**Syntax:**

```
# This is a comment
  # This is also a comment (leading spaces allowed)
```

- Comment lines produce no AST node.
- Comment lines are **invisible to block detection** — they are not block separators.
- `#` appearing anywhere other than the first non-whitespace position of a line is literal text.
- Comment lines are stripped before block boundary analysis.

---
