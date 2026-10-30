## 5. Inline Segments

Inline content is parsed in source order with no backtracking. When an opener has no valid matching closer before the end of the paragraph (or enclosing block), the opener is emitted as literal text.

The `##` opener (§2.2) is special: it has no closer and terminates at end-of-line. When `##` is encountered with one or more inline constructs open, those unclosed openers degrade to literal per the same rule. The payload is stored as a `LineReflection` on the block that owns the line — it does not appear in the inline stream.

**Inline rules run in:**

| Location | Section |
|----------|---------|
| Heading text | §4      |
| Paragraph content | §4      |
| List item and task item content | §4      |
| Table cell content | §4      |
| `alt` slot of `ImageInline` and `EmbedImageInline` | §5      |
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

Strong emphasis. `**` follows the dominant Markdown-family convention ([COMMONMARK], GFM, Pandoc), where `**` marks strong emphasis.

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

**Syntax:** `[text](target)`. The target selects the link kind.

```
[text](https://example.com)  → external link
[text](mailto:a@example.com) → external link
[text](guide/intro)          → page link
[text](#install)             → id link
[text](^note)                → ref (footnote) link
[text](~writing/blog)        → tag link
[text](@smith2024)           → cite link
[Getting started]()          → wiki link: a page link built from the text
```

**AST type:**

```typescript
interface Link {
  _type: "Link"
  kind: "external" | "page" | "id" | "ref" | "tag" | "cite"
  children: Inline[]
  href: string                       // kind "external"; otherwise ''
  raw: string                        // kind "page": the target as written; otherwise ''
  path: PathResourceLocator | null   // kind "page" with a valid path; otherwise null
  target: string                     // kind "id" | "ref" | "tag" | "cite", without the sigil; otherwise ''
  attributes: Attribute[]
}
```

A link is a **pointer**: the consumer follows it, prints it, or ignores it, and never places the resource it names. So a link accepts every kind of target, where an image, which the consumer fetches and places, accepts only a path or an `https://` URL (§9.2).

- `text` is **parsed by inline rules**. May be empty.
- The target runs from the character after `(` to the first unbalanced `)`, by the path scan of §9.2.1 and §9.2.2: balanced parentheses stay in the target, and a backslash escapes the next character. The kind is chosen once the extent is known.
- Text and target may cross a soft break: the `]` and `)` are searched for through the whole inline context. Inside the target the line break folds under the base-column rule (§12.1), so `[t](/gui` followed by `de)` has the target `/guide`. If no closer comes, the opener degrades as §9.1.4.1 says, and its slice ends at its own line.

**Kind.** The first characters of the target choose the kind:

| Target begins with | Kind | Field |
|---|---|---|
| a `SCHEME`, on one line | `"external"` | `href` |
| `#` (octothorpe) | `"id"` | `target` |
| `^` (caret) | `"ref"` | `target` |
| `~` (tilde) | `"tag"` | `target` |
| `@` (commercial at) | `"cite"` | `target` |
| nothing — the target is empty | `"page"`, a **wiki link** | `raw` (`''`), `path` |
| anything else | `"page"` | `raw`, `path` |

```ebnf
SCHEME      ::= [a-zA-Z] [a-zA-Z0-9+.-]* ":"
ID_TARGET   ::= "#" ID_VALUE
REF_TARGET  ::= "^" ID_NAME
TAG_TARGET  ::= "~" TAG_LEVEL ("/" TAG_LEVEL)*
CITE_TARGET ::= "@" (CHAR - CONTROL)+
```

The first character chooses the kind; the production for that kind then says whether the target is valid (see *Invalid targets* below).

The sigils `#`, `^`, `~`, and `@`, and the colon that ends a scheme, count only when written unescaped: `[x](\#x)` is a page link whose path is `#x`, and `[x](FAQ\:setup)` is a page link whose path is `FAQ:setup`. The scheme test uses no other heuristic: `[x](Intro: draft)` and `[x](C:/notes)` are external links. A scheme split over two lines is not a scheme, so `[t](ht` followed by `tps://x)` is a page link.

