# Cutdown Syntax — Quick Reference

Cutdown is a markup language that produces an AST. There is no HTML output. The parser never backtracks.

---

## Input

- UTF-8 only. NFC normalization recommended.
- BOM stripped. Null bytes replaced with U+FFFD.
- Line endings normalized to `\n`. Tabs → single space (except inside fences).
- HTML entities (`&amp;` etc.) are **not** decoded — emitted as literal text.

`ID_LITERAL = [a-zA-Z0-9._-]` — used for all identifier tokens (block names, span names, language tags, reference IDs). ASCII-only, case-sensitive everywhere.

---

## Comments

Cutdown has two comment constructs. Both are AST citizens (`CommentInline`, `CommentBlock`) and hidden by renderers by default.

| Form | Node | Notes |
|------|------|-------|
| `#` | literal text | Single `#` does nothing — written exactly as typed. |
| `## … <EOL>` | `CommentInline` | Line comment. Recognized at line-start AND mid-line. Runs to end-of-line. Literal inside ` `` `, `$$`, and quoted attribute values. |
| `### … ###` | `CommentBlock` | Block comment. Bare `###` opener, bare `###` closer at same column. Opaque content (no parsing). No `[name]`, no `{attrs}`. |

```
# literal hash, not a comment
## line comment
foo bar ## tail comment

###
opaque block — any content captured raw
###
```

Literal `##` in normal text: `\##` or `#\#`. Unclosed `###` → warning CDN-0006.

**Opaque to other delimiters.** `##` consumes to `\n`, swallowing any `]`, `}`, `|`, or other closer in its path. An unclosed inline opener before `##` degrades to literal. Example: `[text ## here](url)` → `Text("[text ") + CommentInline(" here](url)")`.

**Transparent to attribute resolution.** A trailing `## comment` does NOT prevent preceding `{attrs}` from claiming their scope-chain slot. `= Heading {.c} ## note` → `Section({class:"c"}, ...)` with CommentInline appended. No "orphan-due-to-comment" rule.

**Table rows.** A trailing `## comment` after a row's content is attached to `Row.comments[]`, not to any cell. A `## comment` on the delimiter row is attached to the preceding header `Row.comments[]` (after the header's own trailing comment, if any). `{attrs}` on the delimiter row are dropped → CDN-0007.

---

## Document Model

Each Cutdown file produces a `Document` with `Pages`. So it has at least one Page, even if empty. Pages contain blocks and inline elements. ThematicBreaks `---` on top level and Meta fence `~~~` produces Pages' breaks.

```
Document
└── Page[]
    ├── meta: Meta | null
    └── children: (ThematicBreak | Section | Block)[]
```

- Every document has ≥ 1 Page.
- `---` → new Page (ThematicBreak is first child of new Page).
- `Meta` block → fills current `Page.meta`; if already set, opens new Page first.
- Empty Page (`meta: null`, `children: []`) = Ghost Page (valid).

---

## Block Elements

Blocks are separated by **blank lines**. Block elements cannot interrupt a paragraph.

### Paragraph

Any non-blank lines not matching another block. Single newline → space (soft break). `\` at line end → `TextBreak`.

### Headings → `Section`

```
= Level 1
== Level 2
=== Level 3        (up to =========  level 9)
```

Must be preceded by a blank line (or start of document). Inline content allowed. Sections are scoped to their containing block context (NamedBlock, QuoteBlock, ListItem).


### Thematic Break → `ThematicBreak` + new Page

```
---
--- {.attrs}
```

Three or more `-`. Creates a page break on top level. Exist as ThematicBreak node only if declared inside Block elements. ThematicBreak indide other Blcoks is a normal block-level element (not a page break).

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

Every line must start with `>`. No lazy continuation. Nesting by counting `>` chars.

### Lists → `List` / `ListItem` / `TaskItem`

```
- unordered item          (marker: '- ')
  - nested (2-space indent per level)

1. ordered item           (marker: '{n}. ')
2. second item

- [ ] task item           (marker: '- [{x / X / space}] ')
  - [x] nest task item    ({ checked: true})
```

Only `-` for unordered; only `{number}.` delimiter for ordered. Actual numbers ignored. 2-space indent per nesting level (aligns with YAML convention). Tight vs loose: blank line between items → `loose: true`. Respects indentation.

### Tables → `Table`

```
| Cell A | Cell B |          ← simple table (no header)

| Name   | Score |           ← GFM table (has header)
|:-------|------:|
| Alice  |    42 |
```

Delimiter alignment: `:---` left, `---:` right, `:---:` center, `---,` comma, `---.` decimal. Leading/trailing `|` required.

### File Reference → `FileRef`

```
/path/to/file.ext {attrs}
/path/to/image.png
```

Line starting with `/`. Known groups (image/video/audio) auto-wrapped in `FileRefGroup`. Fragment: `/page.md#section-id`.

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

