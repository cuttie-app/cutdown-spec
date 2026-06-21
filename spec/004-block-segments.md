## 4. Block Segments

---

### 4.1 Paragraph

**Syntax:** Any non-blank lines that do not match another block construct.

A contiguous run of non-blank lines not matched by any other block type. Once a paragraph begins, no block element can interrupt it — it continues until a blank line.

**AST type:**

```typescript
interface Paragraph {
  type: "Paragraph"
  children: Inline[]
  attributes: Attribute[]
}
```

- All lines are **parsed by inline rules** and concatenated. Result is `Inline[]`.
- A single newline between lines is a **soft break** — folded to zero; lines concatenate directly with no character emitted.
- A single trailing space before the newline is preserved as `Text(" ")` (explicit word boundary).
- `\` at line end produces a `TextBreak` segment (explicit line break).

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

**Syntax:** `={n} inline-content {attrs}`

A heading creates a `Section` segment. Consumers receive `Section` segments — there is no bare `Heading` node in the AST. A section contains all subsequent blocks until a heading of equal or lesser level, end of the current block container, or end of document.

**AST type:**

```typescript
interface Section {
  type: "Section"
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  heading: Inline[]
  children: Block[]
  attributes: Attribute[]
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
- Sections may appear inside block containers (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`). Scoping follows the same level logic but is **bounded by the container** — never crosses container boundaries.
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
- Always fills `Page.meta`. If `Page.meta` is already set, opens a new Page first. Never appears in `Page.children`.
- Only valid at Page scope. Inside block containers, the entire span is emitted as a `Paragraph` → warning CDN-0030.
- Unclosed fence → warning CDN-0002.
- No `attributes` field.
- **Closer escape:** `\~` inside the body emits a literal `~` (consumes the `\`). A line `\~~~`, `~\~~`, or `~~\~` therefore does NOT close the fence. All other `\X` sequences are literal. See §8.3. Opener escape: see §8.2.

**Example:**

```
~~~yaml
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
}
```

- Language identifier uses `[ID_LITERAL]+`. If omitted (means equal empty string) should be made default to `"text"`.
- Content is **literal** — no inline parsing. Lines joined with `\n`; no trailing `\n` appended. Blank lines preserved verbatim.
- Fixed 3-backtick fence. Variable-length fences not supported. No nesting.
- Unclosed fence: content runs to end of document → warning CDN-0001.
- Legal inside `ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`. Container indentation is stripped from content lines.
- **Closer escape:** `` \` `` inside the body emits a literal `` ` `` (consumes the `\`). A line `` \``` ``, `` `\`` ``, or `` ``\` `` therefore does NOT close the fence. All other `\X` sequences are literal (including `\\` → two chars). See §8.3. Opener escape: see §8.2.

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
}
```

- Content is **literal** — no inline parsing. Passed as raw string to the consumer (KaTeX or equivalent).
- Lines joined with `\n`; no trailing `\n` appended. Blank lines preserved verbatim.
- Unclosed fence: content runs to end of document → warning CDN-0003.
- Legal inside block containers. Indentation handling follows the same rules as `CodeBlock`.
- **No closer escape — LaTeX owns `\`.** Every backslash inside a MathBlock body is literal, including `\$`. A literal `$$$` line inside the body therefore prematurely closes the fence; this is an accepted unsupported case (wrap such content in a `CodeBlock` or split the math). See §8.3. Opener escape (`\$$$`): see §8.2.

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
}
```

- Every line MUST begin with `>`. No lazy continuation — a line without `>` ends the quote.
- In same time QuoteBlock supports trailing lines without `>` in same way as Paragraph.
- The `>` prefix and one optional following space are stripped. Content is parsed as full block content.
- Nesting: `>>` = blockquote inside blockquote. Both `>>` and `> >` are valid. Depth = count of leading `>` characters.
- **Body edge-blank trim:** After `>` stripping, leading and trailing blank lines inside the quoted body are stripped before children are parsed. See §10.6.
- **Opener escape:** `\>` at line start → `Paragraph([Text("> ...")])`. See §8.2.

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
}
```

- Unordered marker: `-` followed by one space. Only `-` is supported.
- Ordered marker: `{number}.` followed by one space. Only `.` delimiter; `)` is not supported. Actual numbers are ignored except for `start`.
- `kind` is determined by the **first item's marker**: `-` → `"bullet"`, `{n}.` → `"numbered"`, `- [ ]`/`- [x]` → `"checklist"`.
- `start` is non-null only for `kind: "numbered"`.
- **Tight vs loose:** A list is `loose: true` when a blank line appears between items within the list scope. `loose` is an advisory flag for consumers — the parser does not alter children based on it.
- A blank line followed by a col-0 marker ends the current list and starts a new `List` segment.
- **Opener escape:** `\-` at line start → `Paragraph([Text("- ...")])`. See §8.2.

---

#### 4.7.1 ListItem

**Syntax:** A list marker followed by content, with optional indented continuation lines.

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

**Syntax:** `- [ ] content` or `- [x] content`

**AST type:**

```typescript
interface TaskItem {
  type: "TaskItem"
  checked: boolean
  children: (Block | Inline)[]
  attributes: Attribute[]
}
```

- Marker: `- ` followed immediately by `[]`/`[ ]`  (unchecked) or `[x]`/`[X]` (checked), then one space and content.
- Only `kind: "bullet"` list items may carry a checkbox. A `kind: "numbered"` list encountering a task marker closes and a new `kind: "checklist"` List segment opens.
- A `List` with `kind: "checklist"` has `children: TaskItem[]` exclusively; `kind: "bullet"` and `kind: "numbered"` have `children: ListItem[]` exclusively.
- Mix of item types introduces a new list boundary: the first item of the new type starts a new `List` segment.
- Follows the same multiline and block-promotion rules as `ListItem`.

**Example:**

```
Input:
  - [ ] Buy milk
  - [x] Write spec
  - plain item

