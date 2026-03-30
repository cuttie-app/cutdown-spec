## 9. Block Elements

### 9.1 Headings

**Syntax:** `={n} TEXT`

- `n` equal signs (`=`), where `n` is in range `[1..9]`
- Followed by exactly one space
- Followed by inline content

```
Regex: ^(={1,9}) (.+)$
```

| Syntax | Level |
|--------|-------|
| `= Heading` | 1 |
| `== Heading` | 2 |
| `=== Heading` | 3 |
| `==== Heading` | 4 |
| `===== Heading` | 5 |
| `====== Heading` | 6 |
| `======= Heading` | 7 |
| `======== Heading` | 8 |
| `========= Heading` | 9 |

A heading MUST be preceded by a blank line (or be the first non-comment line of the document).

Heading text is parsed as **full inline content** — all inline formatting (emphasis, links, inline code, math, etc.) is valid inside a heading.

#### Heading Attributes — Last-Attr Rule

The **last** `{...}` token on the heading line is claimed by the heading itself. All earlier `{...}` tokens follow normal inline attachment rules (§5.2) and attach to their preceding inline element.

An explicit empty `{}` as the last token means the heading carries no attributes, while allowing earlier `{...}` to attach to inline elements.

```
= H1 [with link](..){.class}
```
→ `{.class}` is the last token → claimed by heading.
→ AST: `Section(level=1, {class:"class"}, [Text("H1 "), Link(children=[Text("with link")], href="..")])`

```
= H1 [with link](..){.class}{}
```
→ `{}` is the last token → heading has no attributes.
→ `{.class}` attaches to preceding inline element (the link).
→ AST: `Section(level=1, {}, [Text("H1 "), Link(children=[Text("with link")], href="..", {class:"class"})])`

This rule applies only to lines that open a block construct (headings, named blocks). In paragraph context all `{...}` follow inline attachment rules exclusively.

AST: `Heading { level: 2, content: Inline[], attributes: Attributes }`

The heading node is consumed into its enclosing `Section` node. Consumers receive `Section`, not bare `Heading` nodes.

---

### 9.2 Paragraphs

A paragraph is a contiguous sequence of non-blank lines that do not match any other block construct. Once a paragraph has begun, no block element can interrupt it — the paragraph continues until a blank line is encountered (see §8.1).

Inline content of all lines is parsed and concatenated. A single newline between lines is treated as a soft break — it becomes a space in the AST (no node emitted).

A text break is produced by placing `\` at the end of a line (see §10.6).

```
Input:
  First line
  second line\
  third line

AST:
  Paragraph
  ├── Text("First line second line")
  ├── TextBreak
  └── Text("third line")
```

---

### 9.3 Thematic Break

**Syntax:** `---` or more dashes (3 or more consecutive `-` at line start). Any characters between the dashes and the optional `{attrs}` are silently dropped.

- `---` always produces a `ThematicBreak` node — there is no position restriction.
- `ThematicBreak` creates a **page break**: a new Page is opened and the `ThematicBreak` node becomes the first child of that new Page.
- May carry attributes for consumer use (e.g., styled dividers).

```
AST: ThematicBreak { attributes: Attributes }
```

**Examples:**

```
---                  → ThematicBreak { attributes: {} }
--- {.page-end}      → ThematicBreak { attributes: { class: ["page-end"] } }
--- some text {.x}   → ThematicBreak { attributes: { class: ["x"] } }  (text dropped)
```

---

### 9.4 Code Block

**Syntax:** Fenced with exactly three backticks.

````
```language {attrs}
content
```
````

- Opening fence: ` ``` ` optionally followed by a language identifier and/or attributes.
- Language identifier: `[ID_LITERAL]+` (see §1), optional. Defaults to `"text"` when absent.
- Attributes: optional, follow standard attribute syntax (§5).
- Content: literal — no inline parsing is performed inside a code block.
- Closing fence: ` ``` ` on its own line.
- Fence character: backtick only. `~~~` is reserved for metadata (§9.5).
- Minimum fence length: exactly 3 backticks. Variable-length fences are not supported.
- Nesting: not supported. The first ` ``` ` closing line ends the block.
- Unclosed fence: content runs to end of document.

