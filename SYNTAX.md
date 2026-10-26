# Cutdown Syntax — Quick Reference

Cutdown is a markup language that produces an AST. There is no HTML output. Parsing a complete input snapshot is single-pass with bounded lookahead (≤ one line at block level, ≤ end of line at inline level); committed text is never re-lexed or re-inline-parsed (§9). A streaming implementation may retain an unresolved suffix, but every decoded Unicode-scalar prefix follows the same ordinary Cutdown rules (§15).

```
~~~               MetaBlock (Frontmatter) format=yaml
  ...
~~~

== ...            Heading (Section) Level 2

- ...             ListItem (unordered)

1. ...            ListItem (ordered)

- [+] ...         TaskItem (checklist) checked=true

/path             FileBlock (in a FileGroup)

/doc.cutdown      InjectBlock (also /folder/)

https://...       EmbedBlock

> ...             QuoteBlock

$$$               MathBlock
  ...
$$$

:::div            NamedBlock name=div
  ...
:::

^^^               SpoilerBlock
  ...
^^^

| AA | BB |       Table
^ ...             Caption (no node)

[^...]: ...       RefDefinition

###               CommentBlock (hidden by default)
  ...
###

```

## Document Model

Each Cutdown file produces a `Document` with `Pages`. So it has at least one Page, even if empty. Pages contain blocks and inline elements. PageBreakers `---` at top level and Meta fences `~~~` produce Page boundaries.

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

The schema also admits **synthetic segments** that no parse produces (currently `Fragment`, §14): parsers never emit them, consumers must accept them.

---

## Block Elements

Blocks are separated by **blank lines**. Nothing interrupts a paragraph — once a run is a `Paragraph`, every later line in it is paragraph content, fence openers included (§4.1).

### Paragraph → `Paragraph`

Any non-blank lines not matching another block. A soft break (single newline) is folded to zero — lines concatenate directly, no character emitted; trailing spaces before the break collapse to a single space, preserved as the explicit word separator; at a block boundary the space is dropped (§12). `\` at line end → `LineBreak`.

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

Like every block, a heading cannot interrupt a paragraph — it must begin a block candidate (§4.1). Inline content allowed.

Sections are not parsed — they are derived by a fold (§9.5.1): a Section spans from its heading to the next heading of level ≤ its own within the same container, or the container's end. Section scope never crosses a container boundary (NamedBlock, QuoteBlock, ListItem). Skipped levels (`=` then `===`) nest under the nearest shallower open Section; the written level is preserved, no intermediate Sections are synthesized, no diagnostic.

```
= Quantum Computing                      {id="quantum-intro" category="science"}
== **Why** Classical Computers Struggle  {id="limits"}
```

### Meta Block (Frontmatter) → `Meta`

```
~~~yaml
key: value
~~~
```

Formats: `yaml` (default), `toml`, `json`. Content is raw string. Fills `Page.meta`. No attributes. Used only on top level. Unclosed → warning CDN-0002.

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

Only `-` for unordered; only `{number}.` delimiter for ordered, with 1–5 digits (six or more → no list). The first number sets `start` (`0` → `1`); later numbers are ignored. Nesting is **stack-based and column-relative** (§10.5): any positive indent delta opens a child; 2 spaces per level is the canonical style. Blank line + col-0 content ends the list; blank line + indented content is absorbed → `loose: true` (item content block-promoted).

### Files → `FileBlock`, `FileGroup`

```
/My Docs/report.pdf {attrs}
/photos/a.png
^ Caption for a.png
```

Line starting with `/`. The whole line, spaces included, is the path (minus a trailing ` {attrs}`), parsed as a `PathResourceLocator` (§1.7): `raw`, `path`, `query` (`?a=1&b` → pairs, no decoding), `fragment` (`#…`). Brackets nest; `\` escapes. Consecutive file lines form one `FileGroup`, like list items form a `List`; a blank line splits it. A `^ ` caption binds to the file above and does not split the group. No media type or group is assigned. A lone `/` is a valid `FileBlock`.

### Injection → `InjectBlock`

```
/chapters/intro.cutdown
/parts/card.cutdown?name=Ann#pricing
/chapters/
```

A file line whose `path` ends with `.cutdown` or `/` (folder). The parser emits `children: []`; the consumer fills it (§17): blocks of all injected Pages, `meta` dropped, Sections never cross the edge, ids/refs stay local, `#id` picks one Section, `?k=v` binds `{{k}}`, a folder injects its `.cutdown` files in code-point order. Not captionable.

