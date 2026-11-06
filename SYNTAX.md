# Cutdown Syntax — Quick Reference

Cutdown is a markup language that produces an AST. There is no HTML output. Parsing a complete input snapshot is single-pass with bounded lookahead (≤ one line at block level, ≤ end of line at inline level); committed text is never re-lexed or re-inline-parsed (§12). A streaming implementation may retain an unresolved suffix, but every decoded Unicode-scalar prefix follows the same ordinary Cutdown rules (§19).

---

## Inline Elements

Doubled symbols mark up text; a single `*`, `_`, `~`, `^`, `` ` ``, `$`, `"`, or `'` is plain text.

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
| `[text](^ref)` | **Reference link** to a `[^ref]: …` definition in this document. `[](^ref)` shows the marker only. |
| `[text](~tag)` | **Tag link**. Levels split by `/`: `~lang/japanese`. |
| `[text](@cite)` | **Citation**, resolved by the app. |
| `[](target)` | **Link with no text**: the app shows the target itself. |
| `[a [b](u) c](v)` | Links do not nest: the inner one is plain text. An image may be the link text: `[![CI](/ci.svg)](https://ci)`. |
| `![alt](src)` | **ImageInline** inside text. For a captioned or grouped image, put `/image.png` on its own line. |
| `::name content::`, `::name::` | **Mark**, a named span your app defines. Marks may nest. |
| `{{key}}` | **Variable**, filled in by the app. Name: letters, digits, `.` `_` `-`; no spaces. |
| `## …` | **Comment** to the end of the line, hidden. A single `#` is plain text. |
| `\` at line end | **Line break**; the next line stays in the same paragraph. |

Parsed in source order. An unclosed opener degrades by its class (§12.1.4.1):

- **Symmetric doubled delimiters** (`**` `__` `~~` `^^` `` ` `` `$$` `""` `''`): the opener alone becomes `Text`; parsing continues — constructs after it survive. `**a __b__ c` → `Text("**a ")` + `Emphasis(b)` + `Text(" c")`.
- **Bracket-like openers** (`[`, `![`, `{{`, `{`): the closer is searched through the inline context, so link text, a link target, and an attribute group may wrap onto the next line (`{{key}}` may not). With no closer, the source from the opener to the end of its own line (or the `##` cut) becomes one verbatim `Text` run — closed constructs inside the dead slice are lost. `[a __b__ c` → `Text("[a __b__ c")`.
- `::name … ::` (`Mark`) matches by counting, not by first closer. An unclosed opener emits the opener alone as `Text` and parsing continues; `::` without a valid name is literal text.

Degradation to visible literal text is silent — no diagnostics.

Cross-type nesting allowed (e.g. `**__text__**`). Same-type nesting is not allowed for the doubled-delimiter constructs — they close greedily at the first closer. `Mark` is the exception: it matches by counting and nests, including same-name (§5.10).

