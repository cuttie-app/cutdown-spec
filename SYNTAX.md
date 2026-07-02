# Cutdown Syntax — Quick Reference

Cutdown is a markup language that produces an AST. There is no HTML output. Parsing is single-pass with bounded lookahead (≤ one line at block level, ≤ end of line at inline level); committed text is never re-lexed or re-inline-parsed (§9).

---

## Input

- UTF-8 only. Identifiers are compared under NFC; the source text is never rewritten (authors SHOULD store files in NFC).
- Leading BOM skipped (first content offset = 1). Null bytes → U+FFFD in emitted `Text` values.
- `\r\n`, `\r`, `\n` all read as line terminators. Tabs read as a single space (except inside fences). The source is never rewritten — these are interpretive rules (§7), not transforms.
- Leading and trailing blank lines (whitespace-only lines) are skipped by the block phase. A document of only blanks → empty AST.
- Every node may carry `loc: { file?, start, end }` — UTF-16 code-unit offsets into the raw file, end-exclusive (§14). Conformance AST comparison ignores `loc`.
- Inside non-opaque containers (NamedBlock, SpoilerBlock, QuoteBlock, ListItem), leading and trailing blank lines of the body are also stripped before children are parsed. Opaque containers (CodeBlock, Meta, MathBlock, CommentBlock) preserve their body verbatim.
- HTML entities (`&amp;` etc.) are **not** decoded — emitted as literal text.

`ID_LITERAL = [a-zA-Z0-9._-]` — used for all identifier tokens (block names, span names, language tags, reference IDs). ASCII-only, case-sensitive everywhere.

---

## Comments

Cutdown has two comment constructs. Both are hidden by renderers by default.

| Form | Result | Notes |
|------|--------|-------|
| `#` | literal text | Single `#` does nothing — written exactly as typed. |
| `## … <EOL>` | `Reflection` entry on block | Line comment. Recognized at line-start AND mid-line. Runs to EOL. Stored in `block.reflection[]`, not in inline stream. Literal inside ` `` `, `$$`, and quoted attribute values. |
| `### … ###` | `CommentBlock` segment | Block comment. Bare `###` opener, bare `###` closer at same column. Opaque content (no parsing). No `[name]`, no `{attrs}`. |

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

**Standalone line comment.** `## comment` on its own line closes any active Paragraph or FileRefGroup and attaches to the preceding block's `reflection`. No preceding block → empty `Paragraph { children: [], reflection: [...] }`.

**Table rows.** A trailing `## comment` after a row's content bubbles to `Table.reflection`, not to any `Row` or cell. `{attrs}` on the delimiter row are dropped → CDN-0007.

---

## Document Model

Each Cutdown file produces a `Document` with `Pages`. So it has at least one Page, even if empty. Pages contain blocks and inline elements. PageBreaks `---` at top level and Meta fences `~~~` produce Page boundaries.

```
Document
└── Page[]
    ├── meta: Meta | null
    └── children: (Section | Block)[]
```

- Every document has ≥ 1 Page.
- `---` → always closes the current Page (Ghost Page if empty) and opens a new one. Produces no node.
- `Meta` block → closes the current Page and opens a new Page carrying it as `meta` — unless it is the first pagination-relevant item of the document, in which case it fills the initial Page's `meta`.
- Empty Page (`meta: null`, `children: []`) = Ghost Page (valid).

The schema also admits **synthetic segments** that no parse produces (currently `Fragment`, §14): parsers never emit them, consumers must accept them.

---

## Block Elements

Blocks are separated by **blank lines**. Block elements cannot interrupt a paragraph.

### Paragraph → `Paragraph`

Any non-blank lines not matching another block. A soft break (single newline) is folded to zero — lines concatenate directly, no character emitted; a single trailing space before the break is preserved as the explicit word separator (§12). `\` at line end → `TextBreak`.

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

Must be preceded by a blank line (or start of document / block container). Inline content allowed.

Sections are not parsed — they are derived by a fold (§9.5.1): a Section spans from its heading to the next heading of level ≤ its own within the same container, or the container's end. Section scope never crosses a container boundary (NamedBlock, QuoteBlock, ListItem). Skipped levels (`=` then `===`) nest under the nearest shallower open Section; the written level is preserved, no intermediate Sections are synthesized, no diagnostic.

```
= Quantum Computing                      {id="quantum-intro" category="science"}
== **Why** Classical Computers Struggle  {id="limits"}
```


### Page Break → new Page (no node)

```
---
```

A top-level line beginning exactly `---`. Closes the current Page (Ghost Page if empty), opens a new one, and produces no AST node. Everything after the leading `---` — surplus hyphens, `{attrs}`, text — is dropped with a diagnostic (CDN-0016). Inside block containers a blank-line-surrounded `---` is a literal paragraph (`Paragraph(Text("---"))`, CDN-0017). Cutdown defines no thematic-break (horizontal-rule) element.

### Meta Block (Frontmatter) → `Meta`

```
~~~yaml
key: value
~~~
```

Formats: `yaml` (default), `toml`, `json`. Content is raw string. Fills `Page.meta`. No attributes. Used only on top level. Unclosed → warning CDN-0002.

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

### Quote Block → `QuoteBlock`

```
> content
> more content
>> nested quote
```

Every line must start with `>`. Nesting by counting `>` chars.

### Lists → `List` / `ListItem` / `TaskItem`

```
- unordered item          ← (marker: '- ')
  - nested (2-space indent per level)

