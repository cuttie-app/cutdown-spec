## 10. Block Structure and Block Boundaries

### 10.1 Block Boundaries

Blocks are separated by one or more **blank lines**. A blank line is a line containing only whitespace characters (after normalization).

Multiple consecutive blank lines are treated as a single blank line.

A parser identifies block boundaries by scanning for blank line sequences. Each contiguous run of non-blank lines is a candidate block, then classified by its first line.

**Block elements cannot interrupt a paragraph.** A new block construct can only begin after a blank line. A line that would otherwise open a block element (a heading, a list marker, a thematic break, etc.) is paragraph content if it appears within a run of non-blank lines that began as a paragraph.

Comments (§2) are detected in Phase 2 before block boundary analysis. A line starting with `###` is a `CommentBlock` fence (produces an AST node). A line starting with `##` (pre-`##` content empty) acts as a blank line for block-boundary purposes and stores its payload as a `Reflection` entry on the nearest block. See §2 for the full semantics and §10.4.4 for the symbol-repetition table.

### 10.2 Leading and Trailing Whitespace

Any number of leading spaces (including none) are stripped before block classification. Indentation is never significant for block type detection in Cutdown. Indented code blocks (as in CommonMark) are not supported.

Trailing spaces on any line are ignored.

**List exception:** For list blocks, the parser records the **original column** of each marker (before stripping) for use in the list nesting stack model (§10.5). Block type detection still uses the stripped line; the column is a separate piece of metadata used only during list parsing.

### 10.3 Block Classification

Each block candidate is classified by its first line (see §9.3 for the full classification table).

### 10.4 Syntax Primitives

Cutdown uses two structural patterns for delimiters:

#### 10.4.1 Doubled-symbol inline delimiter

Any two identical characters form an inline block delimiter:

    <Symbol><Symbol> content <Symbol><Symbol> {attrs}

The opener and closer are the same doubled symbol. Inline blocks delimited this way are composable (nestable with other types). The parser recognizes a built-in exclusive list of doubled symbols (see §5). Unrecognized doubled symbols are emitted as literal text.

#### 10.4.2 Tripled-symbol block delimiter

Any three identical characters form a block delimiter:

    <Symbol><Symbol><Symbol>[name] {attrs}
    content
    <Symbol><Symbol><Symbol>

The opener may carry an optional name and attributes. The closer is the bare tripled symbol. The parser recognizes a built-in exclusive list of tripled symbols (see §4). Unrecognized tripled symbols are emitted as literal text.

#### 10.4.3 Delimiter placement

Doubled-symbol delimiters may appear:
- Surrounded by spaces: `aa ** bb ** cc`
- Adjacent to literal text on one or both sides: `aa**bb**cc`
- Adjacent to another delimiter: `__**text**__`

In all cases the delimiter is recognized. Whether an unmatched opener is treated as literal text follows the same rule as all inline constructs (§5, §9.4).

#### 10.4.4 Symbol repetition

When N identical characters appear at an inline position, the following rules apply:

**Inline delimiter symbols** (inline parsing context):

| Symbol | 1 | 2 | 3 | 4 | 5 |
|--------|---|---|---|---|---|
| `*` | literal | `Emphasis` open/close | `**` + `*` literal | `Emphasis([])` empty | `Emphasis([])` + `*` literal |
| `_` | literal | `Strong` open/close | `__` + `_` literal | `Strong([])` empty | `Strong([])` + `_` literal |
| `"` | literal | `QuoteInline(double)` open/close | `""` + `"` literal | `QuoteInline([])` empty | `QuoteInline([])` + `"` literal |
| `'` | literal | `QuoteInline(single)` open/close | `''` + `'` literal | `QuoteInline([])` empty | `QuoteInline([])` + `'` literal |
| \` | literal | `CodeInline` open/close | \`\` + \` literal¹ | `CodeInline("")` empty | `CodeInline("\`")` |
| `~` | literal | `Strikethrough` open/close | `~~` + `~` literal¹ | `Strikethrough([])` empty | `Strikethrough([])` + `~` literal |
| `$` | literal | `MathInline` open/close | `$$` + `$` literal¹ | `MathInline("")` empty | `MathInline("$")` |
| `^` | literal² | `Spoiler` open/close | `^^` + `^` literal¹ | `Spoiler([])` empty | `Spoiler([])` + `^` literal |
| `#` | literal | `##` line comment → Reflection entry (to EOL, no closer) | `CommentBlock` fence³ | `CommentBlock` fence + `#` literal | `CommentBlock` fence + `##` literal |

¹ When appearing at the **start of a block line**, ` ``` `, `~~~`, `$$$`, `^^^` are block fences (CodeBlock, Meta, MathBlock, SpoilerBlock respectively). In inline context, they parse as 2-delimiter + 1 literal.

² A single `^` is literal in inline context. Inside a `[...][^id]` link/definition target slot it retains its reference-marker role (§4.14, §5.5); that role is delimited by the surrounding brackets and never reaches the Spoiler parser.

³ `###` is a block fence only when it begins a block candidate (line-start at the container's effective column, per §9.2.4 / §10.5). In inline position, `###` parses as `##` (line comment opener — runs to EOL) + `#` (collapsed into the payload text).

**Block/structural symbols**:

