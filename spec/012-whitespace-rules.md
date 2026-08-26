## 12. Whitespace Rules

### 12.1 Whitespaces in Block Segments

| Situation | Rule |
|-----------|------|
| Line endings | `\r\n`, lone `\r`, and `\n` all read as line terminators (§7); the text is not rewritten |
| Encoding | UTF-8 required |
| Trailing spaces | Collapsed to a single space. That space is **preserved before a soft break** — it becomes `Text(" ")` in the AST, serving as an explicit word-boundary separator — and **dropped at a block boundary** (blank line or end of input) |
| Leading spaces on block line | Stripped before block classification |
| Leading spaces on paragraph continuation line | Stripped before inline parsing |
| Multiple blank lines | Treated as a single blank line |
| Tabs outside fenced blocks | Treated as a single space for classification (§7); the text is not rewritten |
| Tabs inside code/metadata/math fences | Preserved literally |
| Blank lines inside code fence | Preserved literally in `content` string |
| Blank lines inside metadata fence | Passed through in `raw` string |
| Soft break (single newline in paragraph) | Folded to zero — no character emitted, no AST segment; lines concatenate directly |
| `TextBreak` (`\` at line end) | Produces a `TextBreak` segment — a line break inside the paragraph, not a block boundary (§5.13) |
| Whitespace immediately preceding a `{attr}` block that is **consumed** by an attribute slot (block-opener last-attr, inline attachment, or scope-chain) | Stripped from the preceding text value. Does NOT apply when `{...}` falls through to literal `Text("{...}")` per §6.3 (orphan). |

### 12.2 Whitespaces in Inline Segments

Within any inline block (Emphasis, Strong, Highlight, Spoiler, MathInline, QuoteInline):

| Situation | Rule |
|-----------|------|
| Whitespace between two adjacent opening delimiters (nesting context) | Consumed |
| Whitespace between opening delimiter and first literal | Consumed |
| Whitespace between last literal and closing delimiter | Consumed |
| Whitespace between closing delimiter and next sibling opening delimiter | Preserved as `Text(" ")` |
| Interior whitespace runs | Collapsed to one space |
| Non-breaking space (`\u00A0`) | Always preserved, never collapsed |

`CodeInline` is **exempt from whitespace collapsing** — boundary stripping and interior run collapsing do not apply. The paragraph-level soft-break rule (single `\n` → zero) also applies: a `CodeInline` spanning two lines of a paragraph has the newline removed with no replacement in `value`. For multi-line code, use `CodeBlock` (§4).

**Examples:**

```
__ bb __           → Emphasis([Text("bb")])
__  text  __       → Emphasis([Text("text")])
__  __             → Emphasis([])
aa__bb__cc         → Text("aa") + Emphasis([Text("bb")]) + Text("cc")
** __ bb __**      → Strong([Emphasis([Text("bb")])])   (space between ** and __ = zero)
** bb ** __ cc __  → Strong([Text("bb")]) + Text(" ") + Emphasis([Text("cc")])
```

---