1. ordered item           ← (marker: '{n}. ')
2. second item

- [ ] task item           ← (marker: '- [{x / X / space}] ')
  - [x] nest task item    ← ({ checked: true})
```

Only `-` for unordered; only `{number}.` delimiter for ordered. Actual numbers ignored. Nesting is **stack-based and column-relative** (§10.5): any positive indent delta opens a child; 2 spaces per level is the recommended style. Blank line + col-0 content ends the list; blank line + indented content is absorbed → `loose: true` (item content block-promoted).

### Tables → `Table`

Two variants: GFM (`kind: "gfm"`, first line starts with `|`) and Multiline (`kind: "multiline"`, first line starts with `+-`).

```
| Cell A | Cell B |          ← GFM table (no header, all rows type: "Row")

| Name   | Score |           ← GFM table with header
+:-------|------:+           ← header separator; also sets alignment
| Alice  |    42 |           ← type: "Row"

+----------+----------+      ← multiline grid
| Header A | Header B |
+:---------+----------+      ← header separator (colon = left align col 0)
| Cell A   | Cell B   |
+----------+----------+
```

**Header separator:** A `+` row with at least one `:` adjacent to `+` or `-` marks the preceding rows as `type: "Header"`. `+----+` (no colon) is ignored in GFM; acts as a body section delimiter in multiline. Alignment taken from the first header separator only. The `|:---|` piped-delimiter syntax is not supported — use `+:---+` instead.

**Alignment patterns:** `:---` left, `---:` right, `:---:` center, `---,` comma, `---.` decimal, `----` left (default).

**Multiline cells:** All `|` lines between two consecutive `+` rows form one logical row. Cell content is `Block[]` (full block context, like `ListItem`). Cells soft-join multi-line content (space between lines). Trailing `|` optional. Column count = max() across rows.

Leading/trailing `|` required in GFM rows. `+-` required as first line for multiline.

### File Reference → `FileRef`, `FileRefGroup`

```
/path/to/file.ext {attrs}
/path/to/image.png
```

Line starting with `/`. Known groups (image/video/audio) auto-wrapped in `FileRefGroup`. Fragment: `/page.md#section-id`. Query: `/page.md?key=value`.

### Image Block → `ImageBlock`

```
![alt text](src) {attrs}
```

Line starting with `![`. Block-level. Consecutive image lines wrapped in `FileRefGroup`. Image can be declared inside Inline context as well (as `ImageInline`).

### Named Block → `NamedBlock`

```
:::block-name {attrs}
  content (any blocks, including nested :::)
:::
```

`:::` + name required — nameless `:::` opener → Paragraph, warning CDN-0013. Closing `:::` alone. Unclosed → warning CDN-0004. First content line establishes base indent (stripped from all lines).

### Spoiler Block → `SpoilerBlock`

```
^^^ {attrs}
  content (any blocks, including nested :::)
^^^
```

Fixed 3-caret fence. Content is **parsed as blocks** (the only XXX-fence with non-literal body — code/meta/math are literal; spoiler hides meaning, not structure). Closing `^^^` alone. SpoilerBlocks do **not** nest. Unclosed → warning CDN-0005. First content line establishes base indent. Semantic variants via attributes (`{.nsfw}`, `{.redacted}`, etc.).

### Reference Definition → `RefDefinition`

```
[^ref-id]: inline content
```

Must start at line start. When the same `ref` is defined more than once in a document, resolution uses the last definition (**last wins**).

---

## Inline Elements

Parsed left-to-right. An unclosed opener degrades by its class (§9.4.1):