Inside an inline context, a run of 3 (`***`, `___`, `~~~`, `^^^`, ` ``` `, `$$$`, `"""`, `'''`) = 2-delimiter opener + 1 literal. For `###` at inline position: `##` (line comment, runs to EOL) + the trailing `#` becomes the first character of the payload text.

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

Blocks are separated by **blank lines**. Nothing interrupts a paragraph — once a run is a `Paragraph`, every later line in it is paragraph content, fence openers included (§4.1). A change in `>` depth is not an opener: it ends the paragraph and moves to the quote at its depth.

**Fences** (`` ``` `` `~~~` `$$$` `:::` `^^^` `###`): a line beginning with three or more fence symbols opens the fence; the next line beginning with three or more of the same symbol closes it. Three symbols are consumed; the rest of the line is dropped with CDN-0016, except what the construct keeps — a language, format, or name word, `{attrs}`, a `## comment` (§11.4.2).

### Paragraph → `Paragraph`

Any non-blank lines not matching another block. A soft break (single newline) is folded to zero — lines concatenate directly, no character emitted. A word boundary is written at the start of the next line: whitespace beyond the base column becomes one space, so `one` then ` two` reads `one two`. `\` at line end → `LineBreak`. Trailing and repeated whitespace: §15.

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

The `=` run is followed by whitespace or the line end (`=Title` is text; `=` alone is an empty heading). Like every block, a heading cannot interrupt a paragraph — it must begin a block candidate (§4.1). Inline content allowed. The heading continues over the following lines as a paragraph does, so `= Title` followed by `more` is one heading `Titlemore`; it ends at a blank line. Ten or more `=` give level 9, the surplus `=` beginning the heading text, with warning CDN-0012.

Sections are not parsed — they are derived by a fold (§16.1): a Section spans from its heading to the next heading of level ≤ its own within the same container, or the container's end. Section scope never crosses a container boundary (NamedBlock, QuoteBlock, ListItem). Skipped levels (`=` then `===`) nest under the nearest shallower open Section; the written level is preserved, no intermediate Sections are synthesized, no diagnostic.

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

Formats: `yaml` (default), `toml`, `json`, any case. Any other word → `yaml` + warning CDN-0039. Content is raw string. Fills `Page.meta`. No attributes. Used only on top level. Unclosed → warning CDN-0002.

### PageBreaker → new Page (no node)

```
---
```

A top-level line beginning exactly `---`. Closes the current Page (Ghost Page if empty), opens a new one, and produces no AST node. Everything after the leading `---` — surplus hyphens, `{attrs}`, text — is dropped with a diagnostic (CDN-0016). Inside block containers a blank-line-surrounded `---` is a literal paragraph (`Paragraph(Text("---"))`, CDN-0017). Cutdown defines no thematic-break (horizontal-rule) element.

### Lists → `List` / `ListItem` / `TaskItem`

```
- unordered item          ← (marker: '- ')
  - nested (2-space indent per level)

1. ordered item           ← (marker: '{n}. ')
2. second item

- [ ] task item           ← (marker: '- [{x / X / + / space}] ')
  - [x] nest task item    ← ({ checked: true})
  - [+] rtl-safe task     ← ({ checked: true}, bidi-neutral marker)
```

Only `-` for unordered; only `{number}.` delimiter for ordered, with 1–5 digits (six or more → no list). A marker is followed by whitespace or the line end: `-5 °C` and `3.14` are text, and `-` alone is an empty item. The first number sets `start` (`0` → `1`); later numbers are ignored. Nesting is **stack-based and column-relative** (§11.5): any positive indent delta opens a child; 2 spaces per level is the canonical style. Blank line + col-0 content ends the list; blank line + indented content is absorbed → `loose: true`. An item whose body is one paragraph holds inline children; any other body holds blocks, never a mix.

### Files → `FileBlock`, `FileGroup`

```
/My Docs/report.pdf {attrs}
/photos/a.png
^ Caption for a.png
```

Line starting with `/`. The whole line, spaces included, is the path (minus a trailing ` {attrs}`), kept as `raw` and parsed into `src`, a `PathResourceLocator` with `path`, `query`, and `fragment`; `src` is `null` when the path is invalid. Consecutive file lines form one `FileGroup`, like list items form a `List`; a blank line splits it. A `^ ` caption binds to the file above and does not split the group. Every path is read from the project root and normalized; `raw` keeps what was written. Normalization and validity: §8.

### Injection → `InjectBlock`

```
/chapters/intro.cutdown
/parts/card.cutdown?name=Ann#pricing
/chapters/
```

A file line whose normalized `path` has the extension `.cutdown`, in any ASCII case, or ends with `/` (folder). The parser emits `children: []`; the consumer fills it: `#id` picks one Section, `?k=v` binds `{{k}}`, a folder injects its `.cutdown` files in code-point order. Not captionable. What a consumer does: §9.

### Embed → `EmbedBlock`

```
https://youtu.be/dQw4w9WgXcQ {attrs}
^ Caption
```

Line starting with literal `https://`. `url` is raw; the consumer decides what to show (e.g. oEmbed). Captionable; never in a `FileGroup`.

Images have no block form: `![alt](src)` is always `ImageInline` (`EmbedImageInline` for an `https://` source), even alone on a line. Use a `FileBlock` for a captioned or grouped image.

### Quote Block → `QuoteBlock`

```
> content
> more content
> > nested quote
```

Every `>` is followed by whitespace or the line end, and consumes one whitespace character: `>quote` and `>>` are text, a bare `>` is an empty quote line. The `>` prefix is required on the first line only; a following line without `>` continues the quote (lazy continuation), which ends at a blank line or the end of the enclosing container. Nesting by counting `> ` markers; a line at a new depth ends the paragraph above it, so `> a` then `> > b` nests without a blank line. A body of one paragraph is held as inline children.

### Code Block → `CodeBlock`

````
```language {attrs}
literal content — no inline parsing
```
````

Language defaults to `"text"`; a word that is not an `ID_NAME` (```` ```c++ ````) → `"text"` + warning CDN-0038. No nesting: write a body line that begins with backticks as `` \``` ``. Unclosed → warning CDN-0001.

### Math Block → `MathBlock`

```
$$$ {attrs}
\LaTeX formula
$$$
```

Content is literal. Unclosed → warning CDN-0003.

### Named Block → `NamedBlock`

```
:::block-name {attrs}
  content (any blocks, including nested :::)
:::
```

A `:::` opener with no valid name (`:::`, `::: x`, `:::c++`) still opens a NamedBlock with `name: ""` and warning CDN-0013. Inside an open block, a `:::` line with a valid name opens a nested block; any other `:::` line closes. Unclosed → warning CDN-0004. First non-blank content line sets the base padding; up to that many leading spaces are removed from every line (tab = 1 space).

### Spoiler Block → `SpoilerBlock`

```
^^^ {attrs}
  content (any blocks, including nested :::, but not nested ^^^)
^^^
```

Content is **parsed as blocks**, like `NamedBlock`; code, meta, math, and comment fences are literal. The next `^^^` line closes it: SpoilerBlocks do **not** nest. Unclosed → warning CDN-0005. Base padding as for `NamedBlock`. Semantic variants via attributes (`{.nsfw}`, `{.redacted}`, etc.).

### Tables → `Table`

A table opens with a line starting with `|`; every row starts with `|`. A header separator row sets alignments: each cell needs at least three symbols (marks included), and `--,` / `--.` add comma and decimal alignment.

```
| Cell A | Cell B |          ← no header, all rows _type: "Row"

| Name   | Score |           ← table with header
|:-------|------:|           ← header separator; also sets alignment
| Alice  |    42 |           ← _type: "Row"
```

**Header separator:** A row whose every cell is an alignment pattern (≥ 3 symbols, marks included; the minimum keeps `| - |` and `| -- |` placeholder rows as content) marks the preceding rows as `_type: "Header"`. Alignment taken from the first header separator only.

**Alignment patterns:** `:--` left, `--:` right, `:-:` center, `--,` comma, `--.` decimal, `---` start (default — follows text direction; not the same as left). Extra `-` are allowed.

**Cells:** Each `|` line is one row. Cell content is `Inline[]`. Leading `|` required; trailing `|` optional. Column count is fixed by the first content row — later rows are padded (no diagnostic) or have surplus cells dropped (CDN-0018).

### Reference Definition → `RefDefinition`

```
A reference link points to a definition in the current document: [see later](^ref-id).

[^ref-id]: inline content
```

Must start at line start. When the same `ref` is defined more than once in a document, resolution uses the last definition (**last wins**).

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

An id (`#x` or `id=x`) is any Unicode except whitespace, `#`, `)`, `}` and controls — `{#道具一式}` is valid; ids are converted to NFC; an id outside that set is kept with CDN-0037. `.x` and `class="x y"` merge into one `class` list (source order, repeats dropped, max 32 → CDN-0034). `key={…}` / `key=[…]` holds strict one-line I-JSON, parsed (≤4096 chars, depth ≤8; no repeated names, no lone surrogates, integers within ±(2⁵³−1)); invalid JSON → the whole `{…}` is literal text. At most 32 entries per group (CDN-0041).

Always **after** their target: on the same line, or on the next lines with no blank line between. Whitespace between the target and the consumed `{attr}` is stripped — `== Heading  {.x}` → heading text is `"Heading"`, not `"Heading  "`.

**Block opening lines (headings, named blocks):** last `{...}` on the line → claimed by the block. Earlier `{...}` attach to preceding inline elements. Empty `{}` as last token = no attrs on block.

**Scope-chain (Rule B):** trailing `{...}` sequence at end of inline context distributed right-to-left through the node hierarchy. Last `{}` → outermost container; preceding `{}` → next inner level. Excess front `{}` silently dropped (warning CDN-0011).

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
| `### … ###` | `SegmentReflection` on the Page | Block comment (CommentBlock), no segment. A line beginning with `###` opens it, the next such line closes it; the rest of both lines is dropped (CDN-0016), so `### note` opens one. Opaque content (no parsing); `text` has no trailing newline. `before` is the child-index path of the block it stands before. |

```
# literal hash, not a comment
## line comment       → stored in reflections of nearest block
foo bar ## tail       → Text("foo bar") + reflections entry on block

###
  opaque block — any content captured raw
###
```

Literal `##` in normal text: `\##` or `#\#`. Unclosed `###` → warning CDN-0006. A `## comment` line after a blank line, after a CommentBlock, or at the start of a scope is an orphan → a `SegmentReflection` on the Page, like a CommentBlock.

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