### Embed → `EmbedBlock`

```
https://youtu.be/dQw4w9WgXcQ {attrs}
^ Caption
```

Line starting with literal `https://`. `url` is raw; the consumer decides what to show (e.g. oEmbed). Captionable; never in a `FileGroup`.

Images have no block form: `![alt](src)` is always `ImageInline`, even alone on a line. Use a `FileBlock` for a captioned or grouped image.

### Quote Block → `QuoteBlock`

```
> content
> more content
>> nested quote
```

The `>` prefix is required on the first line only; a following line without `>` continues the quote (lazy continuation), which ends at a blank line or the end of the enclosing container. Nesting by counting `>` chars.

### Code Block → `CodeBlock`

````
```language {attrs}
literal content — no inline parsing
```
````

Language defaults to `"text"`. Fixed 3-backtick fence. No nesting. Unclosed → warning CDN-0001.

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

`:::` + name required — nameless `:::` opener → Paragraph, warning CDN-0013. Closing `:::` alone. Unclosed → warning CDN-0004. First non-blank content line sets the base padding; up to that many leading spaces are removed from every line (tab = 1 space).

### Spoiler Block → `SpoilerBlock`

```
^^^ {attrs}
  content (any blocks, including nested :::, but not nested ^^^)
^^^
```

Fixed 3-caret fence. Content is **parsed as blocks** (the only XXX-fence with non-literal body — code/meta/math are literal; spoiler hides meaning, not structure). Closing `^^^` alone. SpoilerBlocks do **not** nest. Unclosed → warning CDN-0005. Base padding as for `NamedBlock`. Semantic variants via attributes (`{.nsfw}`, `{.redacted}`, etc.).

### Tables → `Table`

A table opens with a line starting with `|`. The shape is close to GFM pipe tables, with three differences: the leading `|` is required, an alignment cell needs at least three symbols (marks included), and `--,` / `--.` add comma and decimal alignment.

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
[^ref-id]: inline content
```

Must start at line start. When the same `ref` is defined more than once in a document, resolution uses the last definition (**last wins**).

---

## Inline Elements

Parsed in source order. An unclosed opener degrades by its class (§9.4.1):

- **Symmetric doubled delimiters** (`**` `__` `~~` `^^` `` ` `` `$$` `""` `''`): the opener alone becomes `Text`; parsing continues — constructs after it survive. `**a __b__ c` → `Text("**a ")` + `Emphasis(b)` + `Text(" c")`.
- **Bracket-like openers** (`[`, `![`, `{{`, `{`): the whole source from the opener to end of line (or the `##` cut) becomes one verbatim `Text` run — closed constructs inside the dead slice are lost. `[a __b__ c` → `Text("[a __b__ c")`.
- `::name … ::` (`Mark`) matches by counting, not by first closer. An unclosed opener emits the opener alone as `Text` and parsing continues; `::` without a valid name is literal text.

Degradation to visible literal text is silent — no diagnostics.

