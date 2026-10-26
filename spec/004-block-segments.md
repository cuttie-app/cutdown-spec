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
  reflection: Reflection[]
}
```

- All lines are **parsed by inline rules** and concatenated. Result is `Inline[]`.
- A single newline between lines is a **soft break** — folded to zero; lines concatenate directly with no character emitted.
- Trailing spaces before the newline collapse to a single space, preserved as `Text(" ")` (explicit word boundary). At a block boundary the space is dropped. See §12.
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

A heading creates a `Section` segment. Consumers receive `Section` segments — there is no bare `Heading` node in the AST. A `Section`'s extent is not parsed; it is derived by the sectionization fold defined in §9.5.1.

**AST type:**

```typescript
interface Section {
  _type: "Section"
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  heading: Inline[]
  children: Block[]
  attributes: Attribute[]
  reflection: Reflection[]
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

- Heading content is **parsed by inline rules**. Result is `Inline[]`.
- The content continues over following lines under the paragraph continuation rules (§4.1): the run ends at a blank line, an attribute line, a standalone `##` (§2.2), or a `^ ` caption line (§6.5). Soft breaks fold to zero, so `= Title` followed by `content` is one heading reading `Titlecontent` (§12.1).
- A heading MUST be preceded by a blank line (or be the first line of the document or block container).
- The **last `{...}` on the heading line** is claimed by the Section (Last-Attr Rule). Earlier `{...}` attach to preceding inline elements. An explicit empty `{}` as the last token means the Section carries no attributes.
- Sections nest by level. A level-2 heading inside a level-1 section creates a child section. A level-1 heading closes all open sections and opens a new one at the root.
- Sections may appear inside block containers (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`). The fold runs independently inside each container, so a `Section` never crosses a container boundary (§9.5.1).
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

**Syntax:** Fenced with exactly three tildes.

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

- Recognized formats: `yaml`, `toml`, `json` (case-insensitive). Default: `"yaml"`.
- Content is a raw string passed as-is to the consumer. Lines joined with `\n`; a single trailing `\n` is appended.
- Fills the current `Page.meta`; if that slot is already set, opens a new Page first (§9.5.2). Never appears in `Page.children`.
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

**Syntax:** Fenced with exactly three backticks.

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
  reflection: Reflection[]
}
```

- Language identifier uses `[ID_LITERAL]+`. If omitted (means equal empty string) should be made default to `"text"`.
- Content is **literal** — no inline parsing. Lines joined with `\n`; no trailing `\n` appended. Blank lines preserved verbatim.
- Fixed 3-backtick fence. Variable-length fences not supported. No nesting.
- Unclosed fence: content runs to end of document → warning CDN-0001.
- Legal inside `ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`. Container indentation is stripped from content lines.
- **Closer escape:** `` \` `` inside the body emits a literal `` ` `` (backtick) and consumes the `\`. A line `` \``` ``, `` `\`` ``, or `` ``\` `` therefore does NOT close the fence. All other `\X` sequences are literal (including `\\` → two chars). See §8.3. Opener escape: see §8.2.
- **Supports caption line (§6.2).** A `^ text` line immediately after the closing fence (no blank line) sets `caption: Inline[]` on this node.

---

### 4.5 MathBlock

**Syntax:** Fenced with exactly three dollar signs.

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
  reflection: Reflection[]
}
```

- Content is **literal** — no inline parsing. Passed as raw string to the consumer (KaTeX or equivalent).
- Lines joined with `\n`; no trailing `\n` appended. Blank lines preserved verbatim.
- Unclosed fence: content runs to end of document → warning CDN-0003.
- Legal inside block containers. Indentation handling follows the same rules as `CodeBlock`.
- **No closer escape — LaTeX owns `\`.** Every backslash inside a MathBlock body is literal, including `\$`. A literal `$$$` line inside the body therefore prematurely closes the fence; this is an accepted unsupported case (wrap such content in a `CodeBlock` or split the math). See §8.3. Opener escape (`\$$$`): see §8.2.
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
    attributes: [{ id: "eq1"}, {class: ["display"] }]
  }
```

---

### 4.6 QuoteBlock

**Syntax:** Lines prefixed with `>`.

```
> content
> more content
>> nested quote
```

**AST type:**

```typescript
interface QuoteBlock {
  _type: "QuoteBlock"
  children: Block[]
  attributes: Attribute[]
  caption: Inline[]
  reflection: Reflection[]
}
```

- The `>` (greater-than sign) prefix opens the quote. It is required on the quote's first line.
- **Lazy continuation.** A following line without `>` continues the quote. The line is handed to the quote's current child block and follows that block's own continuation rules — a `Paragraph` absorbs it as a continuation line (§4.1), a list item absorbs it per §10.5, a `Section` keeps it in the section body. This is the same continuation behaviour the line would have outside the quote.
- The quote ends at a blank line, at the end of the enclosing block container, or at the end of the document. A `>` line after a blank line opens a new `QuoteBlock`.
- The `>` prefix and one optional following space are stripped. Content is parsed as full block content.
- Nesting: `>>` = blockquote inside blockquote. Both `>>` and `> >` are valid. Depth = count of leading `>` characters. A lazy continuation line carries no `>`, so it does not change the current depth — it continues the innermost open quote.
- **Body edge-blank trim:** After `>` stripping, leading and trailing blank lines inside the quoted body are stripped before children are parsed. See §10.6.
- **Opener escape:** `\>` at line start → `Paragraph([Text("> ...")])`. See §8.2.
- **Supports caption line (§6.2).** A `^ text` line immediately after the closing line (no blank line) sets `caption: Inline[]` on this node.

**Examples:**

```
Input:
  > Line 1
  > Line 2
  > Line 3

AST:
    QuoteBlock
    └── Paragraph { children: [Text("Line 1Line 2Line 3")] }
```

```
Input:
  > Line 1
  >>> Line 2
  >> Line 3

AST:
    QuoteBlock
    ├── Paragraph { children: [Text("Line 1")] }
    └── QuoteBlock
        ├── QuoteBlock
        |   └──── Paragraph { children: [Text("Line 2")] }
        └── Paragraph { children: [Text("Line 3")] }
```

```
Input:
  > Line 1
  Line 2
  Line 3

  Line 4

AST:
    QuoteBlock
    └─── Paragraph { children: [Text("Line 1Line 2Line 3")] }
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
  reflection: Reflection[]
}
```

- Unordered marker: `-` (hyphen) followed by one space. Only `-` is supported.
- Ordered marker: `{number}.` followed by one space, where `{number}` is 1–5 ASCII digits. A run of six or more digits is not a marker, so the line is not a list item. The first item's number sets `List.start`; every other item's number is ignored.
- `kind` is determined by the **first item's marker**: `-` → `"bullet"`, `{n}.` → `"numbered"`, `- [ ]`/`- [x]`/`- [+]` → `"checklist"`.
- `start` is always present. It is `1` for `kind: "bullet"` and `"checklist"`. For `"numbered"` it is the first item's number, except that `0` is coerced to `1`, silently.
- **Tight vs loose:** A list is `loose: true` when a blank line appears between items within the list scope. `loose` is an advisory flag for consumers — the parser does not alter children based on it.
- A blank line followed by a col-0 marker ends the current list and starts a new `List` segment.
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
  children: (Block | Inline)[]
  attributes: Attribute[]
}
```

- Content on the marker line is **parsed by inline rules**. Continuation lines at the same or deeper indentation are absorbed.
- When a blank line is absorbed inside the list (loose list), content is block-promoted: `children` becomes `Block[]` (e.g. `Paragraph`).
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
  children: (Block | Inline)[]
  attributes: Attribute[]
}
```

- Marker: `- ` followed immediately by `[ ]` (unchecked) or `[x]`/`[X]`/`[+]` (checked), then one space and content. `[]` with no space is not a task marker — the item is an ordinary `ListItem` whose content begins `[]`. `[+]` is bidi-neutral; see §16 for which spelling a writer emits.
- Only `kind: "bullet"` list items may carry a checkbox. A `kind: "numbered"` list encountering a task marker closes and a new `kind: "checklist"` List segment opens.
- A `List` with `kind: "checklist"` has `children: TaskItem[]` exclusively; `kind: "bullet"` and `kind: "numbered"` have `children: ListItem[]` exclusively.
- Mix of item types introduces a new list boundary: the first item of the new type starts a new `List` segment.
- Follows the same multiline and block-promotion rules as `ListItem`.

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

A table opens with a line starting with `|` (pipe). Standard Markdown (GFM) pipe tables parse unchanged.

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
  reflection: Reflection[]
}

