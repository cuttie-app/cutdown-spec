## 4. Block Segments

### 4.1 Paragraph

**Syntax:** Any non-blank lines that do not match another block construct.

```
First paragraph line 1

Second paragraph line 1.
Second paragraph line 2.
```

A contiguous run of non-blank lines not matched by any other block type.

**Nothing interrupts a paragraph.** Once a run has been classified as a `Paragraph`, it continues to the next blank line (or the end of the enclosing container, or end of input). Every later line in the run is paragraph content regardless of how it begins — a heading marker, a list marker, a `---` separator, a table row, and every fence opener (`` ``` ``, `~~~`, `$$$`, `^^^`, `:::`, `###`) alike. There is no exception and no diagnostic: to open a block, put a blank line before it.

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
  type: "Paragraph"
  children: Inline[]
  attributes: Attribute[]
  reflection: Reflection[] | null
}
```

- All lines are **parsed by inline rules** and concatenated. Result is `Inline[]`.
- A single newline between lines is a **soft break** — folded to zero; lines concatenate directly with no character emitted.
- Trailing spaces before the newline collapse to a single space, preserved as `Text(" ")` (explicit word boundary). At a block boundary the space is dropped. See §12.
- A `\` (backslash) at line end produces a `TextBreak` segment (explicit line break).

**Example:**

```
Input:
  First line
  second line\
  third line

AST:
  Paragraph
  ├── Text("First linesecond line")
  ├── TextBreak
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
  type: "Section"
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  heading: Inline[]
  children: Block[]
  attributes: Attribute[]
  reflection: Reflection[] | null
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
- A heading MUST be preceded by a blank line (or be the first line of the document or block container).
- The **last `{...}` on the heading line** is claimed by the Section (Last-Attr Rule). Earlier `{...}` attach to preceding inline elements. An explicit empty `{}` as the last token means the Section carries no attributes.
- Sections nest by level. A level-2 heading inside a level-1 section creates a child section. A level-1 heading closes all open sections and opens a new one at the root.
- Sections may appear inside block containers (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`). The fold runs independently inside each container, so a `Section` never crosses a container boundary (§9.5.1).
- **Opener escape:** `\=` at line start suppresses heading formation at **any** level — `\=`, `\==`, `\===` ... all become `Paragraph([Text("= ...")])`. See §8.2.

**Examples:**

```
= H1 [with link](..){.class}
→ Section { level: 1, heading: [Text("H1 "), Link(...)], attributes: { class: ["class"] } }

= H1 [with link](..){.class}{}
→ {} is last token → Section carries no attributes; {.class} attaches to Link
→ Section { level: 1, heading: [Text("H1 "), Link(..., {class:"class"})], attributes: {} }
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
  type: "Meta"
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
  type: "CodeBlock"
  language: string  // default: "text"
  raw: string
  attributes: Attribute[]
  caption: Inline[] | null
  reflection: Reflection[] | null
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
  type: "MathBlock"
  raw: string
  attributes: Attribute[]
  caption: Inline[] | null
  reflection: Reflection[] | null
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
  type: "QuoteBlock"
  children: Block[]
  attributes: Attribute[]
  caption: Inline[] | null
  reflection: Reflection[] | null
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
    └── Paragraph { children: [Text("Line 1 Line 2 Line 3")] }
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
    └─── Paragraph { children: [Text("Line 1 Line 2 Line 3")] }
    Paragraph { children: [Text("Line 4")] }
```

```
Input:
  > - item one
  still item one

AST:
    QuoteBlock
    └─── List { kind: "bullet", loose: false }
         └── ListItem { children: [Text("item one still item one")] }
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
  type: "List"
  kind: "bullet" | "numbered" | "checklist"
  start: number | null  // first item number for kind: "numbered"; null otherwise
  loose: boolean
  children: (ListItem | TaskItem)[]
  attributes: Attribute[]
  reflection: Reflection[] | null
}
```

- Unordered marker: `-` (hyphen) followed by one space. Only `-` is supported.
- Ordered marker: `{number}.` followed by one space. The first item's number sets `List.start`; every other item's number is ignored.
- `kind` is determined by the **first item's marker**: `-` → `"bullet"`, `{n}.` → `"numbered"`, `- [ ]`/`- [x]`/`- [+]` → `"checklist"`.
- `start` is non-null only for `kind: "numbered"`.
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
  type: "ListItem"
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
  type: "TaskItem"
  checked: boolean
  children: (Block | Inline)[]
  attributes: Attribute[]
}
```

- Marker: `- ` followed immediately by `[]`/`[ ]`  (unchecked) or `[x]`/`[X]`/`[+]` (checked), then one space and content. `[+]` is bidi-neutral and MAY be used in place of `[x]`/`[X]` where RTL content would otherwise reorder the Latin letter within the brackets.
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
  type: "Table"
  rows: Row[]
  columns: Column[]
  attributes: Attribute[]
  caption: Inline[] | null
  reflection: Reflection[] | null
}

