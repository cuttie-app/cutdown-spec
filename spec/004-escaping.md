## 4. Escaping

**Rule:** A backslash `\` before a special character emits the literal character. The `\` is consumed.

A backslash before a **non-special** character emits both the backslash and the character literally. The `\` is NOT consumed silently.

```
\*   →  Text("*")
\\   →  Text("\")
\a   →  Text("\a")
```
*→ [test: escape-special-char](../tests/004-escaping/escape-special-char.yaml), [test: escape-backslash](../tests/004-escaping/escape-backslash.yaml), [test: escape-non-special](../tests/004-escaping/escape-non-special.yaml)*

### 4.1 Special Characters

The following characters are special and may be escaped:

```
= # * _ ~ ` $ [ ] ( ) ! { } : - > / \ | " '
```

Inside a fenced code block, metadata block, or fenced math block, no escaping is processed — content is always literal.

---
