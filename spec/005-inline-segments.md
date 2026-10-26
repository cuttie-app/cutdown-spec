## 5. Inline Segments

Inline content is parsed in source order with no backtracking. When an opener has no valid matching closer before the end of the paragraph (or enclosing block), the opener is emitted as literal text.

The `##` opener (§2.2) is special: it has no closer and terminates at end-of-line. When `##` is encountered with one or more inline constructs open, those unclosed openers degrade to literal per the same rule. The payload is stored as a `Reflection` entry on the enclosing block — it does not appear in the inline stream.

**Inline rules run in:**

| Location | Section |
|----------|---------|
| Heading text | §4      |
| Paragraph content | §4      |
| List item and task item content | §4      |
| Table cell content | §4      |
| `alt` slot of `ImageInline` | §5      |
| `Caption` content | §6      |
| `RefDefinition` content | §4      |
| Children of `Emphasis`, `Strong`, `Highlight`, `QuoteInline`, `Spoiler` | §5      |
| Children of `Mark` | §5      |
| `[text]` slot of `Link` | §5      |

---

### 5.1 Text

**Syntax:** Any sequence of characters not matched by another inline rule.

**AST type:**

```typescript
interface Text {
  _type: "Text"
  value: string
}
```

Consecutive text tokens MUST be merged into a single `Text` segment by the parser.