- **External:** `href` is the target as written, scheme included. Every scheme counts — `https:`, `http:`, `mailto:`, `tel:`, and any other — and Cutdown neither validates nor filters it. Whether a scheme is safe depends on the consumer: `javascript:` is a hazard in an HTML page and plain text in a printed book. Filtering belongs to the consumer.
- **Page:** the target is a `PathResourceLocator` (§9.2). Spaces and non-ASCII letters are path content: `[x](Guides/Getting started)`. The path is read from the project root and normalized (§9.2.4), then checked (§9.2.5); last, the parser appends `.cutdown` to `path.path` when it does not already end with `.cutdown`. `raw` keeps the target as written. The `fragment` names an id, so it is converted to NFC as an id is (§1.1). `[x](guide/intro#setup)` → `raw: "guide/intro#setup"`, `path: { path: "/guide/intro.cutdown", query: [], fragment: "setup" }`.
- **Wiki:** an empty target makes the link text the target. `path.path` is `/`, then the **plain text** of the link text, then `.cutdown`: `[Getting started]()` → `path: "/Getting started.cutdown"`. The plain text is what a reader sees — the `value` of every `Text` and `CodeInline`, the `formula` of every `MathInline`, `{{key}}` for a `Variable`, and the plain text of the children (or `alt`) of every other inline, in order; delimiters and attributes contribute nothing. The built path is normalized and checked like any other (§9.2.4, §9.2.5), so `/` separates folders and `.` and `..` segments are structure: `[Guides/../FAQ]()` → `/FAQ.cutdown`, and a title that is only `.` or `..` names no page (`[..]()` is invalid). `?` and `#` are title characters, so `query` is `[]` and `fragment` is `''`. `raw` is `''`. A link with empty plain text names nothing, so `[]()` has `path: null` and emits CDN-0032. For a query or a fragment, write the target.
- **Id:** `target` is the text after `#`, an `ID_VALUE` (§1.1) — the same characters an `id` attribute admits, converted to NFC as every id value is. It names the segment carrying that id (`{#id}` or `id=`, §6.1.1) in the current document: `[x](#道具一式)`.
- **Ref:** `target` is the text after `^`, one `ID_NAME` (§1.1). It names the `RefDefinition` with that `ref` (§4.14); the link is a **footnote** reference, and the definition's content is the footnote.
- **Tag:** `target` is the text after `~`: one or more levels separated by `/` (slash), each a `TAG_LEVEL` (§1.1): `[x](~価格/2026 Q1)` → `target: "価格/2026 Q1"`. A tag is a name, not a path: it is never normalized, and a level may not be `.` or `..`.
- **Cite:** `target` is the text after `@`, a `CITE_TARGET`.

In `target`, escapes are resolved: `\)` gives `)`, `\\` gives `\`.

**Empty text.** `[](target)` is valid for every kind and has `children: []`. The consumer displays the target itself — the URL, the path, the id, the tag, the citation key; for a ref, the footnote marker. It is Cutdown's form of a Markdown autolink `<https://…>`.

**Unsupported form `[text][target]`.** Cutdown has one link form. Where the `]` that closes a link's text is followed directly by a second `[`, and that `[` closes on the same line at its first unbalanced `]` (escaped brackets not counted), the two bracket groups are emitted as one literal `Text`, exactly as written, and parsing continues after them. Warning CDN-0036 is emitted. The same holds for `![alt][target]`. A second `[` with no closer on the line leaves the first `[` unresolved, as any `[` with no target (§9.1.4.1).

```
See [docs][guide] and **this**  →  Text("See [docs][guide] and ") + Strong([Text("this")]) — CDN-0036
```

- Cutdown does not resolve links. Whether a target exists is the consumer's concern.
- An `href` longer than 2048 Unicode scalar values is kept in full; warning CDN-0035 is emitted. A page path follows the same limit (§9.2.5).

**Invalid targets.** The parser checks only what it can see in the source:

- An invalid page path (§9.2.5) keeps the `Link` with `raw` as written and `path: null`, and emits warning CDN-0032.
- An id, ref, tag, or cite target that is empty or holds a character its kind does not admit keeps the `Link` with its kind and `target` as written, without the sigil, and emits warning CDN-0033: `[x](#)`, `[x](^a b)`, `[x](~a//b)`, `[x](~a/)`, `[x](~a/../b)`, `[x](@)`.

**Edge cases:**