AST:
  List { kind: "checklist", loose: false }
  ├── TaskItem { checked: false, children: [Text("Buy milk")] }
  └── TaskItem { checked: true,  children: [Text("Write spec")] }
  List { kind: "bullet", loose: false }
  └── ListItem { children: [Text("plain item")] }
```

---

### 4.8 Table

**Syntax:** `| ... |` — leading and trailing `|` required on every row.

Two variants distinguished by the presence of a delimiter row:

```
| Cell A | Cell B |           ← simple table (no header)

| Name   | Score |            ← GFM table
|:-------|------:|
| Alice  |    42 |
```

**AST type:**

```typescript
interface Table {
  type: "Table"
  kind: "simple" | "gfm"
  head: Row[]   // [] for simple tables
  body: Row[]
  columns: Column[]
  attributes: Attribute[]
}

interface Row {
  type: "Row"
  children: Cell[]
  comments: CommentInline[]   // trailing comments from this row's own line and from a following delimiter row
  attributes: Attribute[]
}

interface Cell {
  type: "Cell"
  children: Inline[]
  row: number     // zero-indexed
  column: number  // zero-indexed
}

interface Column {
  type: "Column"
  align: "left" | "right" | "center" | "comma" | "decimal"  // default: "left"
}
```

- `Cell` content is **parsed by inline rules**. Result is `Inline[]`.
- `Cell` and `Column` do not carry `attributes`.
- Colspan and rowspan are not supported.
- Delimiter row alignment: `:---` left, `---:` right, `:---:` center, `---,` comma, `---.` decimal.
- `Row` and `Table` attributes follow the scope-chain rule (§6): last `{}` → `Table`; preceding `{}` → `Row`. The `Table` slot is only available from the **last row's** chain.

**Trailing comments on table rows.** A `## comment` appearing on a row line after the row's content (and after any trailing `{attrs}`) is detected by Phase 2 (§9.2) and attached to that Row's `comments` array, NOT to any cell. The row's `comments` array preserves source order:

- index 0 — the row's own-line trailing comment (if any).
- index 1+ — comments from following delimiter rows (see below).

