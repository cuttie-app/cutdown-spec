## 11. Block Structure and Block Boundaries

### 11.1 Block Boundaries

Blocks are separated by one or more **blank lines**. A blank line is a line containing only whitespace (§1.4); consecutive blank lines act as one (§15.1).

A parser identifies block boundaries by scanning for blank line sequences. Each contiguous run of non-blank lines is classified by its first line (§12.1.3). A run does not always produce one block:

- A **single-line block** — `FileBlock`, `EmbedBlock`, `InjectBlock`, `RefDefinition`, a table row — consumes its own line. The rest of the run re-enters classification.
- A **heading** continues over the following lines under the paragraph continuation rules (§4.2), so `= Title` followed directly by `content` is one heading reading `Titlecontent`.
- A **`Paragraph`** consumes the whole run: it ends at the blank line that closes the run, and at no earlier line — not even one that would open a block if it began a run (see the no-interrupt rule below).
- A **fenced block** consumes from its opener to its closer, which may lie past a blank line (§11.4.2).

**Block elements cannot interrupt a paragraph.** Once a run has been classified as a `Paragraph`, every later line in it is paragraph content, whatever it looks like — this holds for **every** block opener without exception, fences included. See §4.1, which defines the rule.

Comments (§7) are detected in Phase 2 before block boundary analysis. A line starting with `###` is a CommentBlock fence; its body becomes a `SegmentReflection` on the Page, and no segment is produced. A line starting with `##` (pre-`##` content empty) is a standalone comment line: directly after content it attaches its payload backwards and does not split a List, Table, or FileGroup; after a blank line it is an orphan and becomes a `SegmentReflection` on the Page. See §7 for the full semantics and §B for every character's role.

### 11.2 Leading and Trailing Whitespace

Any number of leading spaces (including none) are stripped before block classification. A tab counts as one space (§10). Indentation has exactly four uses in Cutdown:

1. **Block classification ignores it.** The stripped line determines the block type.
2. **List nesting uses it.** For a list marker, the parser records the marker's **original column** (before stripping) as separate metadata and feeds it to the nesting stack model (§11.5). The column is used during list parsing only.
3. **Container padding removes it.** In a `NamedBlock` or `SpoilerBlock`, the first non-blank content line (after the edge-blank trim, §11.6) sets the base padding, and up to that many leading spaces are removed from every content line before its children are parsed. A line with fewer leading spaces loses all it has; no diagnostic is emitted. Relative indentation beyond the base survives, which keeps the shape of a `CodeBlock` body inside the container (§4.13, §4.15).
4. **Continuation lines measure it.** On a line that continues an inline context, whitespace up to the block's base column is layout and is dropped; whitespace beyond it becomes one space (§15.1).

Indented code blocks (as in [COMMONMARK]) are not supported.

Trailing whitespace on a line is always dropped, before a soft break and at a block boundary alike. §15.1 states the rule in full.

### 11.3 Block Classification

Each block candidate is classified by its first line (see §12.1.3 for the full classification table).

### 11.4 Syntax Primitives

Cutdown uses two structural patterns for delimiters:

Because every delimiter is at least doubled, a single symbol stays literal: one symbol is text, two open an inline segment, three open a block. Rationale: §C.3.

#### 11.4.1 Doubled-symbol inline delimiter

Any two identical characters form an inline block delimiter:

    <Symbol><Symbol> content <Symbol><Symbol> {attrs}

The opener and closer are the same doubled symbol. Inline blocks delimited this way are composable (nestable with other types). The parser recognizes a built-in exclusive list of doubled symbols (see §5). Unrecognized doubled symbols are emitted as literal text.

#### 11.4.2 Fences

A line that begins with three or more identical fence symbols opens a fence. The fence symbols are `` ` `` (CodeBlock, §4.4), `~` (Meta, §4.3), `$` (MathBlock, §4.5), `^` (SpoilerBlock, §4.15), `:` (NamedBlock, §4.13), and `#` (CommentBlock, §4.16):

    <Symbol><Symbol><Symbol>[word] {attrs} ## comment
    content
    <Symbol><Symbol><Symbol> ## comment

- **Opener.** The parser consumes three symbols. What follows them is the **tail**. A construct keeps only the parts of the tail it defines, and drops the rest with warning CDN-0016:

  | Fence | Kept on the opener | Kept on the closer |
  |---|---|---|
  | CodeBlock | language word, `{attrs}`, `## comment` | `## comment` |
  | MathBlock | `{attrs}`, `## comment` | `## comment` |
  | SpoilerBlock | `{attrs}`, `## comment` | `## comment` |
  | NamedBlock | name word, `{attrs}`, `## comment` | `## comment` |
  | Meta | format word | — |
  | CommentBlock | — | — |

  A surplus fence symbol starts the tail, so it is never part of a word: four backticks open a CodeBlock with the default language, `~~~~` a Meta with the default format, and `::::` a NamedBlock with no valid name. A kept `## comment` goes to the block's `reflections` (§7.2).

  The kept parts are matched from the start of the tail, after the `##` cut (§7.2):

  ```ebnf
  WORD_END     ::= WHITESPACE | "{" | CONTROL
  CODE_WORD    ::= (CHAR - ("`" | WORD_END)) (CHAR - WORD_END)*
  NAME_WORD    ::= (CHAR - (":" | WORD_END)) (CHAR - WORD_END)*
  META_WORD    ::= (CHAR - ("~" | WHITESPACE | CONTROL)) (CHAR - (WHITESPACE | CONTROL))*
  FENCE_ATTRS  ::= WHITESPACE* ATTR_GROUP WHITESPACE*
  CODE_OPEN    ::= CODE_FENCE CODE_WORD? FENCE_ATTRS?
  NAMED_OPEN   ::= NAMED_FENCE NAME_WORD? FENCE_ATTRS?
  MATH_OPEN    ::= MATH_FENCE FENCE_ATTRS?
  SPOILER_OPEN ::= SPOILER_FENCE FENCE_ATTRS?
  META_OPEN    ::= META_FENCE META_WORD?
  ```

  A word is glued to the fence: after a space there is no word, so ```` ``` js ```` has the default language and drops `js` with the rest of the tail. Whether a word is valid is a separate test — an `ID_NAME` for a language or a name (§4.4, §4.13), a known format for Meta (§4.3).
