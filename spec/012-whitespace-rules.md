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
| Leading whitespace on a continuation line (paragraph, heading, quote, list item) | Measured against the base column (below): whitespace up to it is dropped, whitespace beyond it collapses to one space that joins the text, and a line indented less adds nothing |
| Multiple blank lines | Treated as a single blank line |
| Blank lines inside code/math fence | Preserved literally in `raw` string |
| Blank lines inside meta fence | Passed through in `raw` string |
| Trailing whitespace | Always dropped: before a soft break, before a `##` comment (§2.2), and at a block boundary |
| Soft break (single newline in paragraph) | Folded to zero — no character emitted, no AST segment; lines concatenate directly. No token crosses it (below) |
| Interior whitespace runs in inline text | Collapsed to one space, in every `Text` that follows §12.2. Only whitespace (§0.4) collapses, so U+00A0 and U+3000 are kept. Exempt segments (§12.2) keep their whitespace |
| `LineBreak` (`\` at line end) | Produces a `LineBreak` segment — a line break inside the paragraph, not a block boundary (§5.13) |
| Whitespace immediately preceding a `{attr}` block that is **consumed** by an attribute slot (block-opener last-attr, inline attachment, or scope-chain) | Stripped from the preceding text value. Does NOT apply when `{...}` falls through to literal `Text("{...}")` per §6.1.3 (orphan). |

**Base column.** A block's base column is where the text of its continuation lines starts when no word boundary is wanted. Columns are counted from the start of the line, a tab counting as one (§7), after the container prefixes the line carries (§4.6) and after container padding (§10.2):

| Block | Base column |
|---|---|
| Heading, at every level | its marker's column + 2 |
| List item or task item, whatever the marker's width | its marker's column + 2 |
| Paragraph, or the inline content of a container | the base column of the container it stands in: 0 at the top level and in a `NamedBlock` or `SpoilerBlock` body, an item's base column inside a list item |

A line inside a `QuoteBlock` is measured after its `>` markers, each with its one separator. A lazy line carries no markers, so its first 2 columns per open quote level stand for them. The rule applies to every line that continues an inline context, inside spans and link targets as well (§5.5), and before inline parsing.

```
- item          base 2
  x             2 columns: nothing             →  "itemx"
   y            3 columns: one space           →  "itemx y"

> > no          base 4 for a lazy line
    spaces      4 columns: nothing             →  "nospaces"
     more       5 columns: one space           →  "nospaces more"
```

```ebnf
SOFT_BREAK ::= LINE_TERMINATOR WHITESPACE*    /* between two lines of one inline context, after container prefixes */
```

**Soft breaks and tokens.** A soft break adds no character, but no token crosses it: a delimiter run, a Mark name (§5.10), a Variable key (§5.11), an attribute token (§6.1.1), and a URI scheme (§5.5) each end at the line end. Spans do cross it: `Emphasis`, `Strong`, `Highlight`, `Spoiler`, `QuoteInline`, `CodeInline`, `MathInline`, `Mark` content, link text and target, image `alt` and source, and an attribute group. So `x _` followed by `_y__ z` is the literal text `x __y__ z`: the two `_` never form a `__`.

### 12.2 Whitespaces in Inline Segments

**The rules.** Within an inline segment that follows this section:

| Situation | Rule |
|-----------|------|
| Whitespace between two adjacent opening delimiters (nesting context) | Consumed |
| Whitespace between opening delimiter and first literal | Consumed |
| Whitespace between last literal and closing delimiter | Consumed |
| Whitespace between closing delimiter and next sibling opening delimiter | Preserved as `Text(" ")` |
| Interior whitespace runs | Collapsed to one space |
| Non-breaking space (`\u00A0`) and other space-like characters | Ordinary text (§0.4): always preserved, never collapsed |

**Which segments follow them.** Every inline segment either follows the rules above, is exempt from them, or admits no whitespace at all:

| Segment | Whitespace |
|---|---|
| `Text` | Interior runs collapse to one space (§12.1) |
| `Emphasis`, `Strong`, `Highlight`, `Spoiler`, `QuoteInline` | Follows §12.2 |
| `Mark` | Follows §12.2 for its content. One whitespace character or a line end separates `name` from the content and is consumed (§5.10) |
| `Link` `[text]` slot | Follows §12.2 |
| `ImageInline`, `EmbedImageInline` `alt` slot | Follows §12.2 |
| `Link` page `raw`, `ImageInline` `raw` | Exempt — a path keeps its whitespace exactly as written (§9.2) |
| `EmbedImageInline` `url`, `Link` `href` | Exempt — a URL is kept as written |
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