`:::` + name required. Closing `:::` alone. Unclosed → warning CDN-0004. First content line establishes base indent (stripped from all lines).

### Spoiler Block → `SpoilerBlock`

```
^^^ {attrs}
  content (any blocks, including nested ^^^ and :::)
^^^
```

Fixed 3-caret fence. Content is **parsed as blocks** (the only XXX-fence with non-literal body — code/meta/math are literal; spoiler hides meaning, not structure). Closing `^^^` alone. Unclosed → warning CDN-0005. First content line establishes base indent. Semantic variants via attributes (`{.nsfw}`, `{.redacted}`, etc.).

### Reference Definition → `RefDefinition`

```
[^ref-id]: inline content
```

Must start at line start. Last definition wins (supports transclusion override).

---

## Inline Elements

Parsed left-to-right, no backtracking. Unclosed opener → emitted as literal text.

| Syntax          | Node | Notes |
|-----------------|------|-------|
| `**text**`      | `Emphasis` | Single `*` = literal |
| `__text__`      | `Strong` | Single `_` = literal |
| `~~text~~`      | `Strikethrough` | Single `~` = literal |
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
| `{{key}}`       | `Variable` | `{{}}` invalid = literal |
| `## … <EOL>`    | `CommentInline` | Line comment, runs to EOL. Single `#` = literal. Literal `##` = `\##`. |
| `\` at line end | `TextBreak` | |

Cross-type nesting allowed (e.g. `**__text__**`). Same-type nesting not allowed (greedy close).

Inside inline context run of 3 (`***`, `___`, `~~~`, `^^^`, ` ``` `, `$$$`, `"""`, `'''`) = 2-delimiter opener + 1 literal. For `###` at inline position: `##` (CommentInline opener, runs to EOL) + the trailing `#` becomes the first character of the comment text.

---

## Attributes

```
{#id .class key=value key="spaced value"}
```

Attach **after** their target on the same line (or next line, no blank line between).

**Block opening lines (headings, named blocks):** last `{...}` on the line → claimed by the block. Earlier `{...}` attach to preceding inline elements. Empty `{}` as last token = no attrs on block.

**Scope-chain (Rule B):** trailing `{...}` sequence at end of inline context distributed right-to-left through the node hierarchy. Last `{}` → outermost container; preceding `{}` → next inner level. Excess front `{}` silently dropped (warning CDN-0011).

```
- item {.a}{.b}   →  List({.b}, ListItem({.a}, Text("item")))
| td | {.a}{.b}   →  Table({.b}, Row({.a}, ...))     ← last row only
| td | {.a}       →  Table({.a}, Row(...))           ← mid-table: 1 slot (Row only)
```

`{{` always matched before `{` (longest opener wins).

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
| `---` thematic break | `\---`, `-\--`, `--\-` | literal **+ suppresses page break** |
| `/path` file ref | `\/path` | literal |
| `` ``` `` code fence | `` \``` ``, etc. | literal (residual backticks still parse inline) |
| `~~~` meta | `\~~~`, `~\~~`, `~~\~` | literal |
| `$$$` math | `\$$$`, `$\$$`, `$$\$` | literal |
| `###` comment block | `\###`, `#\##`, `##\#` | literal |
| `:::name` named block | `\:::name`, etc. | literal — **no CDN-0013** |
| `^^^` spoiler | `\^^^`, etc. | literal |

`##` CommentInline (mid-line) uses `\##` or `#\#` per §5.14.

### Opaque-block closer escape

Narrow per-block escape; all other `\X` inside opaque content is literal.

| Block | Escape | Notes |
|---|---|---|
| CodeInline / CodeBlock | `` \` `` | three backticks in row → `` \`\`\` `` |
| Meta | `\~` | any one of three closer chars |
| CommentBlock | `\#` | always escapes `#`, no run-length check |
| MathBlock | — | **no escape** (LaTeX owns `\`); literal `$$$` line unsupported |
| CommentInline | — | content fully verbatim; LF closes |

NamedBlock and SpoilerBlock are not opaque — use block-opener escape on a content line.

---

## Precedence (inline, highest first)

1. Code fence \`\`\`, Meta fence `~~~`, Math fence `$$$`, CommentBlock fence `###` — content always literal
2. Inline code \`\` — content literal except `` \` `` (see §5.6); Inline math `$$` — content literal
3. CommentInline `##` — no closer, runs to EOL, closes any open inline constructs (they degrade to literal)
4. Escape `\x`
5. `{{variable}}` / `{attrs}` — longest opener (`{{` before `{`)
6. Links `[...](...)`  and images `![...]()`
7. Emphasis `**`, Strong `__`, Strikethrough `~~`, Spoiler `^^`, QuoteInline `""` `''`
8. `::span`