- **Closer.** The next line that begins with three or more of the same symbol closes the fence. Its tail is treated as above. Inside an open NamedBlock a line with a valid name word opens a nested block instead (§4.13); no other fence nests.
- **Escapes.** A body line that must begin with the fence symbols is written with a block-opener escape (§13.2) or, in opaque content, a closer escape (§13.3).

A PageBreaker (`---`, §4.10) follows the same rule for its tail, and keeps nothing.

#### 11.4.3 Delimiter placement

Doubled-symbol delimiters may appear:
- Surrounded by spaces: `aa ** bb ** cc`
- Adjacent to literal text on one or both sides: `aa**bb**cc`
- Adjacent to another delimiter: `__**text**__`

In all cases the delimiter is recognized. Whether an unmatched opener is treated as literal text follows the same rule as all inline constructs (§5, §12.1.4).

#### 11.4.4 Symbol repetition

What a run of N identical characters means — at the start of a line and at an inline position — is listed character by character in §B. At an inline position the longest recognized delimiter is consumed and the rest of the run is literal: `~~~` inline is `~~` (Highlight) followed by a literal `~`.

### 11.5 List Indentation Model

Cutdown uses a **stack-based, column-relative** model for all list types (unordered, ordered, task). Nesting is determined by comparing marker columns, not by fixed indentation increments.

**Definitions:**
- The **column** of a line is its count of leading spaces before the first non-space character. Recorded from the original source before leading-space stripping (§11.2).
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
- Blank line followed by content at **col > 0** → absorbed by the list parser. The stack persists. A list marker continues the list via the pop-then-push rule; a non-marker line becomes block content inside the current item, which then holds blocks (§4.7.1). The `List` is marked `loose: true`.

**Style note:** Two spaces of indentation per nesting level is the canonical form (§18.1, row 10). The parser accepts any positive column delta as a valid nesting step; the stack model resolves all cases unambiguously.

**Example 11-1** · [`list-nested`](../tests/004-block-segments/list-nested.yaml)

**Example 11-2** · [`list-loose-mixed-items`](../tests/011-block-structure/list-loose-mixed-items.yaml)

The list is loose because it absorbed a blank line. Item one's body is one paragraph, so it holds inline content; item two's body is two paragraphs, so it holds blocks (§4.7.1).

### 11.6 Container-Edge Blank Lines

Leading and trailing **blank lines** (§1.4) are stripped from the body of non-opaque block containers before their children are parsed. No diagnostic is emitted.

**Applies to:**
- `NamedBlock` (§4.13)
- `SpoilerBlock` (§4.15)
- `QuoteBlock` (§4.6)
- `ListItem` / `TaskItem` (§4.7)

**Does NOT apply to opaque containers** — their bodies are captured verbatim:
- `CodeBlock` (§4.4)
- `Meta` (§4.3)
- `MathBlock` (§4.5)
- CommentBlock (§4.16)

**Pipeline order:**
1. Document-edge blank-line strip (§10 step 6).
2. Block classification and container body extraction.
3. **Container-edge blank-line strip (this section).**
4. Indent-base detection (NamedBlock / SpoilerBlock — §4.13 / §4.15). The "first content line" that establishes the base indentation is the first non-blank content line *after* edge-trim.
5. Child parsing.

A container whose body is empty after edge-trim produces `children: []` with no diagnostic. The container itself is preserved — it is a deliberate author construct.

**Example 11-3** · [`trim-namedblock-edge-blanks`](../tests/011-block-structure/trim-namedblock-edge-blanks.yaml)

**Example 11-4** · [`trim-namedblock-empty-body`](../tests/011-block-structure/trim-namedblock-empty-body.yaml)

For `QuoteBlock`, a "blank line in the body" is a line whose `>`-stripped content is empty (e.g., `> ` alone, or `>` alone). Such lines at the leading or trailing edge of the quoted body are stripped before child parsing.

### 11.7 Nesting Limit

Block containers nest: a `QuoteBlock`, `ListItem`, `TaskItem`, `NamedBlock`, or `SpoilerBlock` may hold another. The **block depth** of a container is the number of these containers that enclose its body, itself included: in `- > :::note`, the `NamedBlock` has depth 3. A `List` is not counted — its items are — and neither is a `Section`, whose depth the heading levels bound.

**The block depth is at most 32.** A container opener that would open a container at depth 33 does not open: its line is classified as if the marker were text, inside the depth-32 container, and warning CDN-0040 is emitted with the `loc` of the marker. A `>` beyond the 32nd quote level is text: the line `>` repeated 33 times followed by `x` is a quote at depth 32 holding `Paragraph([Text("> x")])`. A fence opener that does not open is paragraph text, and a later closer line is matched against the containers that are open.

The limit protects every consumer that walks the tree recursively. §20.6 lists it with the other limits.

---
