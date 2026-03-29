## 12. Whitespace Rules

| Situation | Rule |
|-----------|------|
| Line endings | Normalized to `\n` before parsing |
| Encoding | UTF-8 required |
| Trailing spaces | Always ignored |
| Leading spaces on block line | Stripped before block classification |
| Multiple blank lines | Treated as a single blank line |
| Tabs outside fenced blocks | Normalized to a single space before block classification |
| Tabs inside code/metadata/math fences | Preserved literally |
| Blank lines inside code fence | Preserved literally in `content` string |
| Blank lines inside metadata fence | Passed through in `raw` string |
| Soft break (single newline in paragraph) | Produces a space; no AST node |
| Hard break (`\` at line end) | Produces `TextBreak` node |

### 12.2 Inline Block Whitespace

Within any inline block (Emphasis, Strong, Strikethrough, MathInline, QuoteInline):

| Situation | Rule |
|-----------|------|
| Whitespace between two adjacent opening delimiters (nesting context) | Collapsed to zero |
| Whitespace between opening delimiter and first literal | Stripped to zero |
| Whitespace between last literal and closing delimiter | Stripped to zero |
| Whitespace between closing delimiter and next sibling opening delimiter | Preserved as `Text(" ")` |
| Interior whitespace runs | Collapsed to one space |
| Non-breaking space (`\u00A0`) | Always preserved, never collapsed |

`CodeInline` is **exempt** — its content is always literal, no whitespace collapsing.

**Examples:**

```
** bb **           → Emphasis([Text("bb")])
**  text  **       → Emphasis([Text("text")])
**  **             → Emphasis([])
aa**bb**cc         → Text("aa") + Emphasis([Text("bb")]) + Text("cc")
__ ** bb **__      → Strong([Emphasis([Text("bb")])])   (space between __ and ** = zero)
__ bb __ ** cc **  → Strong([Text("bb")]) + Text(" ") + Emphasis([Text("cc")])
```

---