| Symbol | 1 | 2 | 3 | 4+ |
|--------|---|---|---|-----|
| `=` | Heading L1 (+space) | Heading L2 | Heading L3 | … up to L9; 10+ = literal |
| `>` | QuoteBlock L1 | QuoteBlock L2 | QuoteBlock L3 | Level N (no limit) |
| `-` | list marker (`- `+space) or literal | literal `--` | ThematicBreak (3+) | ThematicBreak (extra chars silently dropped) |
| `:` | literal | Span prefix `::name` | NamedBlock prefix `:::name` | literal |
| `+` | Multiline table opener when followed by `-` or `:` (`+-`, `+:`) | — | — | — |

Paired symbols (`{}`/`[]`) follow their own rules and are not covered by this table.

#### 10.4.5 Delimiter collisions

When N identical characters appear and the parser recognizes a delimiter of length 2 or 3 at that position, the maximum recognized length is consumed as the delimiter. Any remaining characters are treated as literal content.

Known collisions:

| Sequence | Parsed as |
|----------|-----------|
| `~~~` at inline position | `~~` (Strikethrough opener) + `~` (literal) |
| `$$$` at inline position | `$$` (MathInline opener) + `$` (literal) |
| \`\`\` at inline position | \`\` (CodeInline opener) + \` (literal inside) |
| `"""` at inline position | `""` (QuoteInline double opener) + `"` (literal) |
| `'''` at inline position | `''` (QuoteInline single opener) + `'` (literal) |
| `^^^` at inline position | `^^` (Spoiler opener) + `^` (literal) |
| `###` at inline position | `##` (line comment → Reflection entry; trailing `#` is part of the payload text) |
| `---` non-line-start | literal text (ThematicBreak only classified at line start) |

### 10.5 List Indentation Model

Cutdown uses a **stack-based, column-relative** model for all list types (unordered, ordered, task). Nesting is determined by comparing marker columns, not by fixed indentation increments.

**Definitions:**
- The **column** of a line is its count of leading spaces before the first non-space character. Recorded from the original source before leading-space stripping (§10.2).
- The parser maintains a **nesting stack** of `(col, item)` pairs representing the currently open items from outermost to innermost.

**New marker at column C** (pop-then-push rule):
1. While the stack is non-empty and `C ≤ top.col`: pop.
2. Push the new item at column C.

A marker with `C > top.col` is a nested child (+1 depth). A marker with `C ≤ top.col` closes items until a shallower ancestor is found, then opens a sibling.

**Non-marker line (continuation text) at column C:**
1. While the stack depth ≥ 2 and `C < second-from-top.col`: pop.
2. Continue the now-current item.

Depth-0 items (no parent on the stack) accept any non-blank non-marker line unconditionally (threshold = −∞).

**Blank lines:**
- Blank line followed by content at **col 0** → block boundary. The current `List` segment ends. If the next line is a list marker, a new `List` node begins.
- Blank line followed by content at **col > 0** → absorbed by the list parser. The stack persists. A list marker continues the list via the pop-then-push rule; a non-marker line becomes block content inside the current item (`ListItem.children` becomes `Block[]`). The `List` is marked `loose: true`.

**Style note:** Two spaces of indentation per nesting level is recommended. The parser accepts any positive column delta as a valid nesting step; the stack model resolves all cases unambiguously.

```
Input (standard):
  - item 0.0
  - item 1.0
    - item 1.1
    - item 1.2

AST:
  List { ordered: false, loose: false }
  ├── ListItem { Text("item 0.0") }
  └── ListItem { Text("item 1.0") }
      └── List { ordered: false, loose: false }
          ├── ListItem { Text("item 1.1") }
          └── ListItem { Text("item 1.2") }
```

```
Input (loose list — absorbed blank line):
  - First item
    continues here
  - Second item

    This starts a new paragraph inside item two.

AST:
  List { ordered: false, loose: true }
  ├── ListItem
  │   └── Text("First item continues here")
  └── ListItem
      ├── Paragraph("Second item")
      └── Paragraph("This starts a new paragraph inside item two.")
```

### 10.6 Container-Edge Blank Lines

Leading and trailing **blank lines** (lines containing only whitespace per §10.1) are stripped from the body of non-opaque block containers before their children are parsed. No diagnostic is emitted.

**Applies to:**
- `NamedBlock` (§4.13)
- `SpoilerBlock` (§4.15)
- `QuoteBlock` (§4.6)
- `ListItem` / `TaskItem` (§4.7)
- Multiline table `Cell` (§4.8) — per-column blank-line detection; each column's edge strips independently

**Does NOT apply to opaque containers** — their bodies are captured verbatim:
- `CodeBlock` (§4.4)
- `Meta` (§4.3)
- `MathBlock` (§4.5)
- `CommentBlock` (§4.16)

**Pipeline order:**
1. Document-edge blank-line strip (§7 step 6).
2. Block classification and container body extraction.
3. **Container-edge blank-line strip (this section).**
4. Indent-base detection (NamedBlock / SpoilerBlock — §4.13 / §4.15). The "first content line" that establishes the base indentation is the first non-blank content line *after* edge-trim.
5. Child parsing.

A container whose body is empty after edge-trim produces `children: []` with no diagnostic. The container itself is preserved — it is a deliberate author construct.

```
Input:
  :::note

  content

  :::

AST:
  NamedBlock { name: "note", children: [Paragraph([Text("content")])] }
```

```
Input:
  :::note

  :::

AST:
  NamedBlock { name: "note", children: [] }
```

For `QuoteBlock`, a "blank line in the body" is a line whose `>`-stripped content is empty (e.g., `> ` alone, or `>` alone). Such lines at the leading or trailing edge of the quoted body are stripped before child parsing.

---