A `##` appearing inside the cell content portion of the line (before the row's closing `|`) makes the pre-`##` substring fail the row grammar (no closing `|` after the partial cell). The block candidate falls back to Paragraph, and the CommentInline is appended to the Paragraph's children. See §2.2 for examples.

**Attributes on the delimiter row are not supported.** `{attrs}` after the alignment markers on a delimiter row are dropped → warning CDN-0007. The delimiter row is structural metadata (alignment only) and has no AST shape to carry attributes.

**Trailing comments on the delimiter row** ARE supported. A `## comment` on the delimiter row is attached to the preceding header Row's `comments` array, appended after the header row's own-line trailing comment (if any).

**Row/Table attribute examples:**

```
| td1 | td2 | {.a}{.b}  →  Table({.b}, Row({.a}, ...))

| td1 | td2 | {.a}      →  Table({.a}, Row(...))         ← single {} = Table slot

Mid-table row:
| td1 | td2 | {.a}      →  Row({.a}, ...)                ← 1 slot only
```

---

### 4.9 ImageBlock

**Syntax:** `![alt text](src) {attrs}`

A line at block level beginning with `![` is classified as an `ImageBlock`.

**AST type:**

```typescript
interface ImageBlock {
  type: "ImageBlock"
  alt: Inline[]
  src: string
  attributes: Attribute[]
}
```

- See §5.9 for `ImageInline` syntax and parsing details. The same rules apply to `ImageBlock` alt text and src.
- Consecutive `ImageBlock` lines with no blank line between them are wrapped in a `FileRefGroup { group: "image" }`.
- `ImageBlock` is the block-level counterpart of `ImageInline` (§5). The difference is that `ImageBlock` must be the only one segment on the line.

---

### 4.10 ThematicBreak

**Syntax:** `--- {attrs}`

Three or more consecutive `-` at line start. Any characters between the dashes and the optional `{attrs}` are silently dropped.

**AST type:**

```typescript
interface ThematicBreak {
  type: "ThematicBreak"
  attributes: Attribute[]
}
```

- At **Page scope**: creates a page break — a new `Page` segment is opened and the `ThematicBreak` segment becomes its first child.
- Inside a **Block container** (`List`, `QuoteBlock`, `NamedBlock`): emits a `ThematicBreak` segment but does **not** create a new Page.
- **Opener escape:** `\---`, `-\--`, or `--\-` at line start → `Paragraph([Text("---")])`. The page-break side effect at Page scope is suppressed along with the break. See §8.2.

**Examples:**

```
---              → ThematicBreak {}
--- {.page-end}  → ThematicBreak { attributes: { class: ["page-end"] } }
--- some text    → ThematicBreak {}  (text dropped)
```

---

### 4.11 FileRef

**Syntax:** `/path {attrs}`

Any line beginning with `/` is a file reference block.

**AST type:**

```typescript
interface FileRef {
  type: "FileRef"
  path: string
  fragment: string | ''
  query: string | ''
  attributes: Attribute[]
}
```

- `path` starts with `/` and uses wide range of characters, except `<` `>` `:` `"` `\` `|` `*` `{` `}` and whitespace. The first space (if any) separates the path from `{attrs}`.
- Fragment (`#`): everything from the first `#` to the next space (or end of line, before `{attrs}`) is extracted as `fragment`. `src` stores the portion before `#`.
- Query (`?`): if path contains `?`, the parser extracts the query string as `query`. `src` stores the portion before `?`.
- `fragment` and `query` are mutually independent — either, both, or neither may be present. If absent, they are set to empty string `''` (not null).
- Empty path (line with only `/`) is invalid state and produces string literal for whole line.
- `group` is set automatically by file extension (see Known Groups below). Consumers may configure the extension lists.
- **Opener escape:** `\/path` at line start → `Paragraph([Text("/path")])`. See §8.2.

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
}
```

- A blank line breaks any active group.
- Different groups do not merge — two consecutive lines of different groups produce two separate `FileRefGroup` segments.
- Unknown-extension files are never grouped.

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
}
```