Text segments are **literal** — no inline parsing, no escape processing. A `\` (backslash) at the end of a line, before the line terminator, produces a `LineBreak` segment (§5.13); every other character in a `Text` segment is literal.

---

### 5.2 Emphasis

**Syntax:** `__inline content__`

**AST type:**

```typescript
interface Emphasis {
  _type: "Emphasis"
  children: Inline[]
  attributes: Attribute[]
}
```

- `__` opener and closer. A single `_` (underscore) is always literal text.
- Run of 3: `___` = `__` (opener/closer) + `_` (literal).
- Matching: greedy, in source order. First valid `__` closer wins.
- Unclosed `__` → `Text("__")`.
- Same-type nesting not allowed. Cross-type nesting allowed (e.g. `__**text**__`).
- Leading/trailing whitespace inside delimiters is stripped. See §12 for full whitespace rules.

**Examples:**

```
__italic__   → Emphasis([Text("italic")])
___text___   → Emphasis([Text("_text")]) + Text("_")
__ text      → Text("__") + Text(" text")   (unclosed)
_ text _     → Text("_ text _")             (single underscore = literal)
```

---

### 5.3 Strong

**Syntax:** `**inline content**`

Strong emphasis. `**` follows the dominant Markdown-family convention (CommonMark, GFM, Pandoc), where `**` marks strong emphasis.

**AST type:**

```typescript
interface Strong {
  _type: "Strong"
  children: Inline[]
  attributes: Attribute[]
}
```

- `**` opener and closer. A single `*` (asterisk) is always literal text.
- Same rules as `Emphasis`: run of 3, greedy, unclosed = literal, no same-type nesting.
- Cross-nesting with `Emphasis` allowed: `**__text__**` and `__**text**__` are both valid.

---

### 5.4 Highlight

**Syntax:** `~~inline content~~`

Marks a span of text as highlighted — visually emphasized as important, like a marker pen. Highlight carries no deletion semantics; Cutdown defines no strikethrough element.

**AST type:**

```typescript
interface Highlight {
  _type: "Highlight"
  children: Inline[]
  attributes: Attribute[]
}
```

- `~~` opener and closer. A single `~` (tilde) is always literal text (not a meta fence in inline context).
- Same rules as `Emphasis`: greedy, unclosed = literal, no same-type nesting.
- Cross-nesting with `Emphasis` and `Strong` allowed.

---

### 5.5 Link

**Syntax:** Several forms depending on link kind.

```
[text](url)          → external link
[text][path/to/page] → page link
[text][#tag/path]    → tag link
[text][^ref-id]      → reference link
[text][@cite-id]     → citation link
```

**AST type:**

```typescript
interface Link {
  _type: "Link"
  kind: "external" | "page" | "tag" | "ref" | "cite"
  children: Inline[]
  href: string                // kind "external"; otherwise ''
  path: PathResourceLocator   // kind "page"; otherwise every part empty
  target: string              // kind "tag" | "ref" | "cite"; otherwise ''
  attributes: Attribute[]
}
```

| Syntax | Kind | Field |
|--------|------|-------|
| `[text](url)` | `"external"` | `href` |
| `[text][path/to/page]` | `"page"` | `path` |
| `[text][#tag/path]` | `"tag"` | `target` |
| `[text][^ref-id]` | `"ref"` | `target` |
| `[text][@cite-id]` | `"cite"` | `target` |

- `text` is **parsed by inline rules**. May be empty.
- An unused locator has every part empty: `{ raw: "", path: "", query: [], fragment: "" }`.
- **Page target:** a `PathResourceLocator` (§1.7), running to the first unbalanced `]`. Spaces and non-ASCII letters are path content: `[x][Guides/Getting started]`.
- **Tag target:** `#` followed by one or more `TAG_LITERAL` levels separated by `/` (§1.2): `[x][#Ціни/2026 Q1]` → `target: "Ціни/2026 Q1"`. The leading `#` is a sigil and is consumed.
- **Ref target:** `^` (caret) + `ID_LITERAL`. **Cite target:** `@` + any characters other than `]` (right bracket).
- Shorthand `[@cite-id]` (no text bracket) is NOT a citation link — emitted as plain bracket text.
- Cutdown does not resolve links. Whether a target exists is the consumer's concern.
- Cutdown does NOT validate URL syntax and URL schema. Consumers may choose to validate or sanitize `href` values.

**Invalid targets.** The parser checks only what it can see in the source:

- An invalid page path (§1.7.5) keeps the `Link` with `path.raw` as written and the other parts empty, and emits warning CDN-0032.
- A tag target with an empty level — `[x][#]`, `[x][#a//b]`, `[x][#a/]` — keeps the `Link` with `target` as written and emits warning CDN-0033. A second `#` cannot occur inside a tag target: `#` is not a `TAG_LITERAL` character, so `[x][#a#b]` is not a tag link at all.

**Edge cases:**

```
[][target]    → Link { kind: "page", children: [], path: { raw: "target", path: "target", query: [], fragment: "" } }
[][]          → Link { kind: "page", children: [], path: { raw: "", path: "", query: [], fragment: "" } }
[]()          → Link { kind: "external", children: [], href: "" }
```

All cases above are valid and preserved. What an empty target refers to is the consumer's decision.

#### Link types and meaning

Ordinary links `[text](url)` are for external URLs. At least `(url)` part should be treated as HTML DOM `<a>` `href` attribute value and validated/sanitized accordingly. Consumers may choose to also validate the `url` against a whitelist of allowed URL schemas (e.g. `http:`, `https:`, `mailto:`) and/or emit a warning for suspicious URLs (e.g. `javascript:`).

Tag links `[text][#tag/path]` are for linking to a **tag or category** within the whole project where document is defined. The `target` field contains the tag name, which consumers can resolve according to their internal tagging logic. Cutdown does not specify where tags are defined or how they are resolved.

Reference links `[text][^ref-id]` are for linking to a **reference** definition elsewhere **in the same document**. There can be two way `ref-id` resolution. Either anywhere in the document the `[^ref-id]: target` syntax is used to define a `RefDefinition` segment with the given `id`, or `id` attribute of any segment matches the `ref-id`.

```
Sample text with a reference to [the API][^api-doc] and [the API table][^api-table].

| Endpoint | Description |
| ...      | ...         | {#api-table}

[^api-doc]: https://example.com/api-doc
```

Citation links `[text][@cite-id]` are for linking to a bibliography entry or similar **external reference**. The `target` field contains the citation ID, which consumers can resolve according to their internal citation logic.

Page links `[text][path/to/page]` link to another Cutdown document. A page link only ever refers to a `.cutdown` file: the extension is implied and may be omitted, so `[x][guide/intro]` and `[x][guide/intro.cutdown]` name the same document. A consumer resolves `path.path` as written when it ends with `.cutdown`, and appends `.cutdown` otherwise; it never resolves a page link to a file of any other kind. A `#id` fragment names a Section `id` in the target document. A trailing `/` is not a folder index; it makes the path invalid (§1.7.5). The base of a relative path is defined in §1.7.4.

---

### 5.6 CodeInline

**Syntax:** '\`\`code\`\`'

**AST type:**

```typescript
interface CodeInline {
  _type: "CodeInline"
  value: string
  attributes: Attribute[]
}
```

- Double backtick only. Single backtick is always literal text.
- Content is **literal** — no inline parsing. **One escape sequence is processed**: `` \` `` → literal `` ` `` (does not close the span). Every other backslash is literal, including `\\` (two literal backslashes) and any other `\X` (per §8 non-special rule). See §8.3.
- Unmatched '\`\`' → `Text("``")`. Single '\`' → `Text("`")`.
- Triple backtick in inline context: \`\`\` = \`\` (opener) + \` (literal inside).
- Whitespace collapsing does NOT apply to `CodeInline`. A soft break inside \`\`...\`\` is folded to zero. See §12 for full whitespace rules.

**Examples:**

````
``code``          → CodeInline { value: "code" }
`not code`        → Text("`") + Text("not code") + Text("`")
```text```        → CodeInline { value: "`text" } + Text("`")
``test
continues``       → CodeInline { value: "testcontinues" }   (soft break → zero)
``\`\`\`x``       → CodeInline { value: "```x" }            (escape lets multi-backtick embed)
``a\\b``           → CodeInline { value: "a\\b" }            (\\ stays as two literal backslashes)
``\n``             → CodeInline { value: "\n" }              (unknown \X stays literal: backslash + n)
````

---

### 5.7 MathInline

**Syntax:** `$$formula$$`

**AST type:**

```typescript
interface MathInline {
  _type: "MathInline"
  formula: string
  attributes: Attribute[]
}
```

- `$$` opener and closer. A single `$` is always literal text.
- Content is **literal** — no inline parsing. Passed as raw string to the consumer (KaTeX or equivalent).
- Run of 3: `$$$` at inline position = `$$` (opener/closer) + `$` (literal).
- Unclosed `$$` → `Text("$$")`. Same-type nesting not allowed.

**Examples:**

```
$$ a^2 + b^2 $$      → MathInline { formula: " a^2 + b^2 " }
$$unclosed            → Text("$$") + Text("unclosed")
$ not math $          → Text("$ not math $")
```

---

### 5.8 QuoteInline

**Syntax:** `"" content ""` or `'' content ''`

**AST type:**

```typescript
interface QuoteInline {
  _type: "QuoteInline"
  kind: "double" | "single"
  children: Inline[]
  attributes: Attribute[]
}
```

- `""` = double-quote style (`kind: "double"`). `''` = single-quote style (`kind: "single"`).
- A single `"` or `'` is always literal text.
- Same-kind nesting not allowed. Cross-kind nesting IS allowed: `""'' inner ''""`.
- Unmatched opener → `Text('""')` or `Text("''")`.
- Whitespace rules follow §12 (boundary whitespace stripped; adjacent boundaries collapsed).

**Examples:**

```
"" hello ""          → QuoteInline { kind: "double", children: [Text("hello")] }
'' hi ''             → QuoteInline { kind: "single", children: [Text("hi")] }
""'' inner ''""      → QuoteInline { kind: "double", children: [QuoteInline { kind: "single", ... }] }
"" unclosed          → Text('""') + Text(" unclosed")
```

---

### 5.9 ImageInline

**Syntax:** `![alt](src) {attrs}`

**AST type:**

```typescript
interface ImageInline {
  _type: "ImageInline"
  alt: Inline[]
  src: PathResourceLocator
  attributes: Attribute[]
}
```

- `alt` is **parsed by inline rules**. Result is `Inline[]`. Despite  the `alt` context allows full inline syntax, it should be treated as technical possibility rather than a common use case. Consumers may choose to restrict or ignore certain inline features in `alt` (e.g. links, images, formatting) or strip it down to plain text. `alt` may be empty.
- `src` is a `PathResourceLocator` (§1.7), running to the first unbalanced `)`: `![](/shots/run (2).png)` has the path `/shots/run (2).png`. A `src` beginning with `https://` is a URL (§1.7.4): `![logo](https://cdn.example.com/a.png)` is decomposed but never invalid. An invalid path keeps the node, empties the locator's parts, and emits CDN-0032. `src` may be empty.
- `![]()` is valid and preserved as `ImageInline { alt: [], src: { raw: "", path: "", query: [], fragment: "" } }`.
- `ImageInline` is the only image construct. An image alone on a line is still inline content: `![a](b)` → `Paragraph([ImageInline(...)])`. A local image that needs a caption or a gallery is written as a `FileBlock` (§4.11).
- **Captions:** `ImageInline` does **not** participate in the caption line (§6.2) — it is not a block.

---

### 5.10 Mark

**Syntax:** `::name <content>::` or `::name::`

A named inline container that wraps a range of content as a hook for consumer post-processing. Supports nesting.

**AST type:**

```typescript
interface Mark {
  _type: "Mark"
  name: string        // non-empty ID_LITERAL run
  children: Inline[]  // empty for the `::name::` form
  attributes: Attribute[]
}
```

**Opener.** `::` followed immediately by a name — a **maximal `ID_LITERAL+` run** (§1.2). The character after the name decides what happens:

| Next character | Result |
|----------------|--------|
| `::` | empty `Mark`; the construct ends there |
| space | container opener; content runs to the matching closer |
| anything else | not a `Mark` — emit `Text("::" + name)` and continue parsing |

The name is **required**. `::` not followed by at least one `ID_LITERAL` character is emitted as literal `Text("::")`. The space after the name is a delimiter and is not part of the content.

**Closer.** A bare `::`. While scanning content, a `::` is a **nested opener** if it is followed by `ID_LITERAL+` and then a space or `::`; otherwise it is the **closer**. A `::` encountered with no `Mark` open is literal text.

- Because the opener (`::name `) is textually distinct from the closer (`::`), `Mark` is **bracket-matched by counting**, not by greedy first-closer. This makes it the only inline construct in the language that permits **same-type nesting** — including nesting a `Mark` of the same name (§9.4.1, Class 3).
- Cross-nesting with `Emphasis`, `Strong`, `Highlight`, `Spoiler`, `QuoteInline` and `Link` is allowed in both directions.
- Children are **parsed by inline rules** (see the context table at the head of §5).
- **Maximum nesting depth is 8.** A `Mark` opener at depth 9 or deeper does not open; it degrades to literal `Text("::" + name)` and emits warning CDN-0031.
- An unclosed opener degrades per Class 1 (§9.4.1): the opener alone is emitted as `Text` and parsing continues immediately after it. No diagnostic.
- Attributes trail the closer, glued to it as for every other inline node: `::a b::{#x .y}`.
- Whitespace inside the delimiters follows §12, as for any container inline.

**Name lexing.** The name is a maximal `ID_LITERAL+` run and is lexed at the opener, before delimiter matching. `_`, `-` and `.` are `ID_LITERAL` characters, so they are absorbed into the name; `*`, `^`, `$`, `` ` `` and space are not, and terminate the name scan. This is a lexical property and is independent of the precedence table (§11):

```
::a__b__::   → Mark { name: "a__b__" }              `_` is ID_LITERAL — the name swallows it, no Emphasis forms
::a**b**::   → Text("::a") + Strong([Text("b")]) + Text("::")   `*` is not — the name ends at `a`, the opener fails
```

**Colon runs.** A run of three colons in inline position is the `::` closer plus a literal `:`. At block position `:::name` is still a `NamedBlock` (§4.13) — that classification happens first and never reaches the inline parser.

**Examples:**

```
::a::               → Mark { name: "a", children: [] }
::a b::             → Mark { name: "a", children: [Text("b")] }
::a ::c::::         → Mark { name: "a", children: [Mark { name: "c", children: [] }] }
::a b ::c d:: e::   → Mark { name: "a", children: [Text("b "), Mark { name: "c", children: [Text("d")] }, Text(" e")] }
::a ::a ::a ::::::  → Mark(a, [Mark(a, [Mark(a, [])])])         same-name nesting is legal

::a::b              → Mark { name: "a" } + Text("b")
::a::b ::           → Mark { name: "a" } + Text("b ::")         closer with nothing open is literal
::a::b ::::         → Mark { name: "a" } + Text("b ::::")
:: ::               → Text(":: ::")                             no name
::a b __c__         → Text("::a b ") + Emphasis([Text("c")])    unclosed opener, Class 1
::a b::{#x .y}      → Mark { name: "a", children: [Text("b")], attributes: {id:"x", class:["y"]} }
```

---

### 5.11 Variable

**Syntax:** `{{key}}`

**AST type:**

```typescript
interface Variable {
  _type: "Variable"
  key: string
  attributes: Attribute[]
}
```

- `key` MUST use `ID_LITERAL` characters: `[a-zA-Z0-9._-]`. A `{{...}}` with invalid key characters is emitted as literal text → warning CDN-0015.
- Unclosed `{{` → literal text. Empty-key `{{}}` → literal text → warning CDN-0015.
- Variables are only parsed in inline contexts where inline rules are active (not inside code/math/meta blocks).
- Brace tie-break: `{{` is always matched before `{` (longest opener wins).
- May carry trailing attributes: `{{key}} {#id .class}`.

---

### 5.12 Spoiler

**Syntax:** `^^inline content^^`

**AST type:**

```typescript
interface Spoiler {
  _type: "Spoiler"
  children: Inline[]
  attributes: Attribute[]
}
```

- `^^` opener and closer. A single `^` is always literal text in inline context. (Inside `[...][^id]` link/definition target slots, `^` retains its reference-marker role per §5.5 / §4.14 — that context is delimited and never reaches the Spoiler parser.)
- Cutdown emits the AST node `Spoiler`; consumers choose the rendering (click-to-reveal, blur, redaction, NSFW mask). Semantic variants are conveyed via attributes (e.g. `{.nsfw}`, `{.redacted}`).
- Same rules as `Emphasis`: run of 3 (`^^^` in inline context = `^^` opener/closer + `^` literal), greedy close in source order, unclosed `^^` → `Text("^^")`, no same-type nesting.
- Cross-nesting with `Emphasis`, `Strong`, `Highlight`, `QuoteInline`, and `Link` is allowed.
- Leading/trailing whitespace inside delimiters is stripped. See §12 for full whitespace rules.

**Examples:**

```
^^hidden^^         → Spoiler([Text("hidden")])
^^^x^^^            → Spoiler([Text("^x")]) + Text("^")
^^ open            → Text("^^") + Text(" open")            (unclosed)
^ not spoiler ^    → Text("^ not spoiler ^")               (single caret = literal)
__^^x^^__          → Emphasis([Spoiler([Text("x")])])      (cross-nesting)
^^a ^^b^^ c^^      → Spoiler([Text("a")]) + Text("b") + Spoiler([Text("c")])   (greedy)
```

---

### 5.13 LineBreak

**Syntax:** `\<EOL>`, backslash as the last character of a line (before `\n`). The construct is the **LineBreaker**; it produces the `LineBreak` node, as `PageBreaker` (§4.10) produces a page boundary.

**AST type:**

```typescript
interface LineBreak {
  _type: "LineBreak"
}
```

A `LineBreak` asserts an author-intended line break **within** a paragraph — the surrounding text stays one block. It is not a paragraph boundary: a blank line ends the block and starts a new `Paragraph`, whereas a `LineBreak` breaks the line and keeps the block.

Cutdown emits the AST node `LineBreak`; consumers choose the rendering (a `<br>`, a newline in plain text, a no-op in a single-line context). See §15 — Cutdown has no canonical rendering.

- The `\` and the following newline are consumed. Inline parsing continues on the next line.
  - The `\` must be the last non-whitespace character on the line. Trailing whitespace, and a trailing `##` comment (which consumes the rest of the line as a reflection entry, §2.2), are ignored when making this test.

**Line-ending summary:**

| Line ending | Result                                                             |
|-------------|--------------------------------------------------------------------|
| `word\n`    | Soft break — folded to zero; lines concatenate directly            |
| `word  \n`  | Trailing space collapsed to single space — `Text("word ")` emitted |
| `word\\n`   | `LineBreak` segment — explicit line break inside the paragraph     |
| `word\n\n`  | Blank line — ends the block; the next line starts a new `Paragraph` |

---

#### Line Comment (`##`) — not an inline segment

**Syntax:** `content ## trailing comment`

Line Comment runs till the end of line (EOL). Payload captured as a `Reflection` on the enclosing block, omitted by renderers by default (§2.5).

See §2.2 for the full normative semantics. Summary:

- Recognized at line-start or mid-line; runs to EOL; opaque to all other delimiters.
- Payload stored as `Reflection` entry on the enclosing block — does not appear in the inline stream.
- A single `#` is always literal (see §10.4.4). `###` at inline position → `##` (comment opener) + trailing `#` in payload.
- Not recognized inside `CodeInline`, `MathInline`, or quoted attribute values.
- Escaped with `\##` or `#\#`.

---