> **Out of scope:** Embedding a literal Cutdown code block inside a `CodeBlock` with `language="cutdown"` is intentionally unsupported. Because fence length is fixed at exactly 3 backticks and nesting is not supported, there is no way to represent a ` ``` ` fence line as literal content. Authors who need to show Cutdown examples inside a Cutdown document SHOULD use a `:::example` Named Block; rendering is the consumer's responsibility.

```
AST: CodeBlock { language: string = "text", content: string, attributes: Attributes }
```

---

### 9.5 Meta block (Frontmatter)

**Syntax:** Fenced with exactly three tildes.

```
~~~format
content
~~~
```

- Opening fence: `~~~` optionally followed by a format identifier.
- Recognized formats: `yaml`, `toml`, `json` (case-insensitive). Default: `yaml`.
- Content: raw string — passed as-is to the consumer.
- Closing fence: `~~~` on its own line.
- Unclosed fence: content runs to end of document.
- May appear anywhere in the document. Multiple Meta blocks are allowed.
- A Meta block always fills the current Page's `meta` field. If `Page.meta` is already set, the Meta block opens a new Page first, then fills that Page's `meta`. No Meta block ever appears in `Page.children`.
- No attributes supported on Meta blocks.

```
AST: Meta { format: "yaml"|"toml"|"json" = "yaml", raw: string }
```

**Meta Transclusion:** A Meta block may include an `include:` key listing paths to external files. Cutdown emits this as a normal `Meta` node. Resolution is the consumer's responsibility.

```
~~~yaml
include:
  - /path/to/other.yaml
  - /path/to/config.toml
  - /path/to/page.markdown   # only document meta extracted by consumer
~~~
```

---

### 9.6 QuoteBlock

**Syntax:** Lines prefixed with `>`.

```
> This is a quoted block.
> Still in the quote.
```

- Every line of the blockquote MUST begin with `>`.
- A parser MUST NOT treat a line without a leading `>` as a continuation of the blockquote. Such a line ends the quote and begins a new block.
- The `>` prefix and one optional following space are stripped from each line before parsing content.
- Content is parsed as full block content (paragraphs, lists, code blocks, nested quotes, etc.).
- Nesting: `>>` = blockquote inside blockquote. `>>>` = triple nesting, etc. Both `>>` and `> >` (with spaces between `>`) are valid nesting syntax. Nesting depth = count of leading `>` characters.
- `{attr}` trailing on the first `>` line attaches to the QuoteBlock. Only the first line's trailing `{attr}` is claimed by the block; subsequent lines' trailing `{attr}` follow inline attachment rules.

```
AST: QuoteBlock { children: Block[], attributes: Attributes }
```

---

### 9.7 Lists

#### 9.7.1 Unordered List

**Marker:** The list marker is the minus-hyphen character (`-`) only, followed by one space.

```
- Item one
- Item two
  - Nested item
```

- Nesting: exactly 2 spaces of indentation per level.

#### 9.7.2 Ordered List

**Marker:** `{number}.` followed by one space.

```
1. First item
2. Second item
   1. Nested
```

- Only `.` delimiter supported. `)` is not a list marker.
- The actual number in the source is ignored. The AST carries a `start` attribute for the first item offset.

#### 9.7.3 Tight vs Loose

A list is **loose** if any of its items are separated by blank lines. A loose list sets `loose: true` on the `List` node.

`loose` is an **advisory flag** — it records a structural fact about the source (blank lines were present between items). Consumers MAY use it to influence rendering (e.g. wrapping items in `<p>` tags). Consumers MAY ignore it. The parser does not alter `ListItem` children based on looseness; the flag is purely informational.

Trailing attr lines (lines consisting solely of `{attrs}` with no preceding blank line) are NOT treated as blank lines for loose detection purposes.

#### 9.7.4 Task Items

Task items are unordered list items prefixed with a checkbox marker. They emit `TaskItem` nodes carrying a `checked` boolean.

**Syntax:**

```
- [ ] Unchecked task
- [x] Checked task
- [X] Also checked
```

- Marker: `- ` followed immediately by `[ ]` (unchecked) or `[x]`/`[X]` (checked), then a space and inline content.
- Only unordered list items may carry a checkbox. An ordered list item never produces a `TaskItem`.
- A `List` may contain a mix of `ListItem` and `TaskItem` children.
- `TaskItem` follows the same multiline and block-promotion rules as `ListItem` (§9.7.5).

```
AST: TaskItem { checked: bool, children: (Block | Inline)[], attributes: Attributes }
```

**Example:**

```
Input:
  - [ ] Buy milk
  - [x] Write spec
  - plain item