- **Symmetric doubled delimiters** (`**` `__` `~~` `^^` `` ` `` `$$` `""` `''`): the opener alone becomes `Text`; parsing continues — constructs after it survive. `**a __b__ c` → `Text("**a ")` + `Emphasis(b)` + `Text(" c")`.
- **Bracket-like openers** (`[`, `![`, `{{`, `{`): the whole source from the opener to end of line (or the `##` cut) becomes one verbatim `Text` run — closed constructs inside the dead slice are lost. `[a __b__ c` → `Text("[a __b__ c")`.
- `::` has no closer: without a valid name it emits `Text("::")` and parsing continues.

Degradation to visible literal text is silent — no diagnostics.

| Syntax          | Node | Notes |
|-----------------|------|-------|
| `__text__`      | `Emphasis` | Single `_` = literal |
| `**text**`      | `Strong` | Single `*` = literal |
| `~~text~~`      | `Highlight` | Single `~` = literal |
| `^^text^^`      | `Spoiler` | Single `^` = literal. Variants via `{.nsfw}` etc. |
| \`\`code\`\`    | `CodeInline` | Single \` = literal. Content literal except `` \` `` → \`. |
| `$$formula$$`   | `MathInline` | Single `$` = literal. Content literal. |
| `""text""`      | `QuoteInline(double)` | Single `"` = literal |
| `''text''`      | `QuoteInline(single)` | Single `'` = literal |
| `[text](url)`   | `Link(external)` | |
| `[text][page]`  | `Link(page)` | target has no prefix |
| `[text][#tag]`  | `Link(tag)` | resolved by consumer |
| `[text][^ref]`  | `Link(ref)` | resolved by consumer |
| `[text][@cite]` | `Link(cite)` | resolved by consumer |
| `![alt](src)`   | `ImageInline` | |
| `::name {attrs}` | `Span` | Empty. `::` without name = literal. |
| `{{key}}`       | `Variable` | Key is `ID_LITERAL`. Empty/invalid key → literal text + CDN-0015. Unclosed `{{` → verbatim slice. |
| `## … <EOL>`    | Reflection entry on block | Line comment, runs to EOL. Payload stored in `block.reflection[]`. Single `#` = literal. Literal `##` = `\##`. |
| `\` at line end | `TextBreak` | |

Cross-type nesting allowed (e.g. `**__text__**`). Same-type nesting not allowed (greedy close).

Inside inline context run of 3 (`***`, `___`, `~~~`, `^^^`, ` ``` `, `$$$`, `"""`, `'''`) = 2-delimiter opener + 1 literal. For `###` at inline position: `##` (line comment, runs to EOL) + the trailing `#` becomes the first character of the payload text.

---

## Caption / Attribution

A `^ ` line immediately after a captionable block (no blank line) enriches that block with a `caption` field. No separate AST node is produced.

````
| col A | col B |
^ Table caption text                   →  Table { caption: [...] }

![alt](image.png)
^ Figure caption text                  →  ImageBlock { caption: [...] }

```javascript
code here
```
^ Listing caption                      →  CodeBlock { caption: [...] }

> Quoted text here.
^ Source attribution                   →  QuoteBlock { attribution: [...] }
````

Captionable blocks: `Table`, `ImageBlock`, `CodeBlock`, `MathBlock`, `FileRef`, `FileRefGroup`, `NamedBlock`, `SpoilerBlock`. `QuoteBlock` uses `attribution` instead of `caption`.

- Blank line between block and `^ ` → no binding; `^ ` becomes a `Paragraph` (CDN-0008).
- Second `^ ` line (slot already filled) → `Paragraph` (CDN-0008).
- `{attrs}` on a caption line → literal text (CDN-0009).
- Escape: `\^` at line start suppresses the opener.

---

## Attributes

```
{#id .class key=value key="spaced value"}
```

Attach **after** their target on the same line (or next line, no blank line between). Whitespace between the target and the consumed `{attr}` is stripped — `== Heading  {.x}` → heading text is `"Heading"`, not `"Heading  "`.

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
| `---` page break | `\---`, `-\--`, `--\-` | literal; no page break occurs |
| `/path` file ref | `\/path` | literal |
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

1. Code fence \`\`\` — content always literal
2. Metadata fence `~~~` — content always literal
3. MathBlock `$$$` — content always literal
4. CommentBlock `###` — content always literal (opaque)
5. Inline code \`\` — content literal except `` \` ``
6. Line comment `##` — no closer, runs to EOL; payload stored in block `reflection`; acts as the terminator for open inline constructs, which degrade per their class (§9.4.1)
7. Escape `\x` — resolved before delimiter matching
8. Links `[...](...)` and images `![...](...)` — matched before emphasis runs
9. Inline math `$$` — matched before emphasis; content literal
10. Strong `**`, Emphasis `__`, Highlight `~~`, Spoiler `^^`, QuoteInline `""` `''` — left-to-right greedy
11. Named span `::name` — matched after emphasis
12. Variable `{{key}}` / Attributes `{...}` — longest opener wins (`{{` before `{`), then left-to-right
