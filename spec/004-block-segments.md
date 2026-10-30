## 4. Block Segments

### 4.1 Paragraph

**Syntax:** Any non-blank lines that do not match another block construct.

```
First paragraph line 1

Second paragraph line 1.
Second paragraph line 2.
```

A contiguous run of non-blank lines not matched by any other block type.

**No block opens inside a paragraph.** Once a run has been classified as a `Paragraph`, it continues to the next blank line (or the end of the enclosing container, or end of input). Every later line in the run is paragraph content regardless of how it begins — a heading marker, a list marker, a `---` separator, a table row, and every fence opener (`` ``` ``, `~~~`, `$$$`, `^^^`, `:::`, `###`) alike. No block opener is an exception, and none emits a diagnostic: to open a block, put a blank line before it.

Container prefixes are not block openers either. A `>` line whose quote depth differs from the depth of the paragraph above it closes that paragraph and goes to the quote at its own depth (§4.6); at the same depth the rule above holds, so `> a` followed by `> - b` is one paragraph.

Two line forms are **not** block openers and are unaffected by this rule — they attach to the preceding block instead of starting one, and may follow a paragraph line directly:

- a caption line (`^ `, §6.2);
- an attribute-continuation line (`{…}`, §6.1).

````
Input:
  Some text
  ```js
  const x = 1
  ```

AST:
    Paragraph { children: [Text("Some text```jsconst x = 1```")] }
````

The fence opener is ordinary text, so no `CodeBlock` forms. Soft breaks fold to zero (§12.1), which is why the lines concatenate with no separator inserted.

**AST type:**

```typescript
interface Paragraph {
  _type: "Paragraph"
  children: Inline[]
  attributes: Attribute[]
  reflections: LineReflection[]
}
```

- All lines are **parsed by inline rules** and concatenated. Result is `Inline[]`.
- A single newline between lines is a **soft break** — folded to zero; lines concatenate directly with no character emitted.
- Trailing whitespace is dropped. A word boundary between lines is written at the start of the continuation line: whitespace beyond the paragraph's base column becomes one space, so `First line` followed by ` second line` reads `First line second line` (§12.1).
- A `\` (backslash) at line end produces a `LineBreak` segment (explicit line break).

**Example:**

```
Input:
  First line
  second line\
  third line

AST:
  Paragraph
  ├── Text("First linesecond line")
  ├── LineBreak
  └── Text("third line")
```

---

### 4.2 Section (Heading)

**Syntax:**

```
={n} inline-content {attrs}
```

A heading creates a `Section` segment. Consumers receive `Section` segments — there is no bare `Heading` node in the AST. A `Section`'s extent is not parsed; it is derived by the sectionization fold defined in §9.3.1.

**AST type:**

```typescript
interface Section {
  _type: "Section"
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  heading: Inline[]
  children: Block[]
  attributes: Attribute[]
  reflections: LineReflection[]
}
```

| Syntax              | Level |
|---------------------|-------|
| `= Heading`         | 1     |
| `== Heading`        | 2     |
| `=== Heading`       | 3     |
| `==== Heading`      | 4     |
| `===== Heading`     | 5     |
| `====== Heading`    | 6     |
| `======= Heading`   | 7     |
| `======== Heading`  | 8     |
| `========= Heading` | 9     |

- The marker is followed by whitespace or the end of the line; all whitespace after it is consumed. `=Title` is paragraph text. A marker alone on its line opens a heading with empty content: `=` gives `level: 1`, `heading: []`. To keep a line of `=` as text, escape it (§8.2).
- Heading content is **parsed by inline rules**. Result is `Inline[]`.
- The content continues over following lines under the paragraph continuation rules (§4.1): the run ends at a blank line, an attribute line, a standalone `##` line (§2.2), or a `^ ` caption line (§6.2). The heading's base column is 2 at every level (§12.1): `= Title` followed by `content` is one heading reading `Titlecontent`, and followed by `   content` (three spaces) it reads `Title content`.
- A `=` line that does not begin a run is paragraph content (§4.1): a heading opens only after a blank line, or as the first line of the document or a block container.
- A run of ten or more `=` followed by whitespace or the end of the line opens a level-9 heading. The first nine `=` are the marker; the rest begin the heading content, so `========== Deep` gives `level: 9` and `heading: [Text("= Deep")]`. Warning CDN-0012 is emitted.
- The **last `{...}` at the end of the heading** is claimed by the Section (Last-Attr Rule). Earlier `{...}` attach to preceding inline elements. An explicit empty `{}` as the last token means the Section carries no attributes.
- Sections nest by level. A level-2 heading inside a level-1 section creates a child section. A level-1 heading closes all open sections and opens a new one at the root.
- Sections may appear inside block containers (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`). The fold runs independently inside each container, so a `Section` never crosses a container boundary (§9.3.1).
- **Opener escape:** `\=` at line start suppresses heading formation at **any** level — `\=`, `\==`, `\===` ... all become `Paragraph([Text("= ...")])`. See §8.2.

**Examples:**

```
= H1 [with link](..){.class}
→ Section { level: 1, heading: [Text("H1 "), Link(...)], attributes: [{ key: "class", value: ["class"] }] }

= H1 [with link](..){.class}{}
→ {} is last token → Section carries no attributes; {.class} attaches to Link
→ Section { level: 1, heading: [Text("H1 "), Link(..., [{ key: "class", value: ["class"] }])], attributes: [] }
```

---

### 4.3 Meta (Front Matter)

**Syntax:** Fenced with three tildes (§10.4.2).

```
~~~format
content
~~~
```

**AST type:**

```typescript
interface Meta {
  _type: "Meta"
  format: "yaml" | "toml" | "json"  // default: "yaml"
  raw: string
}
```

- **Format word:** the run after `~~~` up to whitespace or end of line. `yaml`, `toml`, and `json` are recognized in any case and stored lowercased. No word, or a run of four or more `~`, gives `"yaml"`. Any other word gives `"yaml"` and warning CDN-0039. Text after the word is dropped with CDN-0016.
- Content is a raw string passed as-is to the consumer. Lines joined with `\n`; a single trailing `\n` is appended.
- Fills the current `Page.meta`; if that slot is already set, opens a new Page first (§9.3.2). Never appears in `Page.children`.
- Only valid at Page scope. Inside block containers, the entire span is emitted as a `Paragraph` → warning CDN-0030.
- Unclosed fence → warning CDN-0002.
- No `attributes` field.
- **Closer escape:** `\~` inside the body emits a literal `~` (tilde) and consumes the `\`. A line `\~~~`, `~\~~`, or `~~\~` therefore does NOT close the fence. All other `\X` sequences are literal. See §8.3. Opener escape: see §8.2.

**Example:**

```
~~~
title: My Document
~~~

AST:
    Page {
        meta: Meta { format: "yaml", raw: "title: My Document\n" },
        children: []
    }
```

---

### 4.4 CodeBlock

**Syntax:** Fenced with three backticks (§10.4.2).

````
```language {attrs}
content
```
````

**AST type:**

```typescript
interface CodeBlock {
  _type: "CodeBlock"
  language: string  // default: "text"
  raw: string
  attributes: Attribute[]
  caption: Inline[]
  reflections: LineReflection[]
}
```

- **Language word:** the run after ```` ``` ```` up to whitespace, `{`, or end of line. A word that is an `ID_NAME` is the language. No word, or a run of four or more backticks, gives `"text"`. Any other word (```` ```c++ ````) gives `"text"` and warning CDN-0038.
- After the language word the opener keeps `{attrs}` and a `## comment` (§2.2); any other text is dropped with CDN-0016. The closer keeps only a `## comment`.
- Content is **literal** — no inline parsing. Lines joined with `\n`; no trailing `\n` appended. Blank lines preserved verbatim.
- No nesting: the next line that begins with three or more backticks closes the fence (§10.4.2).
- Unclosed fence: content runs to end of document → warning CDN-0001.
- Legal inside `ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`. Container indentation is stripped from content lines.
- **Closer escape:** `` \` `` inside the body emits a literal `` ` `` (backtick) and consumes the `\`. A line `` \``` ``, `` `\`` ``, or `` ``\` `` therefore does NOT close the fence. All other `\X` sequences are literal (including `\\` → two chars). See §8.3. Opener escape: see §8.2.
- **Supports caption line (§6.2).** A `^ text` line immediately after the closing fence (no blank line) sets `caption: Inline[]` on this node.

---

### 4.5 MathBlock

**Syntax:** Fenced with three dollar signs (§10.4.2).

```
$$$ {attrs}
\LaTeX formula
$$$
```

**AST type:**

```typescript
interface MathBlock {
  _type: "MathBlock"
  raw: string
  attributes: Attribute[]
  caption: Inline[]
  reflections: LineReflection[]
}
```

- Content is **literal** — no inline parsing. Passed as raw string to the consumer ([KATEX] or equivalent).
- The opener keeps `{attrs}` and a `## comment` (§2.2); the closer keeps a `## comment`. Any other text after the three `$` is dropped with CDN-0016.
- Lines joined with `\n`; no trailing `\n` appended. Blank lines preserved verbatim.
- Unclosed fence: content runs to end of document → warning CDN-0003.
- Legal inside block containers. Indentation handling follows the same rules as `CodeBlock`.
- **No closer escape — LaTeX owns `\`.** Every backslash inside a MathBlock body is literal, including `\$`. A body line that begins with `$$$` therefore prematurely closes the fence; this is an accepted unsupported case (wrap such content in a `CodeBlock` or split the math). See §8.3. Opener escape (`\$$$`): see §8.2.
- **Supports caption line (§6.2).** A `^ text` line immediately after the closing fence (no blank line) sets `caption: Inline[]` on this node.

**Example:**

```
Input:
  $$$ {.display #eq1}
  \int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
  $$$

AST:
  MathBlock {
    raw: "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
    attributes: [{ key: "class", value: ["display"] }, { key: "id", value: "eq1" }]
  }
```

---

### 4.6 QuoteBlock

**Syntax:** Lines prefixed with `>` and a separator.

```
> content
> more content
> > nested quote
```

**AST type:**

```typescript
interface QuoteBlock {
  _type: "QuoteBlock"
  children: Inline[] | Block[]
  attributes: Attribute[]
  caption: Inline[]
  reflections: LineReflection[]
}
```

- The `>` (greater-than sign) prefix opens the quote. It is required on the quote's first line.
- **Separator.** Every `>` is followed by whitespace or the end of the line. Exactly one whitespace character is consumed with it; any further whitespace belongs to the content. A `>` followed by anything else is not a quote marker: `>quote` and `>> x` are paragraph text. A bare `>` is a quote line with empty content.
- **Lazy continuation.** A following line without `>` continues the quote. The line is handed to the quote's current child block and follows that block's own continuation rules — a `Paragraph` absorbs it as a continuation line (§4.1), a list item absorbs it per §10.5, a heading absorbs it as a continuation line (§4.2). This is the same continuation behaviour the line would have outside the quote. Its leading whitespace is measured as if it carried the `>` markers of the open quotes: the first 2 columns per open quote level stand for them (§12.1).
- The quote ends at a blank line, at the end of the enclosing block container, or at the end of the document. A `>` line after a blank line opens a new `QuoteBlock`.
- Content is parsed as full block content. A body that parses to exactly one `Paragraph` is held as that paragraph's `Inline[]`, as in a list item (§4.7.1); any other body is `Block[]`.
- Nesting: `> >` = blockquote inside blockquote. Depth = count of `>` markers, each with its separator. A line whose depth differs from the line above is a structural boundary, not a block opener: it closes the open paragraph and goes to the quote at its own depth, opening or closing quotes as needed (§4.1). A lazy continuation line carries no `>`, so it does not change the current depth — it continues the innermost open quote.
- **Body edge-blank trim:** After `>` stripping, leading and trailing blank lines inside the quoted body are stripped before children are parsed. See §10.6.
- **Opener escape:** `\>` at line start → `Paragraph([Text("> ...")])`. See §8.2.
- **Supports caption line (§6.2).** A `^ text` line immediately after the closing line (no blank line) sets `caption: Inline[]` on this node.

**Examples:**

```
Input:
  > Line 1
  > Line 2
  >  Line 3

AST:
    QuoteBlock { children: [Text("Line 1Line 2 Line 3")] }
```

```
Input:
  > Line 1
  > > > Line 2
  > > Line 3

AST:
    QuoteBlock
    ├── Paragraph { children: [Text("Line 1")] }
    └── QuoteBlock
        ├── QuoteBlock { children: [Text("Line 2")] }
        └── Paragraph { children: [Text("Line 3")] }
```

```
Input:
  > Line 1
  Line 2
     Line 3

  Line 4

AST:
    QuoteBlock { children: [Text("Line 1Line 2 Line 3")] }
    Paragraph { children: [Text("Line 4")] }
```

```
Input:
  > - item one
  still item one

AST:
    QuoteBlock
    └─── List { kind: "bullet", loose: false }
         └── ListItem { children: [Text("item onestill item one")] }
```
---

### 4.7 List

**Syntax:** One or more list items sharing a common indentation level.

```
- unordered item
  - nested item

1. ordered item
2. second item

- [ ] task item
- [x] checked task
```

**AST type:**

```typescript
interface List {
  _type: "List"
  kind: "bullet" | "numbered" | "checklist"
  start: number         // first item number for kind: "numbered"; 1 otherwise
  loose: boolean
  children: (ListItem | TaskItem)[]
  attributes: Attribute[]
}
```

- Unordered marker: `-` (hyphen). Only `-` is supported.
- Ordered marker: `{number}.`, where `{number}` is 1–5 ASCII digits. A run of six or more digits is not a marker, so the line is not a list item. The first item's number sets `List.start`; every other item's number is ignored.
- A marker is followed by whitespace or the end of the line; all whitespace after it is consumed. `-x` and `1.x` are paragraph text. A marker alone on its line opens an item with empty content: `-` gives a `ListItem` with `children: []`.
- `kind` is determined by the **first item's marker**: `-` → `"bullet"`, `{n}.` → `"numbered"`, `- [ ]`/`- [x]`/`- [+]` → `"checklist"`.
- `start` is always present. It is `1` for `kind: "bullet"` and `"checklist"`. For `"numbered"` it is the first item's number, except that `0` is coerced to `1`, silently.
- **Tight vs loose:** A list is `loose: true` when it absorbs a blank line, between two items or inside one. `loose` is an advisory flag for consumers — the parser does not alter children based on it; each item's shape depends only on its own body (§4.7.1).
- A blank line followed by a col-0 marker ends the current list and starts a new `List` segment. A standalone `##` line directly after an item does not: it attaches to that item and the list continues (§2.2).
- `List` has no `reflections`. A `## comment` on an item's line goes to that item.
- **Opener escape:** `\-` at line start → `Paragraph([Text("- ...")])`. See §8.2.

---

#### 4.7.1 ListItem

**Syntax:** A list marker followed by content, with optional indented continuation lines.

```
- unordered item
  continuation line

1. ordered item
   continuation line
```

**AST type:**

```typescript
interface ListItem {
  _type: "ListItem"
  children: Inline[] | Block[]
  attributes: Attribute[]
  reflections: LineReflection[]
}
```

- Content on the marker line is **parsed by inline rules**. Continuation lines at the same or deeper indentation are absorbed. The item's base column is its marker's column plus 2, whatever the marker's width (§12.1).
- **Shape.** An item whose body parses to exactly one `Paragraph` holds that paragraph's inline content: `children: Inline[]`. Any other body — two paragraphs, a paragraph and a nested list, a code block — is `children: Block[]`, with the first paragraph kept as a `Paragraph`. The two never mix.
- When the paragraph is dropped, its `attributes` and `reflections` move to the item. Classes merge by the rule of §6.1.1, the item's own first.
- Attributes follow the scope-chain rule (§6).

---

#### 4.7.2 TaskItem

**Syntax:**

```
- [ ] content

or

- [x] content

or

- [+] content
```

**AST type:**

```typescript
interface TaskItem {
  _type: "TaskItem"
  checked: boolean
  children: Inline[] | Block[]
  attributes: Attribute[]
  reflections: LineReflection[]
}
```

- Marker: `- ` followed immediately by `[ ]` (unchecked) or `[x]`/`[X]`/`[+]` (checked), then whitespace or the end of the line, as for every list marker. `[]` with no space is not a task marker — the item is an ordinary `ListItem` whose content begins `[]`. `[+]` is bidi-neutral; see §16 for which spelling a writer emits.
- Only `kind: "bullet"` list items may carry a checkbox. A `kind: "numbered"` list encountering a task marker closes and a new `kind: "checklist"` List segment opens.
- A `List` with `kind: "checklist"` has `children: TaskItem[]` exclusively; `kind: "bullet"` and `kind: "numbered"` have `children: ListItem[]` exclusively.
- Mix of item types introduces a new list boundary: the first item of the new type starts a new `List` segment.
- Follows the same multiline and shape rules as `ListItem`.

**Example:**

```
Input:
  - [ ] Buy milk
  - [x] Write spec
  - [+] Review draft
  - plain item

AST:
  List { kind: "checklist", loose: false }
  ├── TaskItem { checked: false, children: [Text("Buy milk")] }
  ├── TaskItem { checked: true,  children: [Text("Write spec")] }
  └── TaskItem { checked: true,  children: [Text("Review draft")] }
  List { kind: "bullet", loose: false }
  └── ListItem { children: [Text("plain item")] }
```

---

### 4.8 Table

A table opens with a line starting with `|` (pipe). Each line is one row of cells separated by `|`; an optional header separator row sets the column alignments.

```
| Cell A | Cell B |                        ← no-header table

| Name   | Score |                         ← table with header
|:-------|------:|                         ← header separator; left / right align
| Alice  |    42 |
| Bob    |    17 |
```

**AST type:**

```typescript
interface Table {
  _type: "Table"
  rows: Row[]
  columns: Column[]
  attributes: Attribute[]
  caption: Inline[]
}

interface Row {
  _type: "Row" | "Header"
  children: Cell[]
  attributes: Attribute[]
  reflections: LineReflection[]
}

interface Cell {
  _type: "Cell"
  children: Inline[]
  row: number                    // zero-indexed position in Table.rows[]
  column: number                 // zero-indexed
}

interface Column {
  _type: "Column"
  align: "start" | "left" | "right" | "center" | "comma" | "decimal"  // default: "start"
}
```

`Cell` and `Column` do not carry `attributes`. Colspan and rowspan are not supported.

---

#### Header rows

A row that matches `SEPARATOR_ROW` (see Column alignment below) is a **header separator**. It marks the group of content rows immediately preceding it (since the previous separator row, or the start of the table) as `_type: "Header"`. All other content rows are `_type: "Row"`.

```
| A | B |
|---|---|    ← header separator → preceding rows become _type: "Header"
| C | D |    ← _type: "Row"
```

Discontiguous header sections are valid — HTML `<table>` supports mixed `<thead>`/`<tbody>` ordering. A header separator anywhere marks only the rows in the immediately preceding section.

**Empty header.** A header separator with no content row in its section — at the start of the table, or directly after another separator — inserts one empty `Header` row before itself. The row is inserted whether or not the separator carries a comment. Its cells are padded to the column count like any short row, it carries the `loc` of its separator or none (§14.5), and it does not fix the column count. A writer does not emit it: the separator alone reproduces it (§16).

```
|---|---|    →  Header (empty, inserted)
| C | D |    →  Row
```

---

#### Column alignment

Alignment is taken from the cell patterns of the **first header separator** in the table. Subsequent header separators do not update alignment.

| Pattern | Alignment |
|---------|-----------|
| `:--` | `"left"` |
| `--:` | `"right"` |
| `:-:` | `"center"` |
| `--,` | `"comma"` |
| `--.` | `"decimal"` |
| `---` | `"start"` (default) |

Each pattern is at least **three symbols long, alignment marks included**, and contains at least one `-`. Any number of further `-` may be added: `:---` is the same pattern as `:--`. The minimum is a deliberate guard: a content row of one- or two-dash placeholder cells (`| - |`, `| -- |`) remains content, not a header separator.

```ebnf
SEPARATOR_ROW  ::= "|" SEPARATOR_CELL ("|" SEPARATOR_CELL)* ("|" (WHITESPACE* ATTR_GROUP)* WHITESPACE*)?
SEPARATOR_CELL ::= WHITESPACE* ALIGN_PATTERN WHITESPACE*
ALIGN_PATTERN  ::= ":" "-" "-"+          /* left */
                 | "-" "-"+ ":"          /* right */
                 | ":" "-"+ ":"          /* center */
                 | "-" "-"+ ","          /* comma */
                 | "-" "-"+ "."          /* decimal */
                 | "-" "-" "-"+          /* start */
```

A row that matches `SEPARATOR_ROW`, after its `## comment` is cut (§2.2), is a header separator; any other row is content.

A column with no corresponding position in the header separator, and every column of a table with no header separator, takes `"start"`.

`"start"` is not a synonym for `"left"`. `"start"` follows the text direction of the content — the left edge in a left-to-right script, the right edge in a right-to-left one. `:---` is an explicit request for the left edge in either. A consumer that renders to CSS maps `"start"` to `text-align: start` and `"left"` to `text-align: left`.

---

#### Table shape

**Leading `|` required.** Every content row and header separator opens with `|`. It is the detection anchor (§9.1.3 classifies a table by `^\|`); without it the line is a Paragraph.

**Trailing `|` optional.** The last `|` on a line is always the **closer**, never a cell separator. It closes the final cell rather than opening an empty one.

```
| A | B |      →  2 cells
| A | B        →  2 cells
| A | B | |    →  3 cells, the third empty, then the closer
```

The closer also determines how deep a trailing `{attrs}` chain reaches — see *Attrs scope chain* below and §6.

**Column count is fixed by the first content row that has at least one cell.** Not `max()` across rows. A header separator is never a content row, so it never defines the count, and neither does a row with no cells or an inserted empty `Header` row.

- A row with **fewer** cells — a later row, or an earlier row with no cells — is padded with empty `Cell` nodes to the column count. No diagnostic — nothing is lost, this is normalisation. Padded cells carry no `loc` (§14).
- A later row with **more** cells has the surplus cells **dropped** and emits **CDN-0018**.
- A header separator **wider** than the column count likewise drops its surplus and emits **CDN-0018** — losing alignment silently is the failure the diagnostic exists to prevent.
- A header separator **narrower** than the column count is not an error; the uncovered columns take `"start"` per *Column alignment* above.
- A table whose only rows are header separators has `columns: []` and emits **no** diagnostic — with no content row, no column count was ever established for the separator to exceed. Each separator still inserts its empty `Header` row.

#### Row content

- Each `|` content line is one independent logical row, a `|` with no cells included.
- Cells contain `Inline[]` parsed by full inline rules.
- The table ends at the first line that is neither a content row nor a header separator — including a blank line, a container boundary, or any other block opener. That line is classified on its own (§9.1.3); a later `|` line opens a **new** table.

**Attrs scope chain.** Rule B (§6) applies. The slots available to a row's trailing `{attrs}` sequence depend on two things — which row it is, and whether the last cell was closed:

| Row | Last cell | Slots, outermost first |
|---|---|---|
| last content row | left open (no trailing `\|`) | `Table`, `Row`, last attr-bearing inline in the cell |
| last content row | closed by a trailing `\|` | `Table`, `Row` |
| any earlier row | left open | `Row`, last attr-bearing inline in the cell |
| any earlier row | closed by a trailing `\|` | `Row` |

`Cell` bears no attributes, so the chain never stops at a cell — it walks past it to the inline inside. Writing the closing `\|` seals that cell's inline context before the chain begins, which removes the inline slot.

A chain written **before** the closer is inside the cell's inline context and distributes through the *cell's* slots instead — the cell's last attr-bearing inline, one slot only. This applies to any cell, not just the last. A cell whose content is plain text has no such inline, so the `{}` is dropped with CDN-0011; neither `Row` nor `Table` receives it. See §6.

The inline slot searches the **last cell only**. If that cell holds no attr-bearing inline, the slot goes unclaimed and the `{}` is dropped with CDN-0011 (§6.1.3).

`{attrs}` on a **header separator** row claim the Table slot directly.

```
Last content row:
| td1 | td2 | {.a}{.b}       →  Table({.b}, Row({.a}, ...))     ← sealed: 2 slots
| td1 | td2 | {.a}           →  Table({.a}, Row(...))           ← single {} = Table slot
| AA | **BB** {.a}{.b}{.c}   →  Table({.c}, Row({.b}, Cell(...), Cell(Strong({.a}, "BB"))))
| AA | **BB** | {.a}{.b}{.c} →  Table({.c}, Row({.b}, ...))     ← sealed; {.a} dropped (CDN-0011)
| AA | CC {.a}{.b}{.c}       →  Table({.c}, Row({.b}, ...))     ← last cell is Text; {.a} dropped

Chain before the closer — cell chain, 1 slot:
| AA | **BB** {.a} |         →  Row(Cell(...), Cell(Strong({.a}, "BB")))
| **AA** {.x} | BB |         →  Row(Cell(Strong({.x}, "AA")), Cell("BB"))
| AA | CC {.a} |             →  Row(Cell("AA"), Cell("CC"))   ← plain text: {.a} dropped (CDN-0011)

Mid-table row:
| td1 | td2 | {.a}           →  Row({.a}, ...)                  ← sealed: 1 slot only
| AA | **BB** {.a}{.b}       →  Row({.b}, Cell(...), Cell(Strong({.a}, "BB")))
```

---

#### Empty tables

A single `|` line with no cell content is a valid table with one empty row:

```
|            →  Table { rows: [Row { children: [] }], columns: [] }

| {.tbl}     →  Table { rows: [Row { children: [] }], columns: [], attributes: [{class:["tbl"]}] }
```

For `| {.tbl}`: the row is the last content row and a single `{}` claims the Table slot, as for any last row.

---

#### Reflections

`Table` has no `reflections`. A trailing `## comment` on a content row goes to that row's `reflections`, carrying the payload's `loc`. On a header separator it goes to the row before the separator — the inserted empty `Header` row when the separator has no content row above it. On the caption line it goes to the last row. A standalone `##` line directly after a row goes to that row and does not end the table. See §2.2. A `##` appearing inside cell content (before the row's closing `|`) causes the pre-`##` cell fragment to fail the row grammar and fall back to a Paragraph; the payload then attaches to that Paragraph's `reflections`.

---

#### Caption and escaping

- **Supports caption line (§6.2).** A `^ text` line immediately after the table's last line (no blank line) sets `caption: Inline[]`.
- **Escaping:** `\|` at line start → `Paragraph` (suppresses a table row or header separator). See §8.2.

---

### 4.9 EmbedBlock

**Syntax:**

```
https://example.com/watch?v=abc {attrs}
```

A line at block level beginning with `https://` is an `EmbedBlock`. The match is literal and case-sensitive: `http://`, `HTTPS://`, and every other scheme leave the line a `Paragraph`.

**AST type:**

```typescript
interface EmbedBlock {
  _type: "EmbedBlock"
  url: string
  attributes: Attribute[]
  caption: Inline[]
  reflections: LineReflection[]
}
```

- `url` runs from the `h` of `https://` to the end of the line, after removing one trailing attribute sequence (whitespace followed by one or more `{…}` groups that close the line) and then trailing whitespace. It is a raw string: Cutdown does not parse, validate, or fetch it. `{{key}}` interpolation tokens stay in it verbatim (§5.11).
- A `url` longer than 2048 Unicode scalar values is kept in full and still opens an `EmbedBlock`; warning CDN-0035 is emitted.
- What an embed shows is the consumer's decision — for example, resolving an [OEMBED] snippet at render time and placing it in the page.
- An `EmbedBlock` never joins a `FileGroup` (§4.12), and an `EmbedBlock` line ends an open `FileGroup`. Consecutive `EmbedBlock` lines are separate blocks.
- Like every block opener, `https://` cannot interrupt a paragraph (§10.1): a URL line glued to paragraph text is paragraph content.
- **Opener escape:** `\https://…` at line start → `Paragraph([Text("https://…")])`. See §8.2.
- **Supports caption line (§6.2).** A `^ text` line immediately after this line (no blank line) sets `caption` on this node.

```
https://youtu.be/dQw4w9WgXcQ {.wide}
^ The talk
  → EmbedBlock { url: "https://youtu.be/dQw4w9WgXcQ", attributes: [{ key: "class", value: ["wide"] }], caption: [Text("The talk")] }
```

---

### 4.10 PageBreaker

**Syntax:**

```
---
```

A top-level line beginning exactly `---`. A PageBreaker is a pagination signal, not a block: it is consumed by the pagination fold (§9.3.2) and **produces no AST node**. It unconditionally closes the current Page — as a Ghost Page if empty — opens a new one, and closes all open root-level Sections.

- The rest of the line — surplus hyphens, `{attrs}`, any other content — is dropped, and CDN-0016 is emitted, as for a fence line (§10.4.2). There is no attributed form.
- Inside a **Block container** (`List`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`): a blank-line-surrounded `---` line is not a PageBreaker — it parses as `Paragraph([Text("---")])` and CDN-0017 is emitted. Glued to a preceding paragraph, `---` is ordinary paragraph content per the no-interrupt rule (§10.1); no diagnostic is emitted.
- **Opener escape:** `\---`, `-\--`, or `--\-` at top level → `Paragraph([Text("---")])`; no Page boundary occurs. See §8.2.
- Cutdown performs no front-matter detection: a document-leading `---` is a PageBreaker like any other, yielding a leading Ghost Page.
- Cutdown defines no thematic-break (horizontal-rule) element.

**Examples:**

```
---              → page boundary, no node

Illegal:
--- {.page-end}  → page boundary, no node (tail dropped, CDN-0016)
--- some text    → page boundary, no node (tail dropped, CDN-0016)
```

---

### 4.11 FileBlock

**Syntax:**

```
/path/to.file {attrs}
```

A line at block level beginning with `/` is a `FileBlock`, unless it is an `InjectBlock` (§4.17).

**AST type:**

```typescript
interface FileBlock {
  _type: "FileBlock"
  raw: string                       // the path as written (§9.2)
  src: PathResourceLocator | null   // null when the path is invalid
  attributes: Attribute[]
  caption: Inline[]
  reflections: LineReflection[]
}
```

- `src` is a `PathResourceLocator` (§9.2). Its extent is the whole line from the leading `/`, after removing one trailing attribute sequence and then trailing whitespace (§9.2.1). Spaces inside the path are path content: `/My Docs/Q3 report.pdf` is one path.
- A line whose normalized path (§9.2.4) is `/` — `/` alone, `/` with only a query or fragment such as `/#` or `/?a=1`, or a spelling such as `/./` or `/a/..` — is a valid `FileBlock` with `src.path` `"/"`. What it refers to is the consumer's decision.
- Cutdown assigns no media type and no group. A consumer that needs one inspects `src.path`.
- A `FileBlock` never stands alone: it is always a child of a `FileGroup` (§4.12).
- **Opener escape:** `\/path` at line start → `Paragraph([Text("/path")])`. See §8.2.
- **Supports caption line (§6.2).** A `^ text` line immediately after this line (no blank line) sets `caption` on this `FileBlock`. The caption does not end the `FileGroup`.

---

### 4.12 FileGroup

Consecutive `FileBlock` lines with no blank line between them form one `FileGroup`. It is not written explicitly; the parser assembles it, the way consecutive list items form a `List`.

**AST type:**

```typescript
interface FileGroup {
  _type: "FileGroup"
  children: FileBlock[]
  attributes: Attribute[]
}
```

- Every `FileBlock` is inside a `FileGroup`. A single `FileBlock` line forms a `FileGroup` with one child.
- A blank line ends the group. The next `FileBlock` line starts a new `FileGroup`.
- Any line that is not a `FileBlock` line also ends the group — an `EmbedBlock` or `InjectBlock` line included — except a caption line and a trailing `{attrs}` line, which emit no block (§6.2), and a standalone `## comment` line directly after a `FileBlock`, which attaches to it (§2.2).
- `FileGroup` has no `reflections`. A `## comment` on a `FileBlock` line goes to that `FileBlock`.
- The members need not be of one kind: `/a.png` and `/b.pdf` on consecutive lines share a group.
- `FileGroup` takes no caption. Each member carries its own.
- Attribute placement follows the scope-chain rule (§6.1.2).

**Example:**

```
Input:
  /photos/a.png
  ^ First
  /docs/report.pdf

  /photos/b.jpg

AST:
  FileGroup
  ├── FileBlock { raw: "/photos/a.png", src: { path: "/photos/a.png", … }, caption: [Text("First")] }
  └── FileBlock { raw: "/docs/report.pdf", src: { path: "/docs/report.pdf", … } }
  FileGroup
  └── FileBlock { raw: "/photos/b.jpg", src: { path: "/photos/b.jpg", … } }
```

---

### 4.13 NamedBlock

**Syntax:**

```
:::block-name {attrs}
  content
:::
```

**AST type:**

```typescript
interface NamedBlock {
  _type: "NamedBlock"
  name: string
  children: Inline[] | Block[]
  attributes: Attribute[]
  caption: Inline[]
  reflections: LineReflection[]
}
```

- Opening: a line that begins with three or more `:` (§10.4.2). The **name word** runs from directly after the third `:` to whitespace, `{`, or end of line. A word that is an `ID_NAME` is the `name`.
- A missing name word, or one that is not an `ID_NAME` (`:::`, `::: x`, `:::c++`, `::::`), still opens a NamedBlock, with `name: ""` and warning CDN-0013. Its body is parsed as blocks like any other. An escaped opener (`\:::`, `:\::`, `::\:`) opens nothing and emits no warning. See §8.2.
- After the name word the opener keeps `{attrs}` and a `## comment` (§2.2); any other text is dropped with CDN-0016.
- Closing: inside an open NamedBlock, a line that begins with three or more `:` and carries a valid name word opens a nested NamedBlock; any other such line closes the innermost open one. The closer keeps a `## comment`; any other text after the three `:` is dropped with CDN-0016.
- Content: any block content, including nested `:::` containers. A body that parses to exactly one `Paragraph` is held as its `Inline[]`, and the paragraph's `attributes` and `reflections` move to the NamedBlock, as for a list item (§4.7.1).
- Unclosed container: content runs to end of document → warning CDN-0004.
- **Container padding:** The first non-blank content line (after the edge-blank trim below) sets the base padding. Up to that many leading spaces are removed from every content line before parsing; a line with fewer leading spaces loses all it has, and nothing else. No diagnostic is emitted. A tab counts as one space (§7). The opener and closer may themselves be indented by any amount. See §10.2.
- **Body edge-blank trim:** Leading and trailing blank lines inside the body are stripped before children are parsed. See §10.6.
- **Supports caption line (§6.2).** A `^ text` line immediately after the closing `:::` (no blank line) sets `caption: Inline[]` on this node.

**Example:**

```
:::callout {.warning}
  > quoted text
:::
→ NamedBlock { name: "callout", children: [QuoteBlock([Text("quoted text")])], attributes: [{ key: "class", value: ["warning"] }] }
```

---

### 4.14 RefDefinition

**Syntax:**

```
[^ref]: content
```

`[^ref]:` is a RefDefinition only at the start of a line, after any container prefix. Anywhere else it is inline content.

**AST type:**

```typescript
interface RefDefinition {
  _type: "RefDefinition"
  ref: string
  children: Inline[]
  attributes: Attribute[]
  reflections: LineReflection[]
}
```

- `ref` is an `ID_NAME` (§1.1). Case-sensitive.
- Empty `ref` (line starting with `[^]:`) is invalid state and produces string literal for whole line.
- The `:` is followed by whitespace or the end of the line; all whitespace after it is consumed. `[^ref]:x` is paragraph text. Empty content (`[^ref]:`) is valid and produces an empty `children` array.
- Content is **parsed by inline rules**. Result is `Inline[]`.
- Cutdown does not validate that every `[^ref]` link has a matching definition.
- When the same `ref` is defined more than once in a document, resolution uses the last definition in source order (**last wins**). Resolution is the consumer's responsibility (§9.1.4).

---

### 4.15 SpoilerBlock

**Syntax:** Fenced with three carets (§10.4.2).

```
^^^ {attrs}
  content
^^^
```

**AST type:**

```typescript
interface SpoilerBlock {
  _type: "SpoilerBlock"
  children: Inline[] | Block[]
  attributes: Attribute[]
  caption: Inline[]
  reflections: LineReflection[]
}
```

- Opening: a line that begins with three or more `^`. The opener keeps `{attrs}` and a `## comment` (§2.2); any other text is dropped with CDN-0016.
- Closing: the next line that begins with three or more `^`. The closer keeps a `## comment`; any other text is dropped with CDN-0016.
- Content is parsed as blocks. A body that parses to exactly one `Paragraph` is held as its `Inline[]`, as for a NamedBlock (§4.13).
- **No nested SpoilerBlocks.** The first such line encountered inside an open SpoilerBlock always closes it. A second `^^^` opener on the next non-blank line starts a new sibling SpoilerBlock. Tiered reveals (a Spoiler inside a Spoiler) are out of scope; if a use case genuinely requires it, wrap the inner content in `:::spoiler` NamedBlock instead.
- **Container padding:** same rule as `NamedBlock` (§4.13) — the first non-blank content line sets the base padding, and up to that many leading spaces are removed from every content line.
- **Body edge-blank trim:** Leading and trailing blank lines inside the body are stripped before children are parsed. See §10.6.
- Unclosed fence: content runs to end of document (or end of the parent block container) → warning CDN-0005.
- Legal inside `ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`. Container indentation is stripped from content lines.
- Semantic variants (NSFW, redacted, entertainment-spoiler) are carried in `attributes`; `SpoilerBlock` has no `kind` field.
- **Escape:** SpoilerBlock body is **not opaque** — children are parsed as blocks. Use §8.2 block-opener escape (`\^^^`, `^\^^`, `^^\^`) on a content line to prevent it from closing the fence.
- **Supports caption line (§6.2).** A `^ text` line immediately after the closing `^^^` (no blank line) sets `caption: Inline[]` on this node.

**Example:**

```
Input:
  ^^^ {.nsfw}
  Plot twist: __the butler__ did it.

  - and so did the gardener
  ^^^

AST:
  SpoilerBlock {
    attributes: [{ key: "class", value: ["nsfw"] }],
    children: [
      Paragraph([Text("Plot twist: "), Emphasis([Text("the butler")]), Text(" did it.")]),
      List { kind: "bullet", children: [ListItem([Text("and so did the gardener")])] }
    ]
  }
```

---

### 4.16 CommentBlock

**Syntax:** Fenced with three octothorpes (§10.4.2).

```
###
opaque content
###
```

**AST:** none. A CommentBlock produces no segment: its body becomes a `SegmentReflection` in `Page.reflections` (§2.3).

- Opening: a line whose stripped content begins with three or more `#`. Nothing on the opener line is kept: surplus `#`, `{attrs}`, a `## comment`, and any other text are dropped with CDN-0016. `### note` and `####` both open a CommentBlock.
- Closing: the next line whose stripped content begins with three or more `#`, as for every other fence; its tail is dropped the same way. Indentation is not compared. To place a literal `###` line inside the body, escape it (§8.3).
- `text` is the body lines joined with `\n`, with no trailing `\n`. An empty body gives `text: ""`.
- Content is **opaque** — captured verbatim with no inline or block parsing.
- A standalone `## comment` line directly after the closer is an orphan: it becomes a `SegmentReflection` of its own (§2.2).
- Legal at Page scope AND inside `ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`. Wherever it stands, its entry goes to the Page, and `before` records its place (§2.3).
- Block parsing around it is unchanged; only its output moves out of `children`.
- Unclosed fence: content runs to end of document → warning CDN-0006. Same rule as `CodeBlock` (§4.4), `Meta` (§4.3), `MathBlock` (§4.5): opaque content has no parseable structure, so the enclosing container's boundary is not observable from inside the fence. An unclosed `###` opened inside a container therefore absorbs every following line, including content past the container.
- A CommentBlock takes no part in pagination (§9.3.2): only a `Meta` and a PageBreaker create Page boundaries.
- Default render policy is **hidden** (§2.5, §18.4).
- **Closer escape:** `\#` inside the body emits a literal `#` (consumes the `\`). A line `\###`, `#\##`, or `##\#` therefore does NOT close the fence. The rule does not look at run length — any `\#` escapes. All other `\X` sequences are literal. See §8.3. Opener escape: see §8.2.

**Example:**

```
Input:
  intro paragraph

  ###
  draft note — revise before publish
  ###

  next paragraph

AST:
  Page {
    reflections: [{ text: "draft note — revise before publish", before: [1] }]
    children: [
      Paragraph([Text("intro paragraph")])
      Paragraph([Text("next paragraph")])
    ]
  }
```

---

### 4.17 InjectBlock

**Syntax:**

```
/chapters/intro.cutdown {attrs}
/chapters/
```

A `FileBlock`-shaped line (a line at block level beginning with `/`) is an `InjectBlock` when the normalized `path` of its locator (§9.2.4) ends with `.cutdown` or with `/`.

**AST type:**

```typescript
interface InjectBlock {
  _type: "InjectBlock"
  raw: string                       // the path as written (§9.2)
  src: PathResourceLocator | null   // null when the path is invalid
  children: Block[]
  attributes: Attribute[]
  reflections: LineReflection[]
}
```

- `src` is parsed exactly as for `FileBlock` (§4.11, §9.2). The test looks at `src.path`, so a query or fragment does not hide it: `/card.cutdown?name=Ann` and `/intro.cutdown#setup` are `InjectBlock`s. The suffix `.cutdown` is matched case-sensitively.
- The test runs on the normalized path before validity is checked: a trailing `/`, invalid in any other path, is what makes `/chapters/` a folder injection (§9.2.5), and `/chapters/.` is one too. An `InjectBlock` whose path is invalid for another reason keeps its type, with `src: null`: `/../x.cutdown`.
- A path that normalizes to `/` is never an injection: `/`, `/#`, `/?a=1`, `/./`, and `/a/..` are `FileBlock`s (§4.11), not an injection of the root folder.
- When the path ends with `.cutdown`, the `fragment` names an id and is converted to NFC, as in a page link (§5.5).
- The parser always emits `children: []`. Cutdown's parser does no I/O; a consumer that resolves the injection fills `children` as §17 defines. An `InjectBlock` that no consumer resolves stays in the AST unchanged.
- `children` is a block scope (§1.5), and Sections never cross its edge (§17).
- An `InjectBlock` never joins a `FileGroup`, and an `InjectBlock` line ends an open `FileGroup`.
- `InjectBlock` is not captionable: a `^ ` line after it is orphaned (§6.2).
- Legal wherever a `FileBlock` is: at Page scope and inside every block container.
- **Opener escape:** `\/path` at line start → `Paragraph([Text("/path")])`, as for `FileBlock`. See §8.2.

**Example:**

```
Input:
  == Setup
  /parts/install.cutdown?arch=arm64#linux

AST:
  Section { level: 2, heading: [Text("Setup")], children: [
    InjectBlock { raw: "/parts/install.cutdown?arch=arm64#linux", src: { path: "/parts/install.cutdown", query: [{ key: "arch", value: "arm64" }], fragment: "linux" }, children: [] }
  ] }
```

---
