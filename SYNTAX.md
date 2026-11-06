# Cutdown Syntax — Quick Reference

Cutdown is a markup language for structured text. A parser turns a document into a tree of named elements, the AST (`Paragraph`, `Section`, `Strong`, …), and your app decides how they look. Every rule in full: [the specification](spec/TOC.md).

Three rules cover most writing:

1. A blank line separates paragraphs.
2. Doubled symbols mark up text (`**bold**`); a single symbol is plain text.
3. A line break inside a paragraph adds nothing: `よう` and `こそ` on two lines read `ようこそ`. To keep a space between words, start the next line with a space.

Markup is never an error. An unfinished `**` or `[` stays as plain text, exactly as typed.

---

## Inline Elements

| You type | You get |
|---|---|
| `__text__` | **Emphasis**, usually italic. Not bold, unlike Markdown. |
| `**text**` | **Strong**, usually bold. |
| `~~text~~` | **Highlight**, marked text. Not strikethrough. |
| `^^text^^` | **Spoiler**, usually hidden until the reader reveals it. Add `{.nsfw}` or similar for a variant. |
| \`\`code\`\` | **CodeInline**, kept exactly as typed. Write `` \` `` for a backtick inside. |
| `$$formula$$` | **MathInline** (LaTeX), kept exactly as typed. |
| `""text""` | **QuoteInline**, double. The renderer picks the quote marks. |
| `''text''` | **QuoteInline**, single. |
| `[text](https://…)`, `[text](mailto:…)` | **External link**. Any scheme works: `https:`, `mailto:`, `tel:`, … |
| `[text](path/to/page)` | **Link to a page** in this project. `.cutdown` is optional; `#id` at the end points into that page. |
| `[Page title]()` | **Wiki link**: links to the page named by the text. |
| `[text](#id)` | **Link within this document**, to the element marked `{#id}`. |
| `[text](^ref)` | **Reference link** to a `[^ref]: …` definition in this document. `[](^ref)` has no text; the app decides what to show. |
| `[text](~tag)` | **Tag link**. Levels split by `/`: `~lang/japanese`. |
| `[text](@cite)` | **Citation**, resolved by the app. |
| `[](target)` | **Link with no text** is allowed, for any kind of link; the app decides what to show instead. |
| `[a [b](u) c](v)` | Links do not nest: the inner one is plain text. An image may be the link text: `[![CI](/ci.svg)](https://ci)`. |
| `![alt](src)` | **ImageInline** inside text. For a captioned or grouped image, put `/image.png` on its own line. |
| `::name content::`, `::name::` | **Mark**, a named span your app defines. Marks may nest. |
| `{{key}}` | **Variable**, filled in by the app. Name: letters, digits, `.` `_` `-`; no spaces. |
| `## …` | **Comment** to the end of the line, hidden. A single `#` is plain text. |
| `\` at line end | **Line break**; the next line stays in the same paragraph. |

**Nesting.** Different kinds nest: `**__text__**`. The same kind does not: `**a **b** c**` closes at the second `**`. `Mark` is the exception and may nest, even with the same name.

**Unfinished markup** stays plain text, with no warning:

- An unclosed doubled symbol stays as typed, and the rest of the line still works: `**a __b__ c` → `**a ` + `Emphasis(b)` + ` c`. The same holds for an unclosed `::name`.
- An unclosed `[`, `![`, `{{`, or `{` keeps the rest of its line as typed, markup included: `[a __b__ c` stays exactly that.
- Link text, a link target, and a `{…}` group may continue on the next line; `{{key}}` may not.

**Three in a row** inside a line (`***`, `___`, `~~~`, …) is the doubled opener plus one plain symbol. `###` mid-line starts a `##` comment whose text begins with `#`.

---

## Block Elements

````
~~~                 MetaBlock (Frontmatter): page metadata, YAML by default
  ...
~~~

== ...              Section (Heading), level 2 (one = per level)

- ...               List item

1. ...              Numbered list item

- [+] ...           Task item, done (- [ ] when not done)

/path.png           File; consecutive file lines form a group

/doc.cutdown        Injected document (also /folder/)

https://...         EmbedBlock: video, post, map, …

> ...               QuoteBlock

```js               CodeBlock
  ...
```

$$$                 MathBlock
  ...
$$$

:::div              NamedBlock: a container your app defines
  ...
:::

^^^                 SpoilerBlock
  ...
^^^

| AA | BB |         Table
^ ...               Caption for the block above

[^...]: ...         RefDefinition

---                 PageBreak

###                 CommentBlock, hidden
  ...
###
````

Blocks are separated by **blank lines**. Nothing interrupts a paragraph: a heading, list marker, or fence on the next line is still paragraph text. Leave a blank line before every new block.

**Fences** (`` ``` `` `~~~` `$$$` `:::` `^^^` `###`): three or more symbols at the start of a line open a block; the next line starting with three or more of the same symbol closes it. On the opening line, only a language, format, or name word, `{attrs}`, and a `## comment` are kept; anything else is dropped with a warning.

### Paragraph → `Paragraph`

Any lines that are not another block. Lines join with nothing between them: start the next line with a space to keep a word gap, so `one` then ` two` reads `one two`. End a line with `\` for a line break inside the paragraph.

```
Modern computers are remarkably powerful, but certain classes of problems remain difficult. For example, simulating molecular interactions or solving large optimization tasks may require enormous computational resources.

Researchers once believed that some shortcuts would dramatically reduce computational cost, but many of those expectations are ~~overly optimistic~~ — a point worth flagging for the next revision.
```

### Headings → `Section`

```
= Level 1
== Level 2
=== Level 3        (up to =========  level 9)
```

The `=` run needs a space after it: `=Title` is text. A heading continues onto the next lines until a blank line, so `= Title` followed by `more` is one heading, `Titlemore`. More than nine `=` count as level 9, with a warning.

A heading opens a `Section` that runs to the next heading of the same or a higher level, or to the end of its container (a named block, quote, or list item). Levels may be skipped. Attributes go at the end of the heading line:

```
= Quantum Computing                      {id="quantum-intro" category="science"}
== **Why** Classical Computers Struggle  {id="limits"}
```

### Meta Block (Frontmatter) → `Meta`

```
~~~
title: The Surprising Reason a Classical Computer Beat a Quantum Computer at Its Own Game
~~~
```

Page metadata, kept as raw text for the app. YAML by default; write `~~~toml` or `~~~json` for the others. Top level only, never inside another block. A second Meta block on the same page starts a new page. Unclosed: runs to the end of the document, with a warning.

### PageBreaker → new Page (no node)

```
---
```

`---` at the start of a top-level line starts a new page. Anything after it on the line is dropped with a warning. Inside a list, quote, or other container, `---` is plain text. Cutdown has no horizontal rule.

### Lists → `List` / `ListItem` / `TaskItem`

```
- unordered item
  - nested item (indent 2 spaces per level)

1. ordered item
2. second item

- [ ] task item, not done
  - [x] done                ← also [X]
  - [+] done                ← reads the same in right-to-left text
```

Bullets use `-` only; numbered items use a number of up to five digits and `.`. The marker needs a space after it: `-5 °C` and `3.14` stay text. The first number sets where the numbering starts; later numbers are ignored. Indent to nest. A blank line followed by unindented text ends the list; a blank line followed by indented text continues the item.

### Files → `FileBlock`, `FileGroup`

```
/My Docs/report.pdf {attrs}
/photos/a.png
^ Caption for a.png
```

A line starting with `/` is a file, read from the project root. The whole line is the path, spaces included; `{attrs}` may follow at the end. Consecutive file lines form one `FileGroup`, as list items form a `List`; a blank line splits it. A `^ ` caption under a file belongs to that file and does not split the group.

### Injection → `InjectBlock`

```
/chapters/intro.cutdown
/parts/card.cutdown?name=Ann#pricing
/chapters/
```

A file line ending in `.cutdown`, or a folder ending in `/`, inserts other documents. The app does the inserting: `#pricing` picks one section, `?name=Ann` fills `{{name}}` inside the inserted document, and a folder inserts its `.cutdown` files sorted by name. No caption.

### Embed → `EmbedBlock`

```
https://youtu.be/dQw4w9WgXcQ {attrs}
^ Caption
```

A line starting with `https://` embeds that address; the app decides what to show. Takes a caption; never part of a `FileGroup`.

Images have no block form: `![alt](src)` alone on a line is still an `ImageInline`. For a captioned or grouped image, use a file line: `/image.png`.

### Quote Block → `QuoteBlock`

```
> content
> more content
> > nested quote
```

Each `>` needs a space after it: `>quote` is text. Only the first line needs the `>`; the lines after it continue the quote until a blank line. Nest with `> >`; a change of depth needs no blank line.

### Code Block → `CodeBlock`

````
```language {attrs}
literal content — no inline parsing
```
````

The language word is optional; without one it is `text`. Content is kept exactly as typed. To write a line starting with backticks inside, escape it: `` \``` ``. Unclosed: runs to the end of the document, with a warning.

### Math Block → `MathBlock`

```
$$$ {attrs}
\LaTeX formula
$$$
```

LaTeX, kept exactly as typed. Unclosed: runs to the end of the document, with a warning.

### Named Block → `NamedBlock`

```
:::block-name {attrs}
  content (any blocks, including nested :::)
:::
```

A container your app defines by name. Names use letters, digits, `.`, `_`, and `-`; a missing or invalid name still opens the block, with a warning. Inside, `:::name` (the name right after the colons) opens a nested block; any other `:::` line closes. Content may be indented: the first content line's indent is removed from every line. Unclosed: runs to the end of the document, with a warning.

### Spoiler Block → `SpoilerBlock`

```
^^^ {attrs}
  content (any blocks, including nested :::, but not nested ^^^)
^^^
```

Holds any blocks, like a `NamedBlock`. Spoilers do **not** nest: the next `^^^` line closes. Variants via attributes: `{.nsfw}`, `{.redacted}`, and so on. Unclosed: runs to the end of the document or of its parent container, with a warning.

### Tables → `Table`

```
| Cell A | Cell B |          ← a table with no header

| Name   | Score |           ← header row
|:-------|------:|           ← separator: marks the header, sets alignment
| Alice  |    42 |           ← body row
```

Every row starts with `|`; the closing `|` is optional. Cells hold inline markup. A separator row, each cell at least three symbols, turns the rows above it into the header. Alignment: `:--` left, `--:` right, `:-:` center, `--,` on the comma, `--.` on the decimal point, `---` default, following the text direction. The first row sets the column count: shorter rows are padded, extra cells are dropped with a warning.

### Reference Definition → `RefDefinition`

```
A reference link points to a definition in the current document: [see later](^ref-id).

[^ref-id]: inline content
```

A line starting with `[^id]:` defines what `[text](^id)` points to. If the same id is defined twice, the last one wins.

---

## Caption

**Syntax**:

```
| Captionalb | col B |
^ Table caption text
```

A line starting with (`^ `) immediately after a captionable block (no blank line) enriches that block with a `caption` field. No separate AST node is produced.

````
| col A | col B |
^ Table caption text                   →  Table { caption: [...] }

/image.png
^ Figure caption text                  →  FileGroup(FileBlock { caption: [...] })

```javascript
code here
```
^ Listing caption                      →  CodeBlock { caption: [...] }

> Quoted text here.
^ Source attribution                   →  QuoteBlock { caption: [...] }
````

Captionable blocks: `Table`, `CodeBlock`, `MathBlock`, `FileBlock`, `EmbedBlock`, `NamedBlock`, `SpoilerBlock`, `QuoteBlock`. No caption → `caption: []`.

---

## Attributes

```
{#id .class key=value key="spaced value" data={"a":[1,2]}}
```

An id (`#x` or `id=x`) is any Unicode except whitespace, `#`, `)`, `}` and controls — `{#道具一式}` is valid; ids are converted to NFC; an id outside that set is kept, with a warning. `.x` and `class="x y"` merge into one `class` list (source order, repeats dropped; past 32, the rest are dropped with a warning). `key={…}` / `key=[…]` holds strict one-line I-JSON, parsed (≤4096 chars, depth ≤8; no repeated names, no lone surrogates, integers within ±(2⁵³−1)); invalid JSON → the whole `{…}` is literal text. At most 32 entries per group; the rest are dropped with a warning.

Always **after** their target: on the same line, or on the next lines with no blank line between. Whitespace between the target and the consumed `{attr}` is stripped — `== Heading  {.x}` → heading text is `"Heading"`, not `"Heading  "`.

**Block opening lines (headings, named blocks):** last `{...}` on the line → claimed by the block. Earlier `{...}` attach to preceding inline elements. Empty `{}` as last token = no attrs on block.

**Scope-chain (Rule B):** trailing `{...}` sequence at end of inline context distributed right-to-left through the node hierarchy. Last `{}` → outermost container; preceding `{}` → next inner level. Excess front `{}` are dropped with a warning.

```
- item {.a}{.b}   →  List({.b}, ListItem({.a}, Text("item")))

| td | {.a}{.b}   →  Table({.b}, Row({.a}, ...))     ← last row only

| td | {.a}       →  Table({.a}, Row(...))           ← mid-table: 1 slot (Row only)
```

`{{` always matched before `{` (longest opener wins).

**Literal-span idiom.** `{` opens an attribute scan to the matching `}` or end of line. Invalid attr grammar or no `}` → the entire slice (braces included) is one verbatim `Text` run, never inline-parsed: `{a **b**}` → `Text("{a **b**}")`. Note: extending the attribute grammar later is a breaking change for text using this idiom.

---

## Comments

Cutdown has two comment constructs. Both are hidden by renderers by default.

| Form | Result | Notes |
|------|--------|-------|
| `#` | literal text | Single `#` does nothing — written exactly as typed. |
| `## … <EOL>` | `LineReflection` on block | Line comment. Recognized at line-start AND mid-line. Runs to EOL. Stored in `block.reflections[]`, not in inline stream. Literal inside ` `` `, `$$`, and quoted attribute values. |
| `### … ###` | `SegmentReflection` on the Page | Block comment (CommentBlock), no segment. A line beginning with `###` opens it, the next such line closes it; the rest of both lines is dropped, so `### note` opens one. Opaque content (no parsing); `text` has no trailing newline. `before` is the child-index path of the block it stands before. |

```
# literal hash, not a comment
## line comment       → stored in reflections of nearest block
foo bar ## tail       → Text("foo bar") + reflections entry on block

###
  opaque block — any content captured raw
###
```

Literal `##` in normal text: `\##` or `#\#`. An unclosed `###` hides everything to the end of the document, with a warning. A `## comment` line after a blank line, after a CommentBlock, or at the start of a scope is an orphan → a `SegmentReflection` on the Page, like a CommentBlock.

**Opaque to other delimiters.** `##` consumes to the line end, swallowing any `]`, `}`, `|`, or other closer in its path: `[text ## here](url)` alone → `Text("[text")`, reflections entry `"here](url)"`. A comment takes no attribute slot. Details: §7.2.

**Standalone line comment.** `## comment` on its own line, directly after content, attaches to the owner of the line above (the last item, row, or file of a List, Table, or FileGroup) and does not split that run; it does end a Paragraph. After a blank line, or with no preceding block → empty `Paragraph { children: [], reflections: [...] }`. No blank line is needed after a comment line.

**Line owner.** A trailing `## comment` goes to the node that owns its line: a `Row`, `ListItem`/`TaskItem`, or `FileBlock`. The full table of owners: §7.

---

## Document Model

Each Cutdown file produces a `Document` of `Page` nodes, always at least one, even if empty. Pages contain blocks and inline elements. PageBreakers `---` at top level and Meta fences `~~~` produce Page boundaries.

```
Document
└── Page[]
    ├── meta: Meta | null
    └── children: Block[]
```

- Every document has ≥ 1 Page.
- `---` → always closes the current Page (Ghost Page if empty) and opens a new one. Produces no node.
- `Meta` block → fills the current Page's `meta` slot; if that slot is already set, closes the Page and opens a new one carrying it as `meta`. Content before a `Meta` never creates a Page.
- Empty Page (`meta: null`, `children: []`) = Ghost Page (valid).

---

## Input

- Input is decoded Unicode text, from UTF-8 or the encoding its `charset` names (§1.7). Bytes are decoded before Cutdown receives input; every Unicode-scalar prefix is an ordinary valid Cutdown document (§19). Identifiers are compared under NFC; the source text is never rewritten (authors SHOULD store files in NFC).
- `\r\n`, `\r`, `\n` all read as line terminators. Tabs read as a single space (except inside fences). The source is never rewritten — these are interpretive rules (§10), not transforms.
- Leading and trailing blank lines (whitespace-only lines) are skipped by the block phase. A document of only blanks → empty AST.
- Inside non-opaque containers (NamedBlock, SpoilerBlock, QuoteBlock, ListItem), leading and trailing blank lines of the body are also stripped before children are parsed. Opaque containers (CodeBlock, Meta, MathBlock, CommentBlock) preserve their body verbatim.
- HTML entities (`&amp;` etc.) are **not** decoded — emitted as literal text.

`ID_CHAR ::= [a-zA-Z0-9._-]`, `ID_NAME ::= ID_CHAR+` — used for all identifier tokens (block names, mark names, language tags, reference IDs, variable keys). ASCII-only, case-sensitive everywhere.

---

## Escaping

`\` before a special character emits that character literally. Before a non-special character, both `\` and the character are emitted.

Special characters, and where each may be escaped: the register in §B.

---

## Precedence

Which construct wins when two compete for the same text (fences, escapes, code, comments, links, spans): §14.