AST:
  List { ordered: false, loose: false }
  ├── TaskItem { checked: false, children: [Text("Buy milk")] }
  ├── TaskItem { checked: true,  children: [Text("Write spec")] }
  └── ListItem { children: [Text("plain item")] }
```

**Mixed-type list rules:**

A single `List` node may mix `ListItem`, `TaskItem`, and numeric markers. The first item's marker determines `List.ordered`:

- If the first item is a `TaskItem` or unordered marker → `ordered: false`.
- If the first item is a numeric marker → `ordered: true`.

`TaskItem` identity is always preserved regardless of `List.ordered`.

When a `TaskItem` is first (list is unordered), any subsequent numeric markers are treated as unordered items and emit plain `ListItem` nodes.

```
Example A — numeric first, task item second:
  1. First ordered item
  - [ ] Task item

  AST: List { ordered: true }
  ├── ListItem { children: [Text("First ordered item")] }
  └── TaskItem { checked: false, children: [Text("Task item")] }

Example B — task first, numeric second:
  - [ ] Task item first
  1. Numeric becomes unordered

  AST: List { ordered: false }
  ├── TaskItem { checked: false, children: [Text("Task item first")] }
  └── ListItem { children: [Text("Numeric becomes unordered")] }
```

#### 9.7.5 Multiline List Items

A list item continues on subsequent lines if they are indented by ≥ 2 spaces (matching the nesting indentation level). A line with less indentation ends the item.

A blank line within a single list item creates a block boundary inside the item — the item's children become `Block[]` (paragraphs, nested lists, etc.). The list itself is **not** marked loose by intra-item blank lines; only blank lines **between** items trigger `loose: true`.

```
Input:
  - First item
    continues here
  - Second item

    This starts a new paragraph inside item two.

    - Nested item

AST:
  List { ordered: false, loose: true }
  ├── ListItem
  │   └── Text("First item continues here")
  └── ListItem
      ├── Paragraph("Second item")
      ├── Paragraph("This starts a new paragraph inside item two.")
      └── List { ordered: false, loose: false }
          └── ListItem
              └── Text("Nested item")
```

For `{attr}` on list items, see the scope-chain rule in §5.2.

---

### 9.8 Tables

Two table variants are supported, distinguished by the presence of a delimiter row.

#### 9.8.1 Simple Pipe Table

No delimiter row. All rows are body rows. No header.

```
| Cell A | Cell B |
| Cell C | Cell D |
```

#### 9.8.2 GFM Table

A delimiter row follows the first (header) row.

```
| Name   | Score |
|:-------|------:|
| Alice  |    42 |
| Bob    |    17 |
```

**Delimiter row alignment syntax:**

| Delimiter | Alignment |
|-----------|-----------|
| `\|------|` | none (default left) |
| `\|:-----|` | left |
| `\|-----:|` | right |
| `\|:----:|` | center |
| `\|-----,|` | comma (thousands separator style) |
| `\|-----.|` | decimal (decimal point alignment) |

Rendering of comma and decimal alignment is the consumer's responsibility.

#### 9.8.3 Table Rules

- Cell content is parsed as inline markup.
- Colspan and rowspan are not supported.
- Pipe-less table syntax is **not supported**. Leading and trailing `|` are required and MUST be consistent within a table.
- `Cell` and `Column` do not carry `attributes`.

**Row and Table attributes** follow the scope-chain rule (§5, Rule B) with a 2-slot chain: the last `{}` goes to `Table`, the preceding `{}` goes to `Row`. However, the `Table` slot is only available from the **last row's** chain — mid-table rows have 1 slot (`Row`) only.

`{attr}` blocks may appear trailing on the same line as the row (after the closing `|`), or on one or more immediately following lines (no blank line between), following the single-NL transparency rule.

```
| td1 | td2 | {.a}{.b}   →  Table({.b}, Row({.a}, Cell(td1), Cell(td2)))
| td1 | td2 | {.a}       →  Table({.a}, Row(...))          ← single {} = Table slot
| td1 | td2 | {.a}{}     →  Table({},   Row({.a}, ...))    ← {} no-op on Table; {.a} to Row
| td1 | td2 |
{.a}{.b}                 →  Table({.b}, Row({.a}, ...))    ← multiline equivalent
| td1 | td2 |
{.a}
{.b}                     →  Table({.b}, Row({.a}, ...))    ← same