| Syntax          | Node | Notes                                                                                                                                                                                                 |
|-----------------|------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `__text__`      | `Emphasis` | Single `_` = literal                                                                                                                                                                                  |
| `**text**`      | `Strong` | Single `*` = literal                                                                                                                                                                                  |
| `~~text~~`      | `Highlight` | Single `~` = literal                                                                                                                                                                                  |
| `^^text^^`      | `Spoiler` | Single `^` = literal. Variants via `{.nsfw}` etc.                                                                                                                                                     |
| \`\`code\`\`    | `CodeInline` | Single \` = literal. Content literal except `` \` `` → \`.                                                                                                                                            |
| `$$formula$$`   | `MathInline` | Single `$` = literal. Content literal.                                                                                                                                                                |
| `""text""`      | `QuoteInline(double)` | Single `"` = literal                                                                                                                                                                                  |
| `''text''`      | `QuoteInline(single)` | Single `'` = literal                                                                                                                                                                                  |
| `[text](url)`   | `Link(external)` |                                                                                                                                                                                                       |
| `[text][page]`  | `Link(page)` | `path` is a `PathResourceLocator`; always a `.cutdown` document (extension optional, leading slash optional). Wiki-like syntax. Invalid path → CDN-0032                                                               |
| `[text][#tag]`  | `Link(tag)` | `target`; levels split by `/`, any Unicode except `#` `/` `]`. Empty level → CDN-0033                                                                                                                 |
| `[text][^ref]`  | `Link(ref)` | resolved by consumer on page in Ref's / ID's namespace                                                                                                                                                |
| `[text][@cite]` | `Link(cite)` | resolved by consumer in outer Ref vocabulary                                                                                                                                                          |
| `![alt](src)`   | `ImageInline` | `src` is a `PathResourceLocator`; `https://…` is a URL, never invalid. Balanced `()` stay in the path                                                                                                 |
| `::name <content>::` / `::name::` | `Mark` | Nests (incl. same name), max depth 8. Attrs after closer. `::` without name = literal.                                                                                                                |
| `{{key}}`       | `Variable` | Key is `ID_LITERAL`, no inner spaces. Empty/invalid key → literal text + CDN-0015. In string properties (paths, `href`, `url`, attribute values) `{{key}}` stays verbatim for the consumer (§5.11.1). |
| `## … <EOL>`    | Reflection entry on block | Line comment, runs to EOL. Payload stored in `block.reflection[]`. Single `#` = literal. Literal `##` = `\##`.                                                                                        |
| `\` at line end | `LineBreak` |                                                                                                                                                                                                       |

Cross-type nesting allowed (e.g. `**__text__**`). Same-type nesting is not allowed for the doubled-delimiter constructs — they close greedily at the first closer. `Mark` is the exception: it matches by counting and nests, including same-name (§5.10).

Inside inline context run of 3 (`***`, `___`, `~~~`, `^^^`, ` ``` `, `$$$`, `"""`, `'''`) = 2-delimiter opener + 1 literal. For `###` at inline position: `##` (line comment, runs to EOL) + the trailing `#` becomes the first character of the payload text.

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

- Blank line between block and `^ ` → no binding; `^ ` becomes a `Paragraph` (CDN-0008).
- Second `^ ` line (slot already filled) → `Paragraph` (CDN-0008).
- `{attrs}` on a caption line → literal text (CDN-0009).
- Escape: `\^` at line start suppresses the opener.

---

## Attributes

```
{#id .class key=value key="spaced value" data={"a":[1,2]}}
```

`.x` and `class="x y"` merge into one `class` list (source order, repeats dropped, max 32 → CDN-0034). `key={…}` / `key=[…]` holds strict one-line JSON, parsed (≤4096 chars, depth ≤8); invalid JSON → the whole `{…}` is literal text.

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
| `## … <EOL>` | `Reflection` entry on block | Line comment. Recognized at line-start AND mid-line. Runs to EOL. Stored in `block.reflection[]`, not in inline stream. Literal inside ` `` `, `$$`, and quoted attribute values. |
| `### … ###` | `CommentBlock` segment | Block comment. Bare `###` opener, bare `###` closer. Opaque content (no parsing). No `[name]`, no `{attrs}`. |

```
# literal hash, not a comment
## line comment       → stored as reflection on nearest block
foo bar ## tail       → Text("foo bar ") + reflection entry on block

###
  opaque block — any content captured raw
###
```

Literal `##` in normal text: `\##` or `#\#`. Unclosed `###` → warning CDN-0006.

**Opaque to other delimiters.** `##` consumes to `\n`, swallowing any `]`, `}`, `|`, or other closer in its path. An unclosed inline opener before `##` degrades per its class (§9.4.1) — for bracket-like openers the `##` cut terminates the verbatim slice. Example: `[text ## here](url)` → `Text("[text ")`, reflection entry `"here](url)"`.

**Transparent to attribute resolution.** `##` payloads are stored in `reflection`, never in the inline stream. No scope-chain slot is consumed. `= Heading {.c} ## note` → `Section({class:"c"}, heading: [Text("Heading ")], reflection: [{ loc, text: "note" }])`.

**Standalone line comment.** `## comment` on its own line closes any active Paragraph or FileGroup and attaches to the preceding block's `reflection`. No preceding block → empty `Paragraph { children: [], reflection: [...] }`.

**Table rows.** A trailing `## comment` after a row's content bubbles to `Table.reflection`, not to any `Row` or cell. `{attrs}` on a header separator row claim the Table slot (§4.8).

---

## Input

