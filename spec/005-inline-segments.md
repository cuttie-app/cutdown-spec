## 5. Inline Segments

Inline content is parsed left-to-right with no backtracking. When an opener has no valid matching closer before the end of the paragraph (or enclosing block), the opener is emitted as literal text.

**Inline rules run in:**

| Location | Section |
|----------|---------|
| Heading text | §3 |
| Paragraph content | §4 |
| List item and task item content | §4 |
| Table cell content | §4 |
| `ImageBlock` `alt` | §4 |
| `RefDefinition` content | §4 |
| Children of `Emphasis`, `Strong`, `Strikethrough`, `QuoteInline` | §5 |
| `[text]` slot of `Link` | §5 |
| `alt` slot of `ImageInline` | §5 |

---

### Text

Any sequence of characters not matched by another inline rule.

**AST type:**

```typescript
interface Text {
  type: "Text"
  value: string
}
```

Consecutive text tokens MUST be merged into a single `Text` node by the parser.

---

### Emphasis

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

### Strong

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

### Strikethrough

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

### CodeInline

**Syntax:** ` ``code`` `

**AST type:**

```typescript
interface CodeInline {
  type: "CodeInline"
  value: string
  attributes: Attribute[]
}
```

- Double backtick only. Single backtick is always literal text.
- Content is **literal** — no inline parsing, no escape processing.
- Unmatched ` `` ` → `Text("``")`. Single `` ` `` → `Text("`")`.
- Triple backtick in inline context: ` ``` ` = ` `` ` (opener) + `` ` `` (literal inside).
- Whitespace collapsing does NOT apply to `CodeInline`. A soft break inside ` ``...`` ` is folded to zero.

**Examples:**

```
``code``          → CodeInline { value: "code" }
`not code`        → Text("`") + Text("not code") + Text("`")
```text```        → CodeInline { value: "`text" }
``test
continues``       → CodeInline { value: "testcontinues" }   (soft break → zero)
```

---

### TextBreak

**Syntax:** `\` as the last character of a line (before `\n`).

**AST type:**

```typescript
interface TextBreak {
  type: "TextBreak"
}
```

- The `\` and the following newline are consumed. Inline parsing continues on the next line.
- `\` must be the last non-whitespace character on the line (trailing spaces stripped before this check).

**Line-ending summary:**

| Line ending | Result |
|---|---|
| `word\n` | Soft break — folded to zero; lines concatenate directly |
| `word \n` | Trailing space preserved — `Text("word ")` emitted |
| `word\\n` | `TextBreak` node — explicit rendered line break |

---

### Link

**Syntax:** Several forms depending on link kind.

**AST type:**

```typescript
interface Link {
  type: "Link"
  kind: "external" | "page" | "tag" | "ref" | "cite"
  children: Inline[]
  href: string | null    // for kind: "external"
  target: string | null  // for kind: "page" | "tag" | "ref" | "cite"
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

**Edge cases:**

```
[][target]    → Link { kind: "page", children: [], target: "target" }
[][]          → Link { kind: "page", children: [], target: "" }
[]()          → Link { kind: "external", children: [], href: "" }
```

---

### ImageInline

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

### Span

**Syntax:** `::name {attrs}`

An empty inline placeholder/hook for consumer post-processing.

**AST type:**

```typescript
interface Span {
  type: "Span"
  name: string
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

### MathInline

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

### Variable

**Syntax:** `{{key}}`

**AST type:**

```typescript
interface Variable {
  type: "Variable"
  key: string
  attributes: Attribute[]
}
```

- `key` MUST use `ID_LITERAL` characters: `[a-zA-Z0-9._-]`. A `{{...}}` with invalid key characters is emitted as literal text.
- Unclosed `{{` → literal text. Empty-key `{{}}` → literal text.
- Variables are only parsed in inline contexts where inline rules are active (not inside code/math/meta blocks).
- Brace tie-break: `{{` is always matched before `{` (longest opener wins).
- May carry trailing attributes: `{{key}} {#id .class}`.

---

### QuoteInline

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