```
[](target)               → Link { kind: "page", children: [], raw: "target", path: { path: "/target.cutdown", query: [], fragment: "" } }
[__What__ is C#?]()      → Link { kind: "page", raw: "", path: { path: "/What is C#?.cutdown", query: [], fragment: "" } }
[Guides/Setup]()         → Link { kind: "page", raw: "", path: { path: "/Guides/Setup.cutdown", query: [], fragment: "" } }
[]()                     → Link { kind: "page", children: [], raw: "", path: null } — CDN-0032
[](#)        → Link { kind: "id", children: [], target: "" } — CDN-0033
```

#### Link kinds and meaning

**Id links** `[text](#id)` point to one segment of the current document: the one whose `id` attribute is `id`. Ids are local to their document (§17.3).

**Ref links** `[text](^ref)` are footnote references. The `RefDefinition` `[^ref]: …` holds the footnote; a document defines it once, anywhere, and the last definition wins (§4.14). `[](^ref)` is a bare footnote marker, which the consumer numbers.

```
The price is fixed[](^1) until [the review](^review).

[^1]: Until 2027.
[^review]: Scheduled for March.
```

**Tag links** `[text](~tag/path)` link to a **tag or category** of the project the document belongs to. Cutdown does not specify where tags are defined or how they are resolved.

**Cite links** `[text](@cite-id)` link to a bibliography entry or a similar **external reference**, resolved by the consumer's citation logic.

**Page links** `[text](path/to/page)` link to another Cutdown document. A page link only ever refers to a `.cutdown` file: the extension is implied and may be omitted, so `[x](guide/intro)` and `[x](guide/intro.cutdown)` name the same document and carry the same `path.path`, `/guide/intro.cutdown`. A consumer never resolves a page link to a file of any other kind. **Wiki links** `[Page title]()` name a document by its title, from the root, as wikis do. A `#id` fragment names the segment with that `id` in the target document, as an id link does inside it. A trailing `/` is not a folder index; it makes the path invalid (§9.2.5). Every page path is read from the project root (§9.2.4), so `[x](guide/intro)` names the same document from every document of the project, and `[x](../intro)` is invalid.

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
- Whitespace collapsing does NOT apply to `CodeInline`. A soft break inside \`\`...\`\` is folded to zero, and the continuation line's leading whitespace follows the base-column rule. See §12 for full whitespace rules.

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
- Content is **literal** — no inline parsing, and whitespace is kept exactly as written (§12.2). Passed as raw string to the consumer ([KATEX] or equivalent).
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
  raw: string                       // the path as written (§9.2)
  src: PathResourceLocator | null   // null when the path is invalid
  attributes: Attribute[]
}
```

- `alt` is **parsed by inline rules**. Result is `Inline[]`. Full inline syntax in `alt` is a technical possibility rather than a common use case; a consumer may choose to restrict or ignore certain inline features in `alt` (e.g. links, images, formatting) or strip it down to plain text. `alt` may be empty.
- `src` is a `PathResourceLocator` (§9.2), running to the first unbalanced `)`: `![](/shots/run (2).png)` has the path `/shots/run (2).png`. An invalid path keeps the node with `raw` as written and `src: null`, and emits CDN-0032.
- A source beginning with literal `https://` makes the node an `EmbedImageInline` instead (§5.9.1).
- An image names a file the consumer fetches and places (§9.2), so its source is a path that names one. These sources are invalid — `src: null`, CDN-0032 — though the node keeps its type:
  - an empty `path`: `![x]()`, `![x](#a)`, `![x](?a=1)`;
  - a source beginning with an unescaped link sigil — `#`, `^`, `~`, `@` — which is reserved: `![x](~t)`, `![x](@k)`;
  - a source beginning with a URI scheme other than `https://`: `![x](tel:1)`, `![x](data:…)`, `![x](http://…)`.

  An escaped sigil is path content: `![x](\~t.png)` has the path `~t.png`.
- `ImageInline` is the only image construct. An image alone on a line is still inline content: `![a](b)` → `Paragraph([ImageInline(...)])`. A local image that needs a caption or a gallery is written as a `FileBlock` (§4.11).
- **Captions:** `ImageInline` does **not** participate in the caption line (§6.2) — it is not a block.

#### 5.9.1 EmbedImageInline

**Syntax:** `![alt](https://…) {attrs}` — the `ImageInline` syntax with a source beginning with literal, case-sensitive `https://`.

**AST type:**

