## 5. Inline Segments

Inline content is parsed left-to-right with no backtracking. When an opener has no valid matching closer before the end of the paragraph (or enclosing block), the opener is emitted as literal text.

The `##` opener (CommentInline, §5.14) is special: it has no closer and terminates at end-of-line. When `##` is encountered with one or more inline constructs open, those unclosed openers degrade to literal per the same rule.

**Inline rules run in:**

| Location | Section |
|----------|---------|
| Heading text | §4      |
| Paragraph content | §4      |
| List item and task item content | §4      |
| Table cell content | §4      |
| `alt` slot of `ImageBlock` | §4      |
| `alt` slot of `ImageInline` | §5      |
| `RefDefinition` content | §4      |
| Children of `Emphasis`, `Strong`, `Strikethrough`, `QuoteInline` | §5      |
| `[text]` slot of `Link` | §5      |

---

### 5.1 Text

Any sequence of characters not matched by another inline rule.

**AST type:**

```typescript
interface Text {
  type: "Text"
  value: string
}
```

Consecutive text tokens MUST be merged into a single `Text` segment by the parser.

Text segments are **literal** — no inline parsing, no escape processing. The only exception is that a `\` at the end of a line (before `\n`) produces a `TextBreak` segment (§5.13) instead of literal text.

---

### 5.2 Emphasis

**Syntax:** `**inline content**`

**AST type:**

```typescript
interface Emphasis {
  type: "Emphasis"
  children: Inline[]
  attributes: Attribute[]
}
```

- `**` opener and closer. A single `*` is always literal text.
- Run of 3: `***` = `**` (opener/closer) + `*` (literal).
- Matching: greedy left-to-right. First valid `**` closer wins.
- Unclosed `**` → `Text("**")`.
- Same-type nesting not allowed. Cross-type nesting allowed (e.g. `**__text__**`).
- Leading/trailing whitespace inside delimiters is stripped. See §12 for full whitespace rules.

**Examples:**

```
**bold**     → Emphasis([Text("bold")])
***text***   → Emphasis([Text("*text")]) + Text("*")
** text      → Text("**") + Text(" text")   (unclosed)
* text *     → Text("* text *")             (single asterisk = literal)
```

---

### 5.3 Strong

**Syntax:** `__inline content__`

**AST type:**

```typescript
interface Strong {
  type: "Strong"
  children: Inline[]
  attributes: Attribute[]
}
```

- `__` opener and closer. A single `_` is always literal text.
- Same rules as `Emphasis`: run of 3, greedy, unclosed = literal, no same-type nesting.
- Cross-nesting with `Emphasis` allowed: `**__text__**` and `__**text**__` are both valid.

---

### 5.4 Strikethrough

**Syntax:** `~~inline content~~`

**AST type:**

```typescript
interface Strikethrough {
  type: "Strikethrough"
  children: Inline[]
  attributes: Attribute[]
}
```

- `~~` opener and closer. A single `~` is always literal text (not a metadata fence in inline context).
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
  type: "Link"
  kind: "external" | "page" | "tag" | "ref" | "cite"
  children: Inline[]
  href: string            // for kind: "external", otherwise empty string
  target: string          // for kind: "page" | "tag" | "ref" | "cite", otherwise empty string
  attributes: Attribute[]
}
```

| Syntax | Kind | Field |
|--------|------|-------|
| `[text](url)` | `"external"` | `href` |
| `[text][path/to/page]` | `"page"` | `target` |
| `[text][#tag/path]` | `"tag"` | `target` |
| `[text][^ref-id]` | `"ref"` | `target` |
| `[text][@cite-id]` | `"cite"` | `target` |

- `text` is **parsed by inline rules**. May be empty.
- `href` / `target` may be empty strings — both are valid and preserved.
- Page target uses `PATH_LITERAL` characters. Tag target: `#` + `PATH_LITERAL`. Ref target: `^` + `ID_LITERAL`. Cite target: `@` + any non-`]` characters.
- Shorthand `[@cite-id]` (no text bracket) is NOT a citation link — emitted as plain bracket text.
- Cutdown does not validate link resolution. That is the consumer's responsibility.
- Cutdown does NOT validate URL syntax and URL schema. Consumers may choose to validate or sanitize `href` values.

**Edge cases:**

```
[][target]    → Link { kind: "page", children: [], target: "target" }
[][]          → Link { kind: "page", children: [], target: "" }
[]()          → Link { kind: "external", children: [], href: "" }
```

All cases above are valid and preserved. Consumers may choose to warn about empty targets or hrefs.

---

### 5.6 CodeInline

**Syntax:** '\`\`code\`\`'

**AST type:**

