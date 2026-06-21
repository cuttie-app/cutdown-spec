## 2. Comments

Cutdown has two comment constructs that share the `#` symbol and follow the doubled/tripled-delimiter rule (§10.4). `##` stores comment payloads as **Reflection entries** on blocks; `###` (`CommentBlock`) produces a separate AST segment. Both are hidden from rendering by default.

### 2.1 Single `#` is literal

A single `#` is literal text in all positions. There is no whitespace rule, no line-start rule, no special treatment.

```
# foo            →  Paragraph([Text("# foo")])
foo # bar        →  Paragraph([Text("foo # bar")])
```

### 2.2 `##` — Line Comment (Reflection)

`##` opens a line comment that runs to the end of the line. It is recognized at line-start AND mid-line.

```
## a whole-line comment
foo ## trailing comment
```

- The `##` and everything up to (but not including) the next `\n` is the **comment payload**. The `##` and one leading space (if present) are stripped; the remainder is the `text` value.
- **Opaque to all other delimiters.** Once `##` is recognized, the parser consumes characters to `\n` blindly. It does NOT honour link-text `]`, table cell `|`, attribute `}`, or any other inline construct's closer. An unclosed opener before `##` degrades to literal per §9.4.
- **`##` boundaries are detected during Phase 2 preprocessing** (§9.2), before block classification. Block classification operates on the pre-`##` substring of each line.
- `##` is **not** recognized inside opaque block contexts: `CodeBlock`, `MathBlock`, `Meta` content, or `CommentBlock` content. For those blocks only the **opener line** (relative `line: 0`) and the **closer line** (relative `line: N`) are scanned.
- `##` is **not** recognized inside inline opaque contexts: `CodeInline`, `MathInline`, and quoted attribute values.
- A literal `##` in normal text is written `\##` or `#\#` (§8).

**`##` does not produce an AST segment.** Instead, the comment payload is stored as a `Reflection` entry on the nearest enclosing block:

```typescript
interface Reflection {
  line: number   // 0-indexed offset from the block's opener line in source
  text: string   // payload after ##, one leading space stripped
}
```

Every block type carries `reflection: Reflection[] | null` (null when no `##` is present). See §14 for the full list.

#### Trailing inline `##` (on a structural line)

When `##` appears after content on a line that belongs to a block, the payload is recorded at that line's `line:` index within the block.

**Bubbling rule.** When the structural line belongs to a *child* of a container, the payload bubbles to the **outermost container** at that scope level:

| Structural line | `reflection` attaches to |
|---|---|
| Table row line | `Table` (not `Row`) |
| List item line | `List` (not `ListItem`) |
| NamedBlock / QuoteBlock / FileRefGroup opener | that container |

#### Standalone `## comment` line

A line whose pre-`##` content is empty or whitespace is a **standalone comment line**. It acts as a blank line for block-boundary purposes (§9.2).

- Attaches to the **immediately preceding structural block** in the current scope at `line:` = source offset from that block's opener line. Consecutive standalone comments accumulate as `[N], [N+1], [N+2]…`.
- **Closes** any active accumulation (continuing Paragraph, open FileRefGroup) before attaching.
- **Orphan** — no preceding structural block in the current scope: produces `Paragraph { children: [], reflection: [{ line: 0, text }] }`. Multiple consecutive orphan lines fold into one empty Paragraph.
- Inside a container body (NamedBlock, QuoteBlock, ListItem, etc.) follows the same scope-local rule, attaching to the preceding sibling block within that scope.

**Examples:**

```
## foo                      →  no segment; preceding block gains { line: K, text: "foo" }
foo ## bar                  →  Text("foo ") — block gains { line: K, text: "bar" }
``code ## not``             →  CodeInline { value: "code ## not" }
\## foo                     →  Text("## foo")
### at inline               →  reflection entry; text: "# at inline"

[text ## comment](url)
  →  Text("[text ")  (the [ has no ] closer before ## swallows it; degrades to literal)
     Paragraph.reflection += { line: 0, text: "comment](url)" }

| Head ## comment | Next |
  →  pre-## `| Head ` fails row grammar (no closing |).
     Block becomes Paragraph([Text("| Head ")]).
     Paragraph.reflection += { line: 0, text: "comment | Next |" }

| AA | BB | ## row comment
  →  pre-## `| AA | BB |` is a valid 2-cell row.
     Table.reflection += { line: K, text: "row comment" }
```

Orphan:

```
Input:
  ## note with no preceding block

AST:
  - type: Paragraph
    children: []
    reflection:
      - line: 0
        text: note with no preceding block
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

`Reflection` entries and `CommentBlock` nodes are hidden by default. Conforming renderers (HTML, PDF, markdown round-trip) SHOULD omit them. Tooling renderers (formatter, IDE preview, comment-thread plumbing) MAY read and display them. The default is normative; the opt-in is implementation-defined.

### 2.6 Interaction with attributes

**`##` is transparent to attribute resolution.** Because `##` payloads are stored in `reflection` rather than in the inline stream, no scope-chain slot is consumed and no "orphan-due-to-comment" condition arises. Attributes bind exactly as if the `##` were not present.

```
== Heading **em** {.a}{.b} ## trailing comment
```

- `{.a}` adjacent to `**em**` → attaches to Strong.
- `{.b}` is the last `{...}` on the heading line → claims Section.
- `## trailing comment` → `Section.reflection += { line: 0, text: "trailing comment" }`.

Result:

```
Section({class:"b"}, level=2,
  heading: [
    Text("Heading "),
    Strong({class:"a"}, [Text("em")])
  ],
  reflection: [{ line: 0, text: "trailing comment" }]
)
```

---
