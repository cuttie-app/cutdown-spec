## 12. Whitespace Rules

### 12.1 Whitespaces in Block Segments

Rows run from the line as a whole, through block structure, to inline content.

| Situation | Rule |
|---|---|
| Line endings | `\r\n`, lone `\r`, and `\n` all read as line terminators (§7); the text is not rewritten |
| Tabs outside fenced blocks | Treated as a single space for classification (§7); the text is not rewritten |
| Tabs inside code/meta/math fences | Preserved literally |
| Leading spaces on block line | Stripped before block classification |
| Leading spaces inside a `NamedBlock` or `SpoilerBlock` body | Up to the base padding removed from every content line (§10.2) |
| Leading spaces on paragraph continuation line | Stripped before inline parsing |
| Multiple blank lines | Treated as a single blank line |
| Blank lines inside code/math fence | Preserved literally in `content` string |
| Blank lines inside meta fence | Passed through in `raw` string |
| Trailing spaces | Collapsed to a single space. That space is **preserved before a soft break** — it becomes `Text(" ")` in the AST, serving as an explicit word-boundary separator — and **dropped at a block boundary** — a blank line, end of input, or the end of a single-line block's inline context (a heading line, a table cell, a caption line) |
| Soft break (single newline in paragraph) | Folded to zero — no character emitted, no AST segment; lines concatenate directly |
| `LineBreak` (`\` at line end) | Produces a `LineBreak` segment — a line break inside the paragraph, not a block boundary (§5.13) |
| Whitespace immediately preceding a `{attr}` block that is **consumed** by an attribute slot (block-opener last-attr, inline attachment, or scope-chain) | Stripped from the preceding text value. Does NOT apply when `{...}` falls through to literal `Text("{...}")` per §6.1.3 (orphan). |

### 12.2 Whitespaces in Inline Segments

**The rules.** Within an inline segment that follows this section:

| Situation | Rule |
|-----------|------|
| Whitespace between two adjacent opening delimiters (nesting context) | Consumed |
| Whitespace between opening delimiter and first literal | Consumed |
| Whitespace between last literal and closing delimiter | Consumed |
| Whitespace between closing delimiter and next sibling opening delimiter | Preserved as `Text(" ")` |
| Interior whitespace runs | Collapsed to one space |
| Non-breaking space (`\u00A0`) | Always preserved, never collapsed |

**Which segments follow them.** Every inline segment either follows the rules above, is exempt from them, or admits no whitespace at all:

| Segment | Whitespace |
|---|---|
| `Text` | Interior runs collapse at paragraph level (§12.1) |
| `Emphasis`, `Strong`, `Highlight`, `Spoiler`, `QuoteInline` | Follows §12.2 |
| `Mark` | Follows §12.2 for its content. Exactly one space separates `name` from the content; that space is consumed |
| `Link` `[text]` slot | Follows §12.2 |
| `ImageInline` `alt` slot | Follows §12.2 |
| `Link` page `path`, `ImageInline` `src` | Exempt — a `PathResourceLocator` keeps its whitespace exactly as written (§1.7) |
| `Link` external `href` | Exempt — kept as written |
| `CodeInline` | Exempt — see below |
| `MathInline` | Exempt — the formula is kept as written, like `CodeInline` |
| `Variable` | Admits none — `{{ key }}` is literal text and emits CDN-0015 (§5.11) |
| `LineBreak` | Not applicable — no content |

`CodeInline` and `MathInline` are **exempt from whitespace collapsing** — boundary stripping and interior run collapsing do not apply. The paragraph-level soft-break rule (single `\n` → zero) still applies: a `CodeInline` or `MathInline` spanning two lines of a paragraph has the newline removed with no replacement. For multi-line code or math, use `CodeBlock` or `MathBlock` (§4).

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