interface Row {
  _type: "Row" | "Header"
  children: Cell[]
  attributes: Attribute[]
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

A row whose every cell consists solely of an alignment pattern (see Column alignment below) — optionally surrounded by spaces — is a **header separator**. It marks the group of content rows immediately preceding it (since the previous separator row, or the start of the table) as `_type: "Header"`. All other content rows are `_type: "Row"`.

```
| A | B |
|---|---|    ← header separator → preceding rows become _type: "Header"
| C | D |    ← _type: "Row"
```

Discontiguous header sections are valid — HTML `<table>` supports mixed `<thead>`/`<tbody>` ordering. A header separator anywhere marks only the rows in the immediately preceding section.

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

A column with no corresponding position in the header separator, and every column of a table with no header separator, takes `"start"`.

`"start"` is not a synonym for `"left"`. `"start"` follows the text direction of the content — the left edge in a left-to-right script, the right edge in a right-to-left one. `:---` is an explicit request for the left edge in either. A consumer that renders to CSS maps `"start"` to `text-align: start` and `"left"` to `text-align: left`.

---

#### Table shape

**Leading `|` required.** Every content row and header separator opens with `|`. It is the detection anchor (§9.3 classifies a table by `^\|`); without it the line is a Paragraph.

**Trailing `|` optional.** The last `|` on a line is always the **closer**, never a cell separator. It closes the final cell rather than opening an empty one.

```
| A | B |      →  2 cells
| A | B        →  2 cells
| A | B | |    →  3 cells, the third empty, then the closer
```

The closer also determines how deep a trailing `{attrs}` chain reaches — see *Attrs scope chain* below and §6.

**Column count is fixed by the first content row.** Not `max()` across rows. A header separator is never a content row, so it never defines the count.

- A later row with **fewer** cells is padded with empty `Cell` nodes to the column count. No diagnostic — nothing is lost, this is normalisation. Padded cells carry no `loc` (§14).
- A later row with **more** cells has the surplus cells **dropped** and emits **CDN-0018**.
- A header separator **wider** than the column count likewise drops its surplus and emits **CDN-0018** — losing alignment silently is the failure the diagnostic exists to prevent.
- A header separator **narrower** than the column count is not an error; the uncovered columns take `"start"` per *Column alignment* above.
- A table whose only rows are header separators has `columns: []` and emits **no** diagnostic — with no content row, no column count was ever established for the separator to exceed. This is consistent with `|` alone yielding an empty table.

#### Row content

- Each `|` content line is one independent logical row.
- Cells contain `Inline[]` parsed by full inline rules.
- The table ends at the first line that is neither a content row nor a header separator — including a blank line, a container boundary, or any other block opener. That line is classified on its own (§9.3); a later `|` line opens a **new** table.

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

A single `|` line with no cell content is a valid empty table:

```
|            →  Table { rows: [], columns: [] }

| {.tbl}     →  Table { rows: [], columns: [], attributes: [{class:["tbl"]}] }
```

For `| {.tbl}`: no row is present, so `{.tbl}` has no Row slot to claim; it falls through to the Table slot directly.

---

#### Reflection

Trailing `## comment` on any table line (content row or header separator) bubbles to `Table.reflection` carrying the payload's `loc`. See §2.2. A `##` appearing inside cell content (before the row's closing `|`) causes the pre-`##` cell fragment to fail the row grammar and fall back to a Paragraph; the payload then attaches to that Paragraph's `reflection`.

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
  reflection: Reflection[]
}
```

- `url` runs from the `h` of `https://` to the end of the line, after removing one trailing attribute sequence (whitespace followed by one or more `{…}` groups that close the line) and then trailing whitespace. It is a raw string: Cutdown does not parse, validate, or fetch it. `{{key}}` interpolation tokens stay in it verbatim (§5.11).
- A `url` longer than 1024 Unicode scalar values does not open an `EmbedBlock`; the line is a `Paragraph`.
- What an embed shows is the consumer's decision — for example, resolving an oEmbed snippet at render time and placing it in the page.
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

