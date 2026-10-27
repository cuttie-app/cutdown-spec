## 2. Comments

Cutdown has two comment constructs that share the `#` (octothorpe) symbol and follow the doubled/tripled-delimiter rule (§10.4). `##` stores comment payloads as **Reflection entries** on blocks; `###` (`CommentBlock`) produces a separate AST segment. Both are hidden from rendering by default.

### 2.1 Single `#` is literal

A single `#` is literal text in all positions. There is no whitespace rule, no line-start rule, no special treatment.

```
# foo            →  Paragraph([Text("# foo")])
foo # bar        →  Paragraph([Text("foo # bar")])
```

### 2.2 Double octothorpe `##` — Line Comment (Reflection)

A double `##` opens a line comment that runs to the end of the line. It is recognized at line-start AND mid-line.

```
## a whole-line comment
foo ## trailing comment
```

- The `##` and everything up to (but not including) the next `\n` is the **comment payload**. The `##` and one leading space (if present) are stripped; the remainder is the `text` value **verbatim** — trailing whitespace inside the payload is preserved, since the payload is opaque (§12's trailing-space rule does not reach inside it).
- **Opaque to all other delimiters.** Once `##` is recognized, the parser consumes characters to `\n` blindly. It does NOT honour link-text `]` (right bracket), table cell `|` (pipe), attribute `}` (right brace), or any other inline construct's closer. An unclosed opener before `##` degrades to literal per §9.1.4.
- **`##` boundaries are detected during Phase 2 preprocessing** (§9.1.2), before block classification. Block classification operates on the pre-`##` substring of each line.
- `##` is **not** recognized inside opaque block contexts: `CodeBlock`, `MathBlock`, `Meta` content, or `CommentBlock` content. For those blocks only the **opener line** (the first line of the fence) and the **closer line** (the closing fence) are scanned.
- `##` is **not** recognized inside inline opaque contexts: `CodeInline`, `MathInline`, and quoted attribute values.
- A literal `##` in normal text is written `\##` or `#\#` (§8).

**`##` does not produce an AST segment.** Instead, the comment payload is stored as a `Reflection` entry on the node that owns its line:

```typescript
interface Reflection {
  loc: Loc       // source range of the ## payload (raw-file UTF-16 offsets, §14)
  text: string   // payload after ##, one leading space stripped
}
```

Every block type carries `reflection: Reflection[]` (`[]` when no `##` is present), except `List`, `Table`, and `FileGroup`: they own no line of their own. Each line inside them is owned by a `ListItem`, `TaskItem`, `Row`, or `FileBlock`, which carries `reflection` instead. See §14 for the full list.

#### Trailing inline `##` (on a structural line)

When `##` appears after content on a line that belongs to a block, the payload is recorded with the `loc` of that payload's source range.

**Line-owner rule.** The payload attaches to the node that owns the structural line:

| Structural line | `reflection` attaches to |
|---|---|
| Table content row line | that `Row` (`_type: "Row"` or `"Header"`) |
| Table header separator line | the row before it in the table (§4.8) |
| Table caption line | the table's last row |
| List item line | that `ListItem` or `TaskItem` |
| NamedBlock / QuoteBlock opener | that container |
| FileBlock line | that `FileBlock` |
| Any other block's line | that block |

#### Standalone `## comment` line

A line whose pre-`##` content is empty or whitespace is a **standalone comment line**. It is neither content nor a blank line. Its indentation places it in a block scope (§1.6), and what it does depends on the line above it in that scope:

- **Directly after content** (no blank line between): it attaches backwards to the owner of the preceding line, carrying its own `loc`. After a `List`, `Table`, or `FileGroup` that owner is the last `ListItem`/`TaskItem`, row, or `FileBlock` of that scope — `- a`, `  - b`, `## c` gives the comment to item `a`, not to the nested `b`. Consecutive comment lines attach to the same node in source order.
- **After a blank line, or with no preceding block in the scope** (an orphan): it produces `Paragraph { children: [], reflection: [{ loc, text }] }`. Consecutive comment lines fold into that one empty Paragraph. It is a block like any other.

Either way the comment line ends at its line terminator, and the next line opens its own context — no blank line is needed after it: `## note` followed by `- a` opens a `List`.

- A comment line directly after content is **transparent to List, Table, and FileGroup runs**: the run continues on the next line as if the comment line were absent. `- a`, `## c`, `- b` is one `List`.
- A comment line **ends a Paragraph**: the next line starts a new block.
- A comment line directly after content is transparent to caption binding as well (§6.2).

**Examples:**

```
## foo                      →  no segment; preceding block gains { loc, text: "foo" }
foo ## bar                  →  Text("foo ") — block gains { loc, text: "bar" }
``code ## not``             →  CodeInline { value: "code ## not" }
\## foo                     →  Text("## foo")
### at inline               →  reflection entry; text: "# at inline"

[text ## comment](url)
  →  Text("[text ")  (the [ has no ] closer before the ## cut; the verbatim slice runs to the cut, §9.1.4.1)
     Paragraph.reflection += { loc, text: "comment](url)" }

| Head ## comment | Next |
  →  pre-## `| Head ` fails row grammar (no closing |).
     Block becomes Paragraph([Text("| Head ")]).
     Paragraph.reflection += { loc, text: "comment | Next |" }

| AA | BB | ## row comment
  →  pre-## `| AA | BB |` is a valid 2-cell row.
     Row.reflection += { loc, text: "row comment" }
```

Orphan:

```
Input:
  ## note with no preceding block

AST:
  - _type: Paragraph
    children: []
    reflection:
      - loc: { start: 3, end: 31 }
        text: note with no preceding block
```

### 2.3 Triple octothorpe `###` — CommentBlock (block comment)

`###` opens a block comment that runs until the next bare `###`, or end of document.

```
###
any content
including blank lines, =headings, **markup**, ``code`` —
all captured as a single opaque string
###
```

- The opener line MUST be exactly `###` with no name and no attributes (no `[name]`, no `{attrs}` are recognized).
- The closer is the next line whose stripped content is exactly `###`. Indentation is not compared — the rule is the same as for every other fence (§10.4.2). To keep a `###` line inside the body, escape it (§8.3).
- Content between opener and closer is **opaque** — captured as a raw string with no inline or block parsing. The `\n` between content lines is preserved; a single trailing `\n` is appended.
- `###` is recognized at Page scope AND inside containers (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`). Container indentation is stripped before classification (§10.2), so the fence is recognized wherever the container's content begins.
- Unclosed `###` consumes to end-of-document and emits a `CommentBlock` with the captured content → warning CDN-0006. The opaque content gives the parser no way to observe container boundaries from inside the comment — the same rule applies to all opaque fences (CodeBlock, Meta, MathBlock).
- `###` inside an open `CodeBlock`, `MathBlock`, or `Meta` body is literal content (opaque siblings win).
- **Closer escape:** `\#` inside the body emits a literal `#`. A line `\###`, `#\##`, or `##\#` therefore does NOT close the fence. All other `\X` is literal (including `\\` → two chars). See §8.3.

**AST type:**

```typescript
interface CommentBlock {
  _type: "CommentBlock"
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

Only a `Meta` and a PageBreaker create Page boundaries.

### 2.5 Render policy

`Reflection` entries and `CommentBlock` nodes are hidden by default. Conforming renderers (HTML, PDF, markdown round-trip) SHOULD omit them. Tooling renderers (formatter, IDE preview, comment-thread plumbing) MAY read and display them. The default is normative; the opt-in is implementation-defined.

### 2.6 Interaction with attributes

**`##` is transparent to attribute resolution.** Because `##` payloads are stored in `reflection` rather than in the inline stream, no scope-chain slot is consumed and no "orphan-due-to-comment" condition arises. Attributes bind exactly as if the `##` were not present.

```
== Heading **bb** {.a}{.b} ## trailing comment
```

- `{.a}` adjacent to `**bb**` → attaches to Strong.
- `{.b}` is the last `{...}` on the heading line → claims Section.
- `## trailing comment` → `Section.reflection += { loc, text: "trailing comment" }`.

Result:

```
Section({class:"b"}, level=2,
  heading: [
    Text("Heading "),
    Strong({class:"a"}, [Text("bb")])
  ],
  reflection: [{ loc, text: "trailing comment" }]
)
```

---