- Opening: `:::` followed immediately by a block name (`[ID_LITERAL]+`), then optional attributes.
- Closing: `:::` on its own line (no name).
- A `:::` opener not followed immediately by an `ID_LITERAL` character does NOT open a NamedBlock — classified as a Paragraph → warning CDN-0013. **Exception:** if the line begins with an escaped opener (`\:::`, `:\::`, `::\:`), no warning is emitted — the escape is a deliberate author signal. See §8.2.
- Content: any block content, including nested `:::` containers.
- Unclosed container: content runs to end of document → warning CDN-0004.
- **Indentation collapsing:** The first content line establishes the base indentation. That many leading spaces are stripped from all content lines before parsing.
- **Body edge-blank trim:** Leading and trailing blank lines inside the body are stripped before children are parsed. See §10.6.

**Example:**

```
:::callout {.warning}
  > quoted text
:::
→ NamedBlock { name: "callout", children: [QuoteBlock([Text("quoted text")])], attributes: {class:["warning"]} }
```

---

### 4.14 RefDefinition

**Syntax:** `[^ref]: inline content`

MUST start at the beginning of a line.

**AST type:**

```typescript
interface RefDefinition {
  type: "RefDefinition"
  ref: string
  children: Inline[]
  attributes: Attribute[]
}
```

- `ref` uses `[ID_LITERAL]+` characters. Case-sensitive.
- Empty `ref` (line starting with `[^]:`) is invalid state and produces string literal for whole line.
- Empty content (`[^ref]:`) is valid and produces an empty `children` array.
- Content is **parsed by inline rules**. Result is `Inline[]`.
- Cutdown does not validate that every `[^ref]` link has a matching definition.

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
}
```

- Opening: `^^^` at line start, optionally followed by `{attrs}`. The opening line carries no other content.
- Closing: `^^^` on its own line.
- Content is **parsed as blocks** — paragraphs, lists, images, and `:::` NamedBlocks are all permitted. This is the **only** XXX-fence in Cutdown whose body is parsed (code/meta/math fences hold literal content); the contrast is intentional, because a Spoiler hides *meaning*, not *structure*.
- **No nested SpoilerBlocks.** The first `^^^` line encountered inside an open SpoilerBlock always closes it. A second `^^^` opener on the next non-blank line starts a new sibling SpoilerBlock. Tiered reveals (a Spoiler inside a Spoiler) are out of scope; if a use case genuinely requires it, wrap the inner content in `:::spoiler` NamedBlock instead.
- Fixed 3-caret fence. Variable-length fences not supported.
- **Indentation collapsing:** the first content line establishes the base indentation; that many leading spaces are stripped from all content lines before parsing — same rule as `NamedBlock` (§4.13).
- **Body edge-blank trim:** Leading and trailing blank lines inside the body are stripped before children are parsed. See §10.6.
- Unclosed fence: content runs to end of document (or end of the parent block container) → warning CDN-0005.
- Legal inside `ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, and other `SpoilerBlock`s. Container indentation is stripped from content lines.
- Semantic variants (NSFW, redacted, entertainment-spoiler) are carried in `attributes`; `SpoilerBlock` has no `kind` field.
- **Escape:** SpoilerBlock body is **not opaque** — children are parsed as blocks. Use §8.2 block-opener escape (`\^^^`, `^\^^`, `^^\^`) on a content line to prevent it from closing the fence.

**Example:**

```
Input:
  ^^^ {.nsfw}
  Plot twist: **the butler** did it.

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
}
```

- Opening: bare `###` at the container's effective column. **No** `[name]` and **no** `{attrs}` are recognized on the opener line. Any trailing characters on the opener line are part of the opener (ignored).
- Closing: a line whose stripped content is exactly `###` at the same column as the opener.
- Content is **opaque** — captured verbatim with no inline or block parsing. Lines joined with `\n`; a single trailing `\n` is appended.
- Legal at Page scope AND inside `ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`.
- Unclosed fence: content runs to end of document → warning CDN-0006. Same rule as `CodeBlock` (§4.4), `Meta` (§4.3), `MathBlock` (§4.5): opaque content has no parseable structure, so the enclosing container's boundary is not observable from inside the fence. An unclosed `###` opened inside a container therefore absorbs every following line, including content past the container.
- `CommentBlock` is a pass-through node for Page Assembly (§9.6). It never splits Pages, and never consumes a Meta slot.
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