A top-level line beginning exactly `---`. A PageBreaker is a pagination signal, not a block: it is consumed by the pagination fold (§9.5.2) and **produces no AST node**. It unconditionally closes the current Page — as a Ghost Page if empty — opens a new one, and closes all open root-level Sections.

- The rest of the line — surplus hyphens, `{attrs}`, any other content — is dropped, and CDN-0016 is emitted. There is no attributed form.
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
  src: PathResourceLocator
  attributes: Attribute[]
  caption: Inline[]
}
```

- `src` is a `PathResourceLocator` (§1.7). Its extent is the whole line from the leading `/`, after removing one trailing attribute sequence and then trailing whitespace (§1.7.1). Spaces inside the path are path content: `/My Docs/Q3 report.pdf` is one path.
- A line holding only `/` is a `FileBlock` whose `src.raw` is `"/"`. What it refers to is the consumer's decision.
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
  reflection: Reflection[]
}
```

- Every `FileBlock` is inside a `FileGroup`. A single `FileBlock` line forms a `FileGroup` with one child.
- A blank line ends the group. The next `FileBlock` line starts a new `FileGroup`.
- Any line that is not a `FileBlock` line also ends the group — an `EmbedBlock` or `InjectBlock` line included — except a caption line and a trailing `{attrs}` line, which emit no block (§6.2). A standalone `## comment` line acts as a blank line and ends the group (§2.2).
- A `## comment` on a `FileBlock` line goes to the `FileGroup`'s `reflection`, as a comment on a list item line goes to the `List` (§2.2). `FileBlock` has no `reflection` of its own.
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
  ├── FileBlock { src: { raw: "/photos/a.png", … }, caption: [Text("First")] }
  └── FileBlock { src: { raw: "/docs/report.pdf", … } }
  FileGroup
  └── FileBlock { src: { raw: "/photos/b.jpg", … } }
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
  children: Block[]
  attributes: Attribute[]
  caption: Inline[]
  reflection: Reflection[]
}
```

- Opening: `:::` followed immediately by a block name (`[ID_LITERAL]+`), then optional attributes.
- Closing: `:::` on its own line (no name).
- A `:::` opener not followed immediately by an `ID_LITERAL` character does NOT open a NamedBlock — classified as a Paragraph → warning CDN-0013. **Exception:** if the line begins with an escaped opener (`\:::`, `:\::`, `::\:`), no warning is emitted — the escape is a deliberate author signal. See §8.2.
- Content: any block content, including nested `:::` containers.
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

MUST start at the beginning of a line.

**AST type:**

```typescript
interface RefDefinition {
  _type: "RefDefinition"
  ref: string
  children: Inline[]
  attributes: Attribute[]
  reflection: Reflection[]
}
```

- `ref` uses `[ID_LITERAL]+` characters. Case-sensitive.
- Empty `ref` (line starting with `[^]:`) is invalid state and produces string literal for whole line.
- Empty content (`[^ref]:`) is valid and produces an empty `children` array.
- Content is **parsed by inline rules**. Result is `Inline[]`.
- Cutdown does not validate that every `[^ref]` link has a matching definition.
- When the same `ref` is defined more than once in a document, resolution uses the last definition in source order (**last wins**). Resolution is the consumer's responsibility (§9.4).

---

### 4.15 SpoilerBlock

**Syntax:** Fenced with exactly three carets.

```
^^^ {attrs}
  content