Mid-table (not last row):
| td1 | td2 | {.a}       →  Row({.a}, ...)                 ← 1 slot only
| td1 | td2 | {.a}{.b}   →  Row({.b}, ...)   {.a} dropped  ← 1 slot; extra dropped
```

```
AST:
  Table {
    kind:        "simple" | "gfm",
    head:        Row[] | null,
    body:        Row[],
    columns:     Column[],
    attributes:  Attributes
  }

  Row {
    children:   Cell[],
    attributes: Attributes
  }

  Cell {
    children: Inline[],
    row:      number,    ← zero-indexed
    column:   number     ← zero-indexed
  }

  Column {
    align: "left" | "right" | "center" | "comma" | "decimal"
           ← default: "left" (no null value)
  }
```

Note: `Cell` does not carry an `align` field — consumers derive alignment from the corresponding `Column`.

---

### 9.9 File References

Any line beginning with `/` is a **file reference block**.

**Syntax:** `/path/to/file.ext {attrs}`

- Leading `/` is mandatory.
- Path traversal (`/../`) is allowed. Cutdown does not validate paths.
- Optional attributes after the path.

```
AST: FileRef { src: string, fragment: string|null, group: "image"|"video"|"audio"|null, attributes: Attributes }
```

#### 9.9.1 Known Groups

The parser checks the file extension against known groups:

| Group | Extensions |
|-------|-----------|
| `image` | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.svg` |
| `video` | `.mp4` `.avi` `.mov` |
| `audio` | `.mp3` `.wav` `.aac` `.ogg` |
| (none) | all other extensions |

The extension list for each group is configurable by the consumer. The above are defaults.

#### 9.9.2 Grouping

Consecutive `FileRef` lines belonging to the **same known group** (with no blank line between them) are wrapped in a `FileRefGroup`.

```
AST: FileRefGroup { group: "image"|"video"|"audio", children: (FileRef | ImageBlock)[] }
```

Rules:
- Grouping only applies to known-group extensions.
- Different groups do NOT merge. Two consecutive lines of different groups produce two separate nodes.
- Unknown extension files (`group: null`) are never grouped.
- A blank line breaks any active group.

**Example:**

```
Input:
  /photos/a.png
  /photos/b.jpg
  /docs/report.pdf
  /media/clip.md
  /photos/c.png

AST:
  FileRefGroup(image)
  ├── FileRef { src: "/photos/a.png", group: "image" }
  └── FileRef { src: "/photos/b.jpg", group: "image" }
  FileRef { src: "/docs/report.pdf", group: null }
  FileRef { src: "/media/clip.md", group: null }
  FileRefGroup(image)
  └── FileRef { src: "/photos/c.png", group: "image" }
```

#### 9.9.3 ImageBlock

A line at block level beginning with `![` is classified as an `ImageBlock`.

```
AST: ImageBlock { alt: Inline[], src: string, attributes: Attributes }
```