```typescript
interface EmbedImageInline {
  _type: "EmbedImageInline"
  alt: Inline[]
  url: string
  attributes: Attribute[]
}
```

- `EmbedImageInline` is to `ImageInline` what `EmbedBlock` (§4.9) is to `FileBlock`: a remote resource named by URL rather than a path.
- `url` runs to the first unbalanced `)`, as a path does (§9.2.1), and is kept as written. Cutdown does not decompose, validate, or fetch it, so it is never invalid. `{{key}}` interpolation tokens stay in it (§5.11.1). A `url` longer than 2048 Unicode scalar values is kept in full and emits CDN-0035.
- `alt` and attributes follow `ImageInline`.
- Every other scheme, `http://` included, is read as a path: `![](http://x.com/a.png)` is an `ImageInline` whose path is invalid, with `src: null` and CDN-0032.

```
![logo](https://cdn.example.com/a.png)  →  EmbedImageInline { alt: [Text("logo")], url: "https://cdn.example.com/a.png" }
```

---

### 5.10 Mark

**Syntax:** `::name <content>::` or `::name::`

A named inline container that wraps a range of content as a hook for consumer post-processing. Supports nesting.

**AST type:**

```typescript
interface Mark {
  _type: "Mark"
  name: string        // an ID_NAME
  children: Inline[]  // empty for the `::name::` form
  attributes: Attribute[]
}
```

**Opener.** `::` followed immediately by a name — a **maximal `ID_NAME`** (§1.1). The character after the name decides what happens:

| Next character | Result |
|----------------|--------|
| `::` | empty `Mark`; the construct ends there |
| whitespace or a line end | container opener; content runs to the matching closer |
| anything else | not a `Mark` — emit `Text("::" + name)` and continue parsing |

The name is **required**. `::` not followed by at least one `ID_CHAR` on its own line is emitted as literal `Text("::")`. The whitespace character or line end after the name is the separator and is consumed; further whitespace before the content is consumed by §12.2. A line end always ends the name, so a name never continues on the next line: `::na` followed by `me b::` is a Mark named `na` with the content `me b`.

```ebnf
MARK_OPEN  ::= "::" ID_NAME (WHITESPACE | LINE_TERMINATOR)
MARK_EMPTY ::= "::" ID_NAME "::"
MARK_CLOSE ::= "::"
```

**Closer.** A bare `::`. While scanning content, a `::` is a **nested opener** if it is followed by an `ID_NAME` and then whitespace, a line end, or `::`; otherwise it is the **closer**. A `::` encountered with no `Mark` open is literal text.

- Because the opener (`::name `) is textually distinct from the closer (`::`), `Mark` is **bracket-matched by counting**, not by greedy first-closer. This makes it the only inline construct in the language that permits **same-type nesting** — including nesting a `Mark` of the same name (§9.1.4.1, Class 3).
- Cross-nesting with `Emphasis`, `Strong`, `Highlight`, `Spoiler`, `QuoteInline` and `Link` is allowed in both directions.
- Children are **parsed by inline rules** (see the context table at the head of §5).
- **Maximum nesting depth is 8.** A `Mark` opener at depth 9 or deeper does not open; it degrades to literal `Text("::" + name)` and emits warning CDN-0031.
- An unclosed opener degrades per Class 1 (§9.1.4.1): the opener alone is emitted as `Text` and parsing continues immediately after it. No diagnostic.
- Attributes trail the closer, glued to it as for every other inline node: `::a b::{#x .y}`.
- Whitespace inside the delimiters follows §12, as for any container inline.