^^^
```

**AST type:**

```typescript
interface SpoilerBlock {
  _type: "SpoilerBlock"
  children: Block[]
  attributes: Attribute[]
  caption: Inline[]
  reflection: Reflection[]
}
```

- Opening: `^^^` at line start, optionally followed by `{attrs}`. The opening line carries no other content.
- Closing: `^^^` on its own line.
- Content is **parsed as blocks** — paragraphs, lists, images, and `:::` NamedBlocks are all permitted. The contrast is intentional, because a Spoiler hides *meaning*, not *structure*.
- **No nested SpoilerBlocks.** The first `^^^` line encountered inside an open SpoilerBlock always closes it. A second `^^^` opener on the next non-blank line starts a new sibling SpoilerBlock. Tiered reveals (a Spoiler inside a Spoiler) are out of scope; if a use case genuinely requires it, wrap the inner content in `:::spoiler` NamedBlock instead.
- Fixed 3-caret fence `^^^`. Variable-length fences not supported.
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

**Syntax:** Fenced with exactly three octothorpes. See §2.3 for the full normative semantics; this section restates the block-level surface.

```
###
opaque content
###
```

**AST type:**

```typescript
interface CommentBlock {
  _type: "CommentBlock"
  text: string
  reflection: Reflection[]
}
```

- Opening: a line whose stripped content begins `###`. **No** `[name]` and **no** `{attrs}` are recognized on the opener line. Any trailing characters on the opener line are part of the opener (ignored).
- Closing: the next line whose stripped content is exactly `###`, as for every other fence. Indentation is not compared. To place a literal `###` line inside the body, escape it (§8.3).
- Content is **opaque** — captured verbatim with no inline or block parsing. Lines joined with `\n`; a single trailing `\n` is appended.
- Legal at Page scope AND inside `ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`.
- Unclosed fence: content runs to end of document → warning CDN-0006. Same rule as `CodeBlock` (§4.4), `Meta` (§4.3), `MathBlock` (§4.5): opaque content has no parseable structure, so the enclosing container's boundary is not observable from inside the fence. An unclosed `###` opened inside a container therefore absorbs every following line, including content past the container.
- `CommentBlock` takes no part in pagination (§9.5.2): only a `Meta` and a PageBreaker create Page boundaries.
- Default render policy is **hidden**: conforming renderers SHOULD omit it. See §2.5.
- No `attributes` field.
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
  Paragraph([Text("intro paragraph")])
  CommentBlock { text: "draft note — revise before publish\n" }
  Paragraph([Text("next paragraph")])