- Input is decoded UTF-8 text. Transport bytes are decoded before Cutdown receives input; every Unicode-scalar prefix is an ordinary valid Cutdown document (§15). Identifiers are compared under NFC; the source text is never rewritten (authors SHOULD store files in NFC).
- Leading BOM skipped (first content offset = 1). Null bytes → U+FFFD in emitted `Text` values.
- `\r\n`, `\r`, `\n` all read as line terminators. Tabs read as a single space (except inside fences). The source is never rewritten — these are interpretive rules (§7), not transforms.
- Leading and trailing blank lines (whitespace-only lines) are skipped by the block phase. A document of only blanks → empty AST.
- Every node may carry `loc: { file?, start, end }` — UTF-16 code-unit offsets into the raw file, end-exclusive (§14). Conformance AST comparison ignores `loc`.
- Inside non-opaque containers (NamedBlock, SpoilerBlock, QuoteBlock, ListItem), leading and trailing blank lines of the body are also stripped before children are parsed. Opaque containers (CodeBlock, Meta, MathBlock, CommentBlock) preserve their body verbatim.
- HTML entities (`&amp;` etc.) are **not** decoded — emitted as literal text.

`ID_LITERAL = [a-zA-Z0-9._-]` — used for all identifier tokens (block names, mark names, language tags, reference IDs). ASCII-only, case-sensitive everywhere.

---

## Escaping

`\` before a special character emits that character literally. Before a non-special character, both `\` and the character are emitted.

Special characters: `= # * _ ~ ^ $ [ ] ( ) ! { } : - > / \ | " '` and \`

### Block-opener escape (line start)

`\` before any one char of a block marker suppresses the opener; line becomes a Paragraph with marker chars as literal text.

| Marker | Escape (any of) | Result |
|---|---|---|
| `=` ... `=========` heading | `\=`, `\==`, ... | literal |
| `- ` list | `\- item` | literal |
| `> ` quote | `\> text` | literal |
| `---` PageBreaker | `\---`, `-\--`, `--\-` | literal; no Page boundary occurs |
| `/path` file / injection | `\/path` | literal |
| `https://` embed | `\https://…` | literal |
| `\|` pipe row / header separator | `\\| cell \|` | literal |
| `^ ` caption | `\^ text` | literal |
| `` ``` `` code fence | `` \``` ``, etc. | literal (residual backticks still parse inline) |
| `~~~` meta | `\~~~`, `~\~~`, `~~\~` | literal |
| `$$$` math | `\$$$`, `$\$$`, `$$\$` | literal |
| `###` comment block | `\###`, `#\##`, `##\#` | literal |
| `:::name` named block | `\:::name`, etc. | literal — **no CDN-0013** |
| `^^^` spoiler | `\^^^`, etc. | literal |

`##` line comment (mid-line) uses `\##` or `#\#` per §2.2.

### Opaque-block closer escape

Narrow per-block escape; all other `\X` inside opaque content is literal.

| Block | Escape | Notes |
|---|---|---|
| CodeInline / CodeBlock | `` \` `` | three backticks in row → `` \`\`\` `` |
| Meta | `\~` | any one of three closer chars |
| CommentBlock | `\#` | always escapes `#`, no run-length check |
| MathBlock | — | **no escape** (LaTeX owns `\`); literal `$$$` line unsupported |

NamedBlock and SpoilerBlock are not opaque — use block-opener escape on a content line.

---

## Precedence (highest first, per §11)

1. CodeBlock fence \`\`\` — content always literal
2. MetaBlock fence `~~~` — content always literal
3. MathBlock `$$$` — content always literal
4. CommentBlock `###` — content always literal (opaque)
5. Inline code \`\` — content literal except `` \` ``
6. Line comment `##` — no closer, runs to EOL; payload stored in block `reflection`; acts as the terminator for open inline constructs, which degrade per their class (§9.4.1)
7. Escape `\x` — resolved before delimiter matching
8. Links `[...](...)` and images `![...](...)` — matched before emphasis runs
9. Inline math `$$` — matched before emphasis; content literal
10. Strong `**`, Emphasis `__`, Highlight `~~`, Spoiler `^^`, QuoteInline `""` `''` — source order, greedy
11. Named mark `::name … ::` — matched after emphasis; name run is lexical
12. Variable `{{key}}` / Attributes `{...}` — longest opener wins (`{{` before `{`), then source order