**Name lexing.** The name is a maximal `ID_NAME` and is lexed at the opener, before delimiter matching. `_`, `-` and `.` are `ID_CHAR` characters, so they are absorbed into the name; `*`, `^`, `$`, `` ` ``, whitespace and the line end are not, and terminate the name scan. This is a lexical property and is independent of the precedence table (§11):

```
::a__b__::   → Mark { name: "a__b__" }              `_` is an ID_CHAR — the name swallows it, no Emphasis forms
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
::a b::{#x .y}      → Mark { name: "a", children: [Text("b")], attributes: [{ key: "id", value: "x" }, { key: "class", value: ["y"] }] }
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

```ebnf
VARIABLE ::= "{{" ID_NAME "}}"
```

- `key` is an `ID_NAME` (§1.1). No whitespace is allowed between the braces and the key: `{{ key }}` is literal text. A `{{...}}` with invalid key characters is emitted as literal text → warning CDN-0015.
- Unclosed `{{` → literal text. Empty-key `{{}}` → literal text → warning CDN-0015.
- The token never crosses a line end: a `{{` with no `}}` on its own line is unclosed, so `{{ke` followed by `y}}` is the literal text `{{key}}`.
- Variables are only parsed in inline contexts where inline rules are active (not inside code/math/meta blocks).
- Brace tie-break: `{{` is always matched before `{` (longest opener wins).
- May carry trailing attributes: `{{key}} {#id .class}`.

#### 5.11.1 Interpolation tokens in string properties

A variable can also stand inside a string property, where no `Variable` node can live. There the parser leaves `{{key}}` in the string exactly as written, and the consumer substitutes it. Such an occurrence is an **interpolation token**.

- **Interpolated properties:** `Link.href`; the `raw` of every path and the `path`, `query`, and `fragment` decomposed from it; the `path` of a wiki link (§5.5); `EmbedBlock.url`; `EmbedImageInline.url`; attribute string values, including strings inside a JSON value (§6.1.1).
- **Never interpolated:** `CodeBlock`, `CodeInline`, `MathBlock`, `MathInline`, and `Meta` content, comment text, where `{{` is ordinary text in many languages; node names (`NamedBlock.name`, `Mark.name`, `CodeBlock.language`), which are structure.
- A token matches `VARIABLE` (§5.11). Anything else between double braces is not a token and is never substituted.
- A string property holds no line breaks: a target wrapped over several lines is folded first (§12.1), and tokens are read from the folded string. A key split over two lines is therefore whole again for the consumer: `[t](/a/{{ke` followed by `y}}/b)` has `raw: "/a/{{key}}/b"`.
- An interpolated property is a **template**. The parser leaves two escapes in it, unresolved: `\\` and `\{{`. The consumer resolves them in one pass, in order from the start of the string, together with the tokens (§18.4): `\\` → `\`, `\{{` → a literal `{{`, `{{key}}` → the key's value; every other character is copied. A consumer that substitutes nothing still makes this pass, so no escape reaches the reader.

```
/a/\{{x}}     raw "/a/\{{x}}"     →  consumer: "/a/{{x}}"         (escaped token)
/a/\\{{x}}    raw "/a/\\{{x}}"    →  consumer: "/a/\" + value of x  (literal backslash, then a token)
```

- Inside a JSON attribute value the template is the decoded JSON string: `"\\{{x}}"` in JSON decodes to `\{{x}}`, an escaped token.
- The parser emits no diagnostic for a token. Whether a key has a value is the consumer's concern.

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

- `^^` opener and closer. A single `^` is always literal text in inline context. (In a `(^ref)` link target and a `[^ref]:` definition, `^` is the reference sigil per §5.5 / §4.14 — those contexts are delimited and never reach the Spoiler parser.)
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
  - The `\` is the last non-whitespace character on the line. Trailing whitespace, and a trailing `##` comment (which consumes the rest of the line as a comment payload, §2.2), are ignored when making this test.

**Line-ending summary:**

| Line ending | Result                                                             |
|-------------|--------------------------------------------------------------------|
| `word\n`    | Soft break — folded to zero; lines concatenate directly            |
| `word  \n`  | Trailing whitespace dropped — the same as `word\n`                 |
| `word\n word` | Whitespace beyond the base column — one space: `Text("word word")` |
| `word\\n`   | `LineBreak` segment — explicit line break inside the paragraph     |
| `word\n\n`  | Blank line — ends the block; the next line starts a new `Paragraph` |

---

#### Line Comment (`##`) — not an inline segment

**Syntax:** `content ## trailing comment`

Line Comment runs till the end of line (EOL). Payload captured as a `LineReflection` on the node that owns the line, omitted by renderers by default (§2.5).

See §2.2 for the full normative semantics. Summary:

- Recognized at line-start or mid-line; runs to EOL; opaque to all other delimiters.
- Payload stored as a `LineReflection` on the node that owns the line — does not appear in the inline stream.
- A single `#` is always literal (see §13). `###` at inline position → `##` (comment opener) + trailing `#` in payload.
- Not recognized inside `CodeInline`, `MathInline`, or quoted attribute values.
- Escaped with `\##` or `#\#`.

---