```

---

### 4.17 InjectBlock

**Syntax:**

```
/chapters/intro.cutdown {attrs}
/chapters/
```

A `FileBlock`-shaped line (a line at block level beginning with `/`) is an `InjectBlock` when the `path` of its locator ends with `.cutdown` or with `/`.

**AST type:**

```typescript
interface InjectBlock {
  _type: "InjectBlock"
  src: PathResourceLocator
  children: Block[]
  attributes: Attribute[]
  reflection: Reflection[]
}
```

- `src` is parsed exactly as for `FileBlock` (§4.11, §1.7). The test looks at `src.path`, so a query or fragment does not hide it: `/card.cutdown?name=Ann` and `/intro.cutdown#setup` are `InjectBlock`s. The suffix `.cutdown` is matched case-sensitively.
- The test runs on the decomposed path before validity is checked: a trailing `/`, invalid in any other path, is what makes `/chapters/` a folder injection (§1.7.5).
- A line holding only `/` is a `FileBlock`, not an injection of the root folder.
- The parser always emits `children: []`. Cutdown's parser does no I/O; a consumer that resolves the injection fills `children` as §17 defines. An `InjectBlock` that no consumer resolves stays in the AST unchanged.
- `children` is a block scope (§1.6), and Sections never cross its edge (§17).
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
    InjectBlock { src: { raw: "/parts/install.cutdown?arch=arm64#linux", path: "/parts/install.cutdown", query: [{ key: "arch", value: "arm64" }], fragment: "linux" }, children: [] }
  ] }
```

---