Consecutive `ImageBlock` lines with no blank line between them are wrapped in a `FileRefGroup { group: "image" }`. The `FileRefGroup` may contain `FileRef` or `ImageBlock` children when `group` is `"image"`.

`{attr}` on an `ImageBlock` line: trailing on the same line.
`{attr}` for an `ImageGroup` (FileRefGroup of images): trailing rule after last item line (no blank line).

#### 9.9.4 Content Transclusion

Files with extensions `.cutdown`, `.markdown`, or `.md` are emitted as `FileRef { group: null }`. The consuming application is responsible for loading and embedding the referenced document's content. Each included document carries its own document outline.

A fragment identifier targets a specific section:

```
/path/to/page.cutdown#section-id
```

→ `FileRef { src: "/path/to/page.cutdown", fragment: "section-id", group: null }`

---

### 9.10 Named Block

**Syntax:**

```
:::block-name {attrs}
  content
:::
```

- Opening: `:::` followed immediately by a block name, then optional attributes.
- Closing: `:::` on its own line (no name).
- Block name pattern: `[ID_LITERAL]+` (see §1), immediately after `:::` with no space. A `:::` opener not followed immediately by an `[ID_LITERAL]` character (e.g. `::: {.attr}` or `:::` alone) does NOT open a NamedBlock — the block candidate is classified as a Paragraph and CDN-0013 is emitted.
- Content: any block content, including nested `:::` containers.
- Unclosed container: content runs to end of document.

> **Document Outline note:** In the Document Outline (a derived view — see §7.4), each `NamedBlock` is treated as a named section entry within its containing Page. This is distinct from `Section` nodes produced by headings. Consumers that build a Document Outline SHOULD include `NamedBlock` names as outline entries.

```
AST: NamedBlock { name: string, attributes: Attributes, children: Block[] }
```

**Indentation collapsing inside NamedBlock:** The first content line inside a `:::` container establishes the base indentation level (its leading space count). That many spaces are stripped from all content lines before parsing. Lines with fewer leading spaces than the base have all available leading spaces stripped. The closing `:::` is recognized regardless of its own leading indentation.

```
:::bb
  > qa
  > qb
:::
→ NamedBlock("bb", [QuoteBlock([Text("qa"), Text("qb")])])

:::bb
  - la
    - lb
:::
→ NamedBlock("bb", [List(ListItem([Text("la"), List(ListItem([Text("lb")]))]))])
```

**Nesting example:**

```
:::outer

:::inner
  text
:::

:::
```

```
AST:
  NamedBlock(name="outer")
  └── NamedBlock(name="inner")
      └── Paragraph("text")
```

---

### 9.11 Reference Definition

**Syntax:** `[^id]: inline content`

- MUST start at the beginning of a line.
- `id` may contain `[ID_LITERAL]+` (see §1). Case-sensitive.
- Content is parsed as inline content.
- Multiple definitions with the same `id`: last definition wins; earlier ones are discarded. This is intentional: a host document can override any definition from a transcluded fragment by placing its own definition after the include point. First-wins would make override order depend on fragment inclusion order, which is unpredictable.
- Cutdown does not validate that every `[^id]` link has a matching definition.

```
AST: RefDefinition { id: string, children: Inline[], attributes: Attributes }
```

---

### 9.12 Block Math Formula

**Syntax:** Fenced with exactly three dollar signs.

```
$$$ {attrs}
\pm\sqrt{a^2 + b^2}
$$$
```

- Opening fence: `$$$` optionally followed by attributes.
- Content: **literal** — no inline parsing is performed. Passed as raw string to the consumer (KaTeX or equivalent).
- Closing fence: `$$$` on its own line.
- Unclosed fence: content runs to end of document.
- Attributes on opening line follow standard attribute syntax (§5).

```
AST: MathBlock { formula: string, attributes: Attributes }
```

**Example:**

```
Input:
  $$$ {.display #eq1}
  \int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
  $$$

AST:
  MathBlock {
    formula: "\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
    attributes: { id: "eq1", class: ["display"] }
  }
```

---

### 9.13 Comments

See §8.3. Comments produce no AST node and are not listed in the document's block children.

---