```typescript
interface CodeInline {
  type: "CodeInline"
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
```text```        → CodeInline { value: "`text" }
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
  type: "MathInline"
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
  type: "QuoteInline"
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
  type: "ImageInline"
  alt: Inline[]
  src: string
  attributes: Attribute[]
}
```

- `alt` is **parsed by inline rules**. May be empty.
- `src` may be empty — `![]()` is valid and preserved.
- For block-level image references, see `ImageBlock` (§4).

---

### 5.10 Span (NamedInline segment)

**Syntax:** `::name {attrs}`

An empty inline placeholder/hook for consumer post-processing.

**AST type:**

```typescript
interface Span {
  type: "Span"
  name: string  // non-empty string
  children: []  // always empty
  attributes: Attribute[]
}
```

- `::` followed immediately by a span name (`[ID_LITERAL]+`), then optional attributes.
- Always empty — no children.
- `::` without a valid name is emitted as literal `Text("::")`.

**Example:**

```
Hello ::marker {#here .highlight} world
→ Text("Hello ") + Span { name: "marker", attributes: {id:"here", class:["highlight"]} } + Text(" world")
```

---

### 5.11 Variable

**Syntax:** `{{key}}`

**AST type:**

```typescript
interface Variable {
  type: "Variable"
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
  type: "Spoiler"
  children: Inline[]
  attributes: Attribute[]
}
```

- `^^` opener and closer. A single `^` is always literal text in inline context. (Inside `[...][^id]` link/definition target slots, `^` retains its reference-marker role per §5.5 / §4.14 — that context is delimited and never reaches the Spoiler parser.)
- Cutdown emits the AST node `Spoiler`; consumers choose the rendering (click-to-reveal, blur, redaction, NSFW mask). Semantic variants are conveyed via attributes (e.g. `{.nsfw}`, `{.redacted}`).
- Same rules as `Emphasis`: run of 3 (`^^^` in inline context = `^^` opener/closer + `^` literal), greedy left-to-right close, unclosed `^^` → `Text("^^")`, no same-type nesting.
- Cross-nesting with `Emphasis`, `Strong`, `Strikethrough`, `QuoteInline`, and `Link` is allowed.
- Leading/trailing whitespace inside delimiters is stripped. See §12 for full whitespace rules.

**Examples:**

```
^^hidden^^         → Spoiler([Text("hidden")])
^^^x^^^            → Spoiler([Text("^x")]) + Text("^^")
^^ open            → Text("^^") + Text(" open")            (unclosed)
^ not spoiler ^    → Text("^ not spoiler ^")               (single caret = literal)
**^^x^^**          → Emphasis([Spoiler([Text("x")])])      (cross-nesting)
^^a ^^b^^ c^^      → Spoiler([Text("a")]) + Text("b") + Spoiler([Text("c")])   (greedy)
```

---

### 5.13 TextBreak

**Syntax:** `\<EOL>`, backslash as the last character of a line (before `\n`).

**AST type:**

```typescript
interface TextBreak {
  type: "TextBreak"
}
```

- The `\` and the following newline are consumed. Inline parsing continues on the next line.
  - The `\` must be the last non-whitespace character on the line, unless rest of the line is whitespaces followed by a `##` CommentInline (which consumes the rest of the line). See §5.14.

**Line-ending summary:**

| Line ending | Result                                                             |
|-------------|--------------------------------------------------------------------|
| `word\n`    | Soft break — folded to zero; lines concatenate directly            |
| `word  \n`  | Trailing space collapsed to single space — `Text("word ")` emitted |
| `word\\n`   | `TextBreak` segment — explicit rendered line break                 |

---

### 5.14 CommentInline

**Syntax:** `## inline-content <EOL>` — runs to end of line. See §2.2 for the full normative semantics; this section restates the inline surface.

**AST type:**

```typescript
interface CommentInline {
  type: "CommentInline"
  text: string  // content after the leading `##`, up to but not including the LF
}
```

- `##` is recognized **anywhere** on a line — at line start AND mid-line. There is no closer; the construct terminates at the next `\n`.
- **Opaque to all other delimiters.** Once `##` is recognized, the parser consumes characters to `\n` blindly. It does NOT honour link-text `]`, attribute `}`, or any other inline construct's closer. An unclosed opener before the `##` degrades to literal per §9.4.
- CommentInline boundaries are detected during Phase 2 preprocessing (§9.2), not by the inline parser at the moment it scans across content. This means an `##` on a line is recognized even if the surrounding line would otherwise fail block classification — block classification operates on the pre-`##` substring of each line. See §2.2 for the architectural rationale and examples.
- A single `#` is always literal text (see §10.4.4). Run of 3 `###` at **inline position** parses as `##` (CommentInline opener) + the trailing `#` becomes part of the comment text.
- `##` is **not** recognized inside opaque inline contexts: `CodeInline`, `MathInline`, and quoted attribute values. In those, `##` is literal verbatim.
- Literal `##` in normal text is written `\##` or `#\#` (§8).
- CommentInline does NOT carry `attributes`.
- Default render policy is **hidden**: conforming renderers SHOULD omit it. See §2.5.
- CommentInline is **transparent to attribute resolution**: a trailing `## comment` does not prevent preceding `{attrs}` from claiming their scope-chain slot. See §2.6.

**Examples:**

```
## a whole-line comment    → CommentInline { text: " a whole-line comment" }
foo ## tail                → Text("foo ") + CommentInline { text: " tail" }
**bold ## tail             → Text("**bold ") + CommentInline { text: " tail" }
``code ## not``            → CodeInline { value: "code ## not" }
\## foo                    → Text("## foo")
### at inline              → CommentInline { text: "# at inline" }
```

---
