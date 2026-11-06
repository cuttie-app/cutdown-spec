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
| `__text__` | **Emphasis**, usually italic. |
| `**text**` | **Strong**, usually bold. |
| `~~text~~` | **Highlight**, marked text. |
| `^^text^^` | **Spoiler**, usually hidden until the reader reveals it. Add `{.nsfw}` or similar for a variant. |
| \`\`code\`\` | **CodeInline**, kept exactly as typed. Write `` \` `` for a backtick inside. |
| `$$formula$$` | **MathInline** (LaTeX), kept exactly as typed. |
| `""text""` | **QuoteInline**, double. The app picks the quote marks. |
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

**Unfinished markup** within paragraph stays plain text, with no warning:

- An unclosed doubled symbol stays as typed, and the rest of the line still works: `**a __b__ c` → `**a ` + `Emphasis(b)` + ` c`. The same holds for an unclosed `::name`.
- An unclosed `[`, `![`, `{{`, or `{` keeps the rest of its line as typed, markup included: `[a __b__ c` stays exactly that.
- Link text, a link target, and a `{…}` group may continue on the next line; `{{key}}` may not.

**Three in a row** inside a line (`***`, `___`, `~~~`, …) is the doubled opener plus one plain symbol. `###` mid-line starts a `##` comment whose text begins with `#`.

---

## Block Elements

````
~~~                 Meta (Frontmatter): page metadata, YAML by default
  ...
~~~

== ...              Section (Heading), level 2 (one = per level)

- ...               ListItem

1. ...              ListItem (ordered)

- [+] ...           TaskItem, done (- [ ] when not done)

/path.png           FileBlock (in a FileGroup)

/doc.cutdown        InjectBlock (also /folder/)

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

---                 PageBreaker: a new page (no node)

###                 CommentBlock, hidden
  ...
###
````

Blocks are separated by **blank lines**. Nothing interrupts a paragraph: a heading, list marker, or fence on the next line is still paragraph text. Leave a blank line before every new block (inside a quote, a change of depth is enough).

**Fences** (`` ``` `` `~~~` `$$$` `:::` `^^^` `###`): three or more symbols at the start of a line open a block; the next line starting with three or more of the same symbol closes it (`:::name` nests instead; see Named Block). On the opening line, only a language, format, or name word, `{attrs}`, and a `## comment` are kept; anything else is dropped with a warning.

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
=== Level 3        (up to ========= level 9)
```

The `=` run needs a space or the line end after it: `=Title` is text. A heading continues onto the next lines until a blank line, so `= Title` followed by `more` is one heading, `Titlemore`. More than nine `=` count as level 9, with a warning.

A heading opens a `Section` that runs to the next heading of the same or a shallower level (as many `=` or fewer), or to the end of its container (a named block, quote, or list item). Levels may be skipped. Attributes go at the end of the heading line:

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

Every row starts with `|`; the closing `|` is optional. Cells hold inline markup. A separator row, with at least three symbols in each cell, turns the rows above it into the header. Alignment: `:--` left, `--:` right, `:-:` center, `--,` on the comma, `--.` on the decimal point, `---` default, following the text direction. The first row sets the column count: shorter rows are padded, extra cells are dropped with a warning.

### Reference Definition → `RefDefinition`

```
A reference link points to a definition in the current document: [see later](^ref-id).

[^ref-id]: inline content
```

A line starting with `[^id]:` defines what `[text](^id)` points to. If the same id is defined twice, the last one wins.

---

## Caption

````
| Name  | Score |
^ Table caption text                   →  caption of the Table

/image.png
^ Figure caption text                  →  caption of the FileBlock

```javascript
code here
```
^ Listing caption                      →  caption of the CodeBlock

> Quoted text here.
^ Source attribution                   →  caption of the QuoteBlock
````

A `^ ` line directly under a block, with no blank line between, is that block's caption. It holds inline markup. A blank line in between, or a second `^ ` line, makes it an ordinary paragraph, with a warning. Write `\^ ` to start a paragraph with `^ `.

Captionable blocks: `Table`, `CodeBlock`, `MathBlock`, `FileBlock`, `EmbedBlock`, `NamedBlock`, `SpoilerBlock`, `QuoteBlock`.

---

## Attributes

```
{#id .class key=value key="spaced value"}
```

Attributes go **after** what they describe: at the end of its line, or on the next line with no blank line between. Spaces before the `{` are dropped.

- `#id` or `id=x`: an id. Any characters except spaces, `#`, `)`, and `}`; `{#道具一式}` works.
- `.name` or `class="a b"`: classes. Both forms add to one list.
- `key=value`, `key="spaced value"`: a property. Quote a value that has spaces.
- To put `"`, `{`, or `}` in a value, escape it: `title="say \"hi\" \{x\}"`. A `{{name}}` token needs no escape.

A group holds up to 32 entries. A group that is not valid stays as typed: `{a **b**}` is exactly that text.

**On a heading or named-block line**, the last `{…}` belongs to the block; earlier ones belong to the text before them.

**At the end of a list item or table row**, several groups climb outward: the last one goes to the outer element, the one before it to the inner. Only the last item reaches the `List`, and only the last row reaches the `Table`.

```
- item {.a}{.b}   →  .a on the ListItem, .b on the List      ← last item

| td | {.a}{.b}   →  .a on the Row, .b on the Table          ← last row

| td | {.a}       →  .a on the Row                           ← a row mid-table
```

---

## Comments

Comments are hidden by default.

| You type | You get |
|---|---|
| `#` | Plain text. A single `#` does nothing. |
| `## …` | **Line comment** (`LineReflection`) to the end of the line, at the start or in the middle of a line. |
| `###` … `###` | **CommentBlock** (`SegmentReflection`), kept as typed. Anything after `###` on the opening and closing lines is dropped. |

```
# literal hash, not a comment
## line comment
foo bar ## tail       → the text is "foo bar"; "tail" is a comment

###
  any content, kept as typed
###
```

To write `##` as text: `\##`. A `##` hides the rest of its line, closers included: in `[text ## here](url)` the link never closes. An unclosed `###` hides everything to the end of the document, with a warning.

---

## Document Model

```
Document
└── Page[]
    ├── meta: Meta | null
    └── children: Block[]
```

A document is a list of pages, always at least one. A new page starts at each top-level `---`, and at a Meta block when the current page already has one; text before the first Meta block belongs to the same page as that Meta block. Empty pages are valid.

---

## Input

- Files are UTF-8, unless the `charset` they come with names another encoding.
- Any line ending works: `\r\n`, `\r`, or `\n`. A tab reads as one space, except inside fences.
- Blank lines at the start and end of the document are ignored, and so are those of a named block, spoiler, quote, or list item. Code, math, Meta, and comment blocks keep theirs.
- HTML entities are not decoded: `&amp;` is five characters of text.
- Names (blocks, marks, languages, references, variables) use ASCII letters, digits, `.`, `_`, and `-`. Case matters.

---

## Escaping

Put `\` before a symbol to type it as text: `\**` is two asterisks. At the start of a line, it stops a block from opening: `\- not a list`, `\= not a heading`, `\--- not a page break`. Before a letter or other ordinary character, the `\` stays as typed. Every escapable symbol: [§B](spec/appendix-b-special-character-reference.md).

---

## Precedence

Which construct wins when two compete for the same text (fences, escapes, code, comments, links, spans): [§14](spec/014-precedence-rules.md).

---

## Coming from Markdown

These look familiar but mean something else. None is an error, and most give no warning.

| You type | Markdown gives | Cutdown gives |
|---|---|---|
| `# Title` | Heading | Plain text. Headings are `= Title`. |
| `__text__` | Strong | `Emphasis`. Strong is `**text**`. |
| `*text*`, `_text_` | Emphasis | Plain text. Single symbols never mark up. |
| `~~text~~` | Strikethrough | `Highlight`. |
| `---` | Horizontal rule | A new page, at the top level. |
| `* item`, `+ item` | List item | Plain text. Bullets are `- item`. |
| `one` / `two` on two lines | `one two` | `onetwo`. Start the second line with a space. |
| Four-space indent | Code block | Not code. Use a ```` ``` ```` fence. |
| `<b>text</b>` | HTML | Plain text. |
| `[text][id]` | Reference link | Plain text. Write `[text](^id)`. |
| `[[Page name]]` | Wiki link (Obsidian, wikis) | Plain text. Write `[Page name]()`, or `[](Page name)` to let the app choose the wording. |
| `[[Page name\|Custom wording]]` | Wiki link with its own wording | Plain text. Write `[Custom wording](Page name)`. |
