## 8. Escaping

**Rule:** A backslash `\` before a special character emits the literal character. The `\` is consumed.

A backslash before a **non-special** character emits both the backslash and the character literally. The `\` is NOT consumed silently.

```
\*   →  Text("*")
\\   →  Text("\")
\a   →  Text("\a")
```

### 8.1 Special Characters

The following characters are special and may be escaped:

```
= # * _ ~ ` $ [ ] ( ) ! { } : - > / \ | " ' ^
```

Inside a metadata block (`~~~`), code block (` ``` `), or math block (`$$$`), no escaping is processed — content is always literal. Inside `CodeInline` (`` `` ``), only `` \` `` is processed (→ literal `` ` ``); every other backslash is literal. See §5.6.

Inside a `CommentBlock` (`###`), no escaping is processed — content is always literal. Inside a `CommentInline` (`## ... <EOL>`), no escaping is processed; the comment text is captured verbatim from `##` to the LF.

**Writing a literal `##`** (avoid forming a `CommentInline` opener): use `\##` or `#\#`. The parser sees `\#` → literal `#`, and the doubled-delimiter never forms.

---
