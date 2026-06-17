## 2. Comments

Cutdown has two comment constructs that share the `#` symbol and follow the doubled/tripled-delimiter rule (§10.4). Both are emitted as AST nodes (`CommentInline`, `CommentBlock`) so that tooling can round-trip, fold, attribute, and selectively reveal them. The default render policy is **hidden**: conforming renderers SHOULD omit Comment\* nodes from output. Consumers MAY opt in to emit them.

### 2.1 Single `#` is literal

A single `#` is literal text in all positions. There is no whitespace rule, no line-start rule, no special treatment.

```
# foo            →  Paragraph([Text("# foo")])
foo # bar        →  Paragraph([Text("foo # bar")])
```

### 2.2 `##` — CommentInline (line comment)

`##` opens an inline comment that runs to the end of the line. It is recognized at line-start AND mid-line.

```
## a whole-line comment
foo ## trailing comment
```

- The `##` and everything up to (but not including) the next `\n` becomes one `CommentInline` segment. The `##` prefix is stripped from `text`.
- **Opaque to all other delimiters.** Once `##` is recognized, the parser consumes characters to `\n` blindly. It does NOT honour link-text `]`, table cell `|`, attribute `}`, or any other inline construct's closer. If `##` appears inside an open inline construct, that construct's closer (and any text after it on the same line) is swallowed into the comment text. The unclosed opener degrades to literal per §9.4.
- **CommentInline boundaries are detected during Phase 2 preprocessing** (§9.2), before block classification. Block classification operates on the pre-`##` substring of each line. The CommentInline is then attached to the resulting block per the placement rules below.
- `##` is **not** recognized inside opaque block contexts: `CodeBlock`, `MathBlock`, `Meta` content, or `CommentBlock` content (the enclosing opaque fence is detected first; lines inside are not scanned for `##`).
- `##` is **not** recognized inside inline opaque contexts that are tokenized at the inline level: `CodeInline` and `MathInline` (their content is captured before `##` would match) and quoted attribute values.
- A literal `##` in normal text is written `\##` or `#\#` (§8).

**Examples of opaque-to-delimiters behaviour:**

```
[text ## comment](url)
  →  Text("[text ")  +  CommentInline { text: " comment](url)" }
  (the `[` opener has no `]` closer before `##` swallows it; degrades to literal)

| Head ## comment | Next |
  →  the line's pre-`##` substring is `| Head `, which does not satisfy the
     Table row grammar (no closing `|` after the only cell). The block
     candidate falls back to Paragraph:
     Paragraph([Text("| Head "), CommentInline { text: " comment | Next |" }])

| AA | BB | ## row comment
  →  pre-`##` substring `| AA | BB | ` IS a valid 2-cell row. CommentInline
     is attached to Row.comments[0] (see §4.8).
```

**AST type:**

```typescript
interface CommentInline {
  type: "CommentInline"
  text: string  // content after the leading `##`, up to but not including the LF
}
```

**Examples:**

```
## foo              →  CommentInline { text: " foo" }
foo ## bar          →  Text("foo ") + CommentInline { text: " bar" }
**bold ## tail      →  Text("**bold ") + CommentInline { text: " tail" }
``code ## not``     →  CodeInline { value: "code ## not" }
\## foo             →  Text("## foo")
```

### 2.3 `###` — CommentBlock (block comment)

`###` opens a block comment that runs until the next bare `###` at the same column, or end of document.

```
###
any content
including blank lines, =headings, **markup**, ``code`` —
all captured as a single opaque string
###
```

- The opener line MUST be exactly `###` with no name and no attributes (no `[name]`, no `{attrs}` are recognized).
- The closer is the next line whose stripped content is exactly `###` at the same column as the opener.
- Content between opener and closer is **opaque** — captured as a raw string with no inline or block parsing. The `\n` between content lines is preserved; a single trailing `\n` is appended.
- `###` is recognized at Page scope AND inside containers (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`), following the same column rules as other tripled-fence blocks (§9.2.4, §10.5).
- Unclosed `###` consumes to end-of-document and emits a `CommentBlock` with the captured content → warning CDN-0006. The opaque content gives the parser no way to observe container boundaries from inside the comment — the same rule applies to all opaque fences (CodeBlock, Meta, MathBlock).
- `###` inside an open `CodeBlock`, `MathBlock`, or `Meta` body is literal content (opaque siblings win).
- **Closer escape:** `\#` inside the body emits a literal `#`. A line `\###`, `#\##`, or `##\#` therefore does NOT close the fence. All other `\X` is literal (including `\\` → two chars). See §8.3.

**AST type:**

```typescript
interface CommentBlock {
  type: "CommentBlock"
  text: string  // content between opener and closer; lines joined with `\n`; single trailing `\n`
}
```

**Examples:**

```
Input:
  ###
  draft note
  TODO: revise
  ###

AST:
  CommentBlock { text: "draft note\nTODO: revise\n" }
```

```
Input:
  - item one
    ###
    todo
    ###
  - item two

AST:
  List
  ├── ListItem [Text("item one"), CommentBlock { text: "todo\n" }]
  └── ListItem [Text("item two")]
```

### 2.4 Page assembly

`CommentBlock` is a pass-through node for Page Assembly (§9.6). It never triggers a new Page and never consumes a Meta slot. A `CommentBlock` appearing before any other block on a Page does not prevent a later `Meta` from being assigned to that Page's `meta`.

### 2.5 Render policy

`CommentInline` and `CommentBlock` are hidden by default. Conforming renderers (HTML, PDF, markdown round-trip) SHOULD omit them. Tooling renderers (formatter, IDE preview, comment-thread plumbing) MAY iterate over and display them. The default is normative; the opt-in is implementation-defined.

### 2.6 Interaction with attributes

**`CommentInline` is transparent to attribute resolution.** Attributes (§6) bind to their target as if the comment were not present. A trailing `## comment` after a `{attrs}` block does NOT prevent the attrs from claiming their scope-chain slot.

```
== Heading **em** {.a}{.b} ## trailing comment
```

Parses as:

- `{.a}` adjacent to `**em**` → per-segment attachment to Strong.
- `{.b}` is the last `{...}` on the heading line (comment-transparent for the Last-Attr Rule, §6.2) → claims Section.
- `## trailing comment` → CommentInline appended to Section's `heading` array.

Result:

```
Section({class:"b"}, level=2,
  heading: [
    Text("Heading "),
    Strong({class:"a"}, [Text("em")]),
    CommentInline { text: " trailing comment" }
  ])
```

The same transparency applies to:

- Paragraph trailing attrs: `text {.p} ## comment` → Paragraph gets `{.p}`; CommentInline appended.
- NamedBlock opener attrs: `:::callout {.warn} ## note` → NamedBlock gets `{.warn}`; CommentInline appended as first child of the body.
- List item / table row / FileRefGroup scope chains: each `{}` claims its slot per §6.2; CommentInline appended to the appropriate parent per the per-construct rules in §4.

There is no "orphan-due-to-comment" rule. Authors do not need to split or relocate attrs to make them attach when a trailing comment is present.

---
