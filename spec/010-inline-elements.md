## 10. Inline Elements

Inline content is parsed left-to-right with no backtracking. When an opener has no valid matching closer before the end of the paragraph (or enclosing block), the opener is emitted as literal text.

### 10.1 Text

Any sequence of characters not matched by another inline rule is a `Text` node.

```
AST: Text { value: string }
```

Consecutive text tokens MUST be merged by the parser into a single `Text` node.

---

### 10.2 Emphasis

**Syntax:** `**inline content**`

- `**` is the opener; `**` is the closer.
- A single `*` is literal text and never an emphasis marker.
- Run of 3: `***` = `**` (opener/closer) + `*` (literal). The third character is discarded as a marker.
- Matching: greedy left-to-right. First valid `**` closer wins.
- Unclosed `**`: emitted as `Text("**")`.
- Same-type nesting: MUST NOT be used. `**a **b** c**` → the first `**` is the opener, the second `**` closes it. The remaining `c**` is `Text("c")` + `Text("**")`.
- Cross-type nesting: allowed (see §10.3).

```
AST: Emphasis { children: Inline[], attributes: Attributes }
```

> **Whitespace at boundaries:** Leading and trailing whitespace inside delimiters is stripped. Adjacent opening delimiters (nesting context) have whitespace between them collapsed to zero. See §12.2 for the full inline whitespace rules.

**Examples:**

```
**bold** → Emphasis([Text("bold")])
***text*** → Emphasis([Text("*text")]) + Text("*")
** text → Text("**") + Text(" text")   (unclosed)
* text * → Text("* text *")            (single asterisk = literal)
```

---

### 10.3 Strong

**Syntax:** `__inline content__`

- `__` is the opener; `__` is the closer.
- A single `_` is literal text and never a strong marker.
- Same rules as Emphasis (§10.2): run of 3, greedy, unclosed = literal, no same-type nesting.
- Cross-nesting with Emphasis is allowed: `**__text__**` and `__**text**__` are both valid.

```
AST: Strong { children: Inline[], attributes: Attributes }
```

> **Whitespace at boundaries:** Leading and trailing whitespace inside delimiters is stripped. Adjacent opening delimiters (nesting context) have whitespace between them collapsed to zero. See §12.2 for the full inline whitespace rules.

---

### 10.4 Strikethrough

**Syntax:** `~~inline content~~`

- `~~` is the opener; `~~` is the closer.
- A single `~` is literal text (and not a metadata fence marker in inline context).
- Same rules as Emphasis (§10.2): greedy, unclosed = literal, no same-type nesting.
- Cross-nesting with Emphasis and Strong is allowed.

```
AST: Strikethrough { children: Inline[], attributes: Attributes }
```

> **Whitespace at boundaries:** Leading and trailing whitespace inside delimiters is stripped. Adjacent opening delimiters (nesting context) have whitespace between them collapsed to zero. See §12.2 for the full inline whitespace rules.

---

### 10.5 Inline Code

**Syntax:**  \`\` \`code\` \`\` 

- Double backtick only. Single backtick is literal text.
- Content is literal — no inline parsing, no escape processing, no whitespace collapsing inside.
- A soft break (single `\n`) spanning two lines of a paragraph inside \`\` is folded to zero — the newline is removed with no replacement in `value`. `CodeInline` is an inline element; multi-line code belongs in `CodeBlock` (§9.4).
- Unmatched \`\`: emitted as `Text("``")`.
- Single backtick `` ` `` is always literal text: `Text("`")`.
- Triple backtick \`\`\` in inline context: parsed as \`\` (opener) + \` (literal inside).

```
Input:  ``code``
AST:    CodeInline { value: "code" }

Input:  `not code`
AST:    Text("`") + Text("not code") + Text("`")

Input:  ```text```
AST:    CodeInline { value: "`text" }

Input:  ``test
        continues``