interface Row {
  type: "Row" | "Header"
  children: Cell[]
  attributes: Attribute[]
}

interface Cell {
  type: "Cell"
  children: Inline[]
  row: number                    // zero-indexed position in Table.rows[]
  column: number                 // zero-indexed
}

interface Column {
  type: "Column"
  align: "left" | "right" | "center" | "comma" | "decimal"  // default: "left"
}
```

`Cell` and `Column` do not carry `attributes`. Colspan and rowspan are not supported.

---

#### Header rows

A row whose every cell consists solely of an alignment pattern (see Column alignment below) — optionally surrounded by spaces — is a **header separator**. It marks the group of content rows immediately preceding it (since the previous separator row, or the start of the table) as `type: "Header"`. All other content rows are `type: "Row"`.

```
| A | B |
|---|---|    ← header separator → preceding rows become type: "Header"
| C | D |    ← type: "Row"
```

Discontiguous header sections are valid — HTML `<table>` supports mixed `<thead>`/`<tbody>` ordering. A header separator anywhere marks only the rows in the immediately preceding section.

---

#### Column alignment

Alignment is taken from the cell patterns of the **first header separator** in the table. Subsequent header separators do not update alignment.

| Pattern | Alignment |
|---------|-----------|
| `:---` | `"left"` |
| `---:` | `"right"` |
| `:---:` | `"center"` |
| `---,` | `"comma"` |
| `---.` | `"decimal"` |
| `----` | `"left"` (default) |

Each pattern requires **at least three `-`** (with the optional alignment marks shown). The minimum is a deliberate guard: a content row of single-dash placeholder cells (`| - |`) remains content, not a header separator.

A column with no corresponding position in the header separator defaults to `"left"`.

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
- A header separator **narrower** than the column count is not an error; the uncovered columns default to `"left"` per *Column alignment* above.
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

### 4.9 ImageBlock

**Syntax:**

```
![alt text](src) {attrs}
```

A line at block level beginning with `![` is classified as an `ImageBlock`.

**AST type:**

```typescript
interface ImageBlock {
  type: "ImageBlock"
  alt: Inline[]
  src: string
  attributes: Attribute[]
  caption: Inline[] | null
  reflection: Reflection[] | null
}
```

- See §5.9 for `ImageInline` syntax and parsing details. The same rules apply to `ImageBlock` alt text and src.
- Consecutive `ImageBlock` lines with no blank line between them are wrapped in a `FileRefGroup { group: "image" }`.
- `ImageBlock` is the block-level counterpart of `ImageInline` (§5). The difference is that `ImageBlock` must be the only one segment on the line.
- **Only-segment fallback.** Phase 3 classification (§9.3) is provisional: it matches `^!\[`. If the line carries anything after the image, the only-segment requirement fails and the line falls back to a `Paragraph` containing an `ImageInline` followed by the remaining inline content. No content is dropped.

```
![a](b)                  → ImageBlock { alt: [Text("a")], src: "b" }
![a](b) trailing text    → Paragraph([ImageInline(...), Text(" trailing text")])
```

  **Cascade to watch.** `Paragraph` is not captionable (§6.2), so a `^ ` line after the fallback has no captionable predecessor and becomes a `Paragraph` itself plus CDN-0008. One stray word after an image therefore demotes both the image *and* its caption to prose, with only the diagnostic to show for it.
- **Supports caption line (§6.2).** A `^ text` line immediately after this line (no blank line) sets `caption: Inline[]` on this node. `ImageInline` does not support captions — it is not a block.

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

### 4.11 FileRef

**Syntax:**

```
/path/to.file {attrs}
```

Any line beginning with `/` is a file reference block.

**AST type:**

```typescript
interface FileRef {
  type: "FileRef"
  path: string
  fragment: string | ''
  query: string | ''
  attributes: Attribute[]
  caption: Inline[] | null
  reflection: Reflection[] | null
}
```

- `path` starts with `/` (slash) and is a run of `PATH_LITERAL` characters (§1.2) extended with any other character that is not one of `<` `>` `:` `"` `\` `|` `*` `{` `}` or whitespace. The first space, when present, separates the path from `{attrs}`.
- Fragment: everything from the first `#` (octothorpe) to the next space (or end of line, before `{attrs}`) is extracted as `fragment`. `src` stores the portion before `#`.
- Query (`?`): if path contains `?`, the parser extracts the query string as `query`. `src` stores the portion before `?`.
- `fragment` and `query` are mutually independent — either, both, or neither may be present. If absent, they are set to empty string `''` (not null).
- A line containing only `/` is not a `FileRef`. The whole line is emitted as a `Paragraph` of literal text.
- `group` is set automatically by file extension (see Known Groups below). Consumers may configure the extension lists.
- **Opener escape:** `\/path` at line start → `Paragraph([Text("/path")])`. See §8.2.
- **Supports caption line (§6.2).** A `^ text` line immediately after this line (no blank line) sets `caption: Inline[]` on this node. If the `FileRef` is part of an active `FileRefGroup`, the `^ ` line closes the group and binds to it instead (see §4.12).

**Known Groups (defaults):**

| Group   | Extensions |
|---------|-----------|
| `image` | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.svg` |
| `video` | `.mp4` `.avi` `.mov` |
| `audio` | `.mp3` `.wav` `.aac` `.ogg` |

---

### 4.12 FileRefGroup

Consecutive `FileRef` or `ImageBlock` lines of the **same known group** with no blank line between them are automatically wrapped in a `FileRefGroup`. Not produced by explicit syntax — assembled during parsing.

**AST type:**

```typescript
interface FileRefGroup {
  type: "FileRefGroup"
  group: "image" | "video" | "audio"
  children: (FileRef | ImageBlock)[]
  attributes: Attribute[]
  caption: Inline[] | null
  reflection: Reflection[] | null
}
```

- A blank line breaks any active group.
- Different groups do not merge — two consecutive lines of different groups produce two separate `FileRefGroup` segments.
- Unknown-extension files are never grouped.
- **Supports caption line (§6.2).** A `^ text` line immediately after the last member of the group (no blank line) sets `caption: Inline[]` on the `FileRefGroup`. A `^ ` line mid-run closes the group at that point; the next `FileRef`/`ImageBlock` starts a new group.

**Example:**

```
Input:
  /photos/a.png
  /photos/b.jpg
  /docs/report.pdf

AST:
  FileRefGroup { group: "image" }
  ├── FileRef { src: "/photos/a.png", group: "image" }
  └── FileRef { src: "/photos/b.jpg", group: "image" }
  FileRef { src: "/docs/report.pdf", group: null }
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
  type: "NamedBlock"
  name: string
  children: Block[]
  attributes: Attribute[]
  caption: Inline[] | null
  reflection: Reflection[] | null
}
```

- Opening: `:::` followed immediately by a block name (`[ID_LITERAL]+`), then optional attributes.
- Closing: `:::` on its own line (no name).
- A `:::` opener not followed immediately by an `ID_LITERAL` character does NOT open a NamedBlock — classified as a Paragraph → warning CDN-0013. **Exception:** if the line begins with an escaped opener (`\:::`, `:\::`, `::\:`), no warning is emitted — the escape is a deliberate author signal. See §8.2.
- Content: any block content, including nested `:::` containers.
- Unclosed container: content runs to end of document → warning CDN-0004.
- **Indentation collapsing:** The first content line establishes the base indentation. That many leading spaces are stripped from all content lines before parsing.
- **Body edge-blank trim:** Leading and trailing blank lines inside the body are stripped before children are parsed. See §10.6.
- **Supports caption line (§6.2).** A `^ text` line immediately after the closing `:::` (no blank line) sets `caption: Inline[]` on this node.

**Example:**

```
:::callout {.warning}
  > quoted text
:::
→ NamedBlock { name: "callout", children: [QuoteBlock([Text("quoted text")])], attributes: {class:["warning"]} }
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
  type: "RefDefinition"
  ref: string
  children: Inline[]
  attributes: Attribute[]
  reflection: Reflection[] | null
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
  type: "SpoilerBlock"
  children: Block[]
  attributes: Attribute[]
  caption: Inline[] | null
  reflection: Reflection[] | null
}
```

- Opening: `^^^` at line start, optionally followed by `{attrs}`. The opening line carries no other content.
- Closing: `^^^` on its own line.
- Content is **parsed as blocks** — paragraphs, lists, images, and `:::` NamedBlocks are all permitted. The contrast is intentional, because a Spoiler hides *meaning*, not *structure*.
- **No nested SpoilerBlocks.** The first `^^^` line encountered inside an open SpoilerBlock always closes it. A second `^^^` opener on the next non-blank line starts a new sibling SpoilerBlock. Tiered reveals (a Spoiler inside a Spoiler) are out of scope; if a use case genuinely requires it, wrap the inner content in `:::spoiler` NamedBlock instead.
- Fixed 3-caret fence `^^^`. Variable-length fences not supported.
- **Indentation collapsing:** the first content line establishes the base indentation; that many leading spaces are stripped from all content lines before parsing — same rule as `NamedBlock` (§4.13).
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
    attributes: { class: ["nsfw"] },
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
  type: "CommentBlock"
  text: string
  reflection: Reflection[] | null
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