AST:    CodeInline { value: "testcontinues" }   (soft break → zero)
```

```
AST: CodeInline { value: string, attributes: Attributes }
```

---

### 10.6 Text Break

**Syntax:** `\` as the last character of a line (before `\n`).

- The `\` and the following newline are consumed.
- Inline parsing continues on the next line.
- `\` must be the last non-whitespace character on the line (trailing spaces are stripped before this check).

```
AST: TextBreak
```

**Line-ending summary:**

| Line ending | Result |
|---|---|
| `word\n` | Soft break — folded to zero; `word` concatenated directly to next line |
| `word \n` | Trailing space preserved — `Text("word ")` emitted; explicit word boundary |
| `word\\n` | `TextBreak` node — explicit rendered line break |

The trailing-space model applies uniformly inside inline blocks (Emphasis, Strong, QuoteInline, etc.) as well as in plain paragraph text.

---

### 10.7 Links

#### Inline Link

**Syntax:** `[text](url){attrs}`

- `text`: inline content (may be empty).
- `url`: URL string (may be empty).
- `{attrs}`: optional attributes (§5), immediately after `)`.
- Both `[text]()` and `[]()` are valid and kept in the AST.

```
AST: Link { kind: "external", children: Inline[], href: string, attributes: Attributes }
```

#### Special Links

**Page link:** `[text][path/to/page]`

```
AST: Link { kind: "page", children: Inline[], target: string, attributes: Attributes }
```

**Tag link:** `[text][#tag/path]`

```
AST: Link { kind: "tag", children: Inline[], target: string, attributes: Attributes }
```

**Reference link:** `[text][^ref-id]`

```
AST: Link { kind: "ref", children: Inline[], target: string, attributes: Attributes }
```

**Citation link:** `[text][@cite-id]`

```
AST: Link { kind: "cite", children: Inline[], target: string, attributes: Attributes }
```

The empty-text form `[][@cite-id]` is valid and preserved in the AST.

For citation links, Cutdown does not enforce a lexical pattern for the target text after `@`. If the bracket form is valid and the second bracket content starts with `@`, the parser emits `Link { kind: "cite" }`.

Inside the second bracket target of a special link (`[text][...]`), a leading `@` is reserved for citation-link classification. Mention parsing does not run in that target slot.

The shorthand form `[@cite-id]` is not a citation link in Cutdown. It is parsed by normal inline rules and is not emitted as `Link { kind: "cite" }`.

Cutdown does NOT validate that a matching `[^ref-id]:` definition exists. That is the consumer's responsibility.

Cutdown does NOT validate `@cite-id`. Citation resolution is the consumer's responsibility (for example, against an external bibliography source).

Special links may carry attributes: `[text][#tag] {.highlight}`.

#### RefLink edge cases

**Empty text, non-empty target:** `[][target]` is valid — `Link { kind: "page", children: [], target: "target" }`.

**Both brackets empty:** `[][]` → `Text("[][]")` — literal.

**Empty href:** `[]()` → `Link { kind: "external", children: [], href: "" }` — valid. Empty href is a meaningful value.

**Unclassified second bracket:** `[text][target]` where `target` does not begin with `#`, `^`, or `@` is treated as `Link { kind: "page", target: string }` — no URL validation applied.

---

### 10.8 Inline Image

**Syntax:** `![alt](src){attrs}`

- `alt`: inline content (may be empty).
- `src`: URL or path (may be empty).
- `{attrs}`: optional attributes.
- `![]()` is valid and kept in the AST.

```
AST: ImageInline { alt: Inline[], src: string, attributes: Attributes }
```

Note: For block-level image references, see §9.9 (ImageBlock).

---

### 10.9 Named Span

**Syntax:** `::name {attrs}`

- `::` followed immediately by a span name (`[ID_LITERAL]+`, see §1), then optional attributes.
- The span is always empty (no children).
- Serves as a placeholder/hook for consumer post-processing.
- `::` without a valid name is emitted as literal `Text("::")`.
- Orphan `{attrs}` with no preceding inline element are silently dropped (see §5.3).

```
AST: Span { name: string, attributes: Attributes, children: [] }
```

**Example:**

```
Hello ::marker {#here .highlight} world
→ Text("Hello ") + Span(name="marker", {id:"here", class:"highlight"}) + Text(" world")
```

---

### 10.10 Inline Math Formula

**Syntax:** `$$formula$$`

- `$$` is the opener; `$$` is the closer.
- A single `$` is literal text and never a math marker.
- Content is **literal** — no inline parsing. Passed as raw string to the consumer (KaTeX or equivalent).
- Run of 3: `$$$` at inline position = `$$` (opener/closer) + `$` (literal). The third character is discarded as a marker.
- Matching: greedy left-to-right. First valid `$$` closer wins.
- Unclosed `$$`: emitted as `Text("$$")`.
- Same-type nesting: NOT allowed.
- Attributes: may trail the closing `$$` using standard syntax (§5).

```
AST: MathInline { formula: string, attributes: Attributes }
```

**Examples:**

```
$$ a^2 + b^2 $$           → MathInline { formula: " a^2 + b^2 " }
$$ formula $$ now text.   → MathInline { formula: " formula " } + Text(" now text.")
$$unclosed                 → Text("$$") + Text("unclosed")
$ not math $               → Text("$ not math $")
```

---

### 10.11 Variable

**Syntax:** `{{key}}`

- A variable is an inline element.
- `key` is parsed as raw inner text between `{{` and `}}`.
- Cutdown does not enforce a lexical pattern for `key`.
- Matching is delimiter-based: first valid `}}` closes the variable.
- Unclosed `{{`: emitted as literal text.
- Variables are parsed only in inline-text contexts where inline parsing is active (for example, paragraphs, headings, blockquote content).
- In contexts without inline parsing, `{{...}}` remains literal content.
- Variables MAY carry trailing universal attributes (§5): `{{key}} {#id .class}`.
- Empty-key form `{{}}` is invalid and emitted as literal text.
- Brace-family tie-break: when `{` can start either a variable or an attribute block, `{{` is matched first (longest opener), then parsing proceeds left-to-right.

```
AST: Variable { key: string, attributes: Attributes }
```

---

### 10.12 Inline Quote

**Syntax:**
- `"" content "" {attrs}` — double-quote style
- `'' content '' {attrs}` — single-quote style

- `""` and `''` are the openers and closers. A single `"` or `'` is always literal text.
- Content is parsed as inline content (composable with other inline elements).
- `kind` distinguishes the delimiter used: `"double"` for `""`, `"single"` for `''`.
- Same-kind nesting MUST NOT be used: `"" "" ""` — the second `""` closes the first.
- Cross-kind nesting **IS allowed**: `""'' inner ''""` is valid (single inside double, or double inside single).
- Unmatched opener: emitted as `Text('""')` or `Text("''")`
- Whitespace rules follow §12.2 (boundary-to-literal stripped; adjacent boundaries collapsed).

```
AST: QuoteInline { kind: "double"|"single", children: Inline[], attributes: Attributes }
```

**Examples:**

```
"" hello ""           → QuoteInline { kind: "double", children: [Text("hello")] }
'' hi ''              → QuoteInline { kind: "single", children: [Text("hi")] }
""'' inner ''""       → QuoteInline { kind: "double", children: [QuoteInline { kind: "single", children: [Text("inner")] }] }
"" unclosed           → Text('""') + Text(" unclosed")
```

---
