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
- **The cut ends the line.** The content before `##` is the line's content, and whitespace between that content and `##` is trailing whitespace: it is dropped (§12.1). `foo ## note` holds `Text("foo")`.
- **Opaque to all other delimiters.** Once `##` is recognized, the parser consumes characters to `\n` blindly. It does NOT honour link-text `]` (right bracket), table cell `|` (pipe), attribute `}` (right brace), or any other inline construct's closer. An opener before `##` behaves as at any line end: a span may still close on a later line of the inline context, and a dead Class 2 opener's slice stops at the cut (§9.1.4.1).
- **`##` boundaries are detected during Phase 2 preprocessing** (§9.1.2), before block classification. Block classification operates on the pre-`##` substring of each line. To find them, Phase 2 first recognizes escapes and `CodeInline` and `MathInline` spans (§11).
- `##` is **not** recognized inside opaque content (§0.5). For a `CodeBlock`, `MathBlock`, `Meta`, or `CommentBlock` only the **opener line** (the first line of the fence) and the **closer line** (the closing fence) are scanned. On a `Meta` or `CommentBlock` fence line, a `##` is part of the tail that the fence drops (§10.4.2).
- Inline, a `CodeInline` or `MathInline` protects a `##` only when its closer is found within the inline context; behind an opener that never closes, `##` is a comment and the opener degrades per its class (§9.1.4.1).
- A literal `##` in normal text is written `\##` or `#\#` (§8).

**`##` does not produce an AST segment.** Instead, the comment payload is stored as a `Reflection` entry on the node that owns its line:

```typescript
interface Reflection {
  loc: Loc       // source range of the ## payload (raw-file UTF-16 offsets, §14)
  text: string   // payload after ##, one leading space stripped
}
```

Every block type carries `reflection: Reflection[]` (`[]` when no `##` is present), except `CommentBlock`, which is already opaque, and `List`, `Table`, and `FileGroup`: they own no line of their own. Each line inside them is owned by a `ListItem`, `TaskItem`, `Row`, or `FileBlock`, which carries `reflection` instead. See §14 for the full list.

#### Trailing inline `##` (on a structural line)

When `##` appears after content on a line that belongs to a block, the payload is recorded with the `loc` of that payload's source range.

**Line-owner rule.** The payload attaches to the node that owns the structural line:

| Structural line | `reflection` attaches to |
|---|---|
| Table content row line | that `Row` (`_type: "Row"` or `"Header"`) |
| Table header separator line | the row before it in the table (§4.8) |
| Table caption line | the table's last row |
| List item line | that `ListItem` or `TaskItem` |
| Line inside a `QuoteBlock` | the block that owns the content after the `>` markers — a `QuoteBlock` whose body is one paragraph owns it itself (§4.6) |
| Opener or closer of a `CodeBlock`, `MathBlock`, `SpoilerBlock`, or `NamedBlock` | that block |
| Fence line of a `Meta` or `CommentBlock` | none — dropped with the fence tail (§10.4.2) |
| FileBlock line | that `FileBlock` |
| Any other block's line | that block |

#### Standalone `## comment` line

A line whose pre-`##` content is empty or whitespace is a **standalone comment line**. It is neither content nor a blank line. Its indentation places it in a block scope (§1.5), and what it does depends on the line above it in that scope:

- **Directly after content** (no blank line between): it attaches backwards to the owner of the preceding line, carrying its own `loc`. After a `List`, `Table`, or `FileGroup` that owner is the last `ListItem`/`TaskItem`, row, or `FileBlock` of that scope — `- a`, `  - b`, `## c` gives the comment to item `a`, not to the nested `b`. Consecutive comment lines attach to the same node in source order.
- **After a blank line, after a `CommentBlock`, or with no preceding block in the scope** (an orphan): it produces `Paragraph { children: [], reflection: [{ loc, text }] }`. Consecutive comment lines fold into that one empty Paragraph. It is a block like any other.

Either way the comment line ends at its line terminator, and the next line opens its own context — no blank line is needed after it: `## note` followed by `- a` opens a `List`.

- A comment line directly after content is **transparent to List, Table, and FileGroup runs**: the run continues on the next line as if the comment line were absent. `- a`, `## c`, `- b` is one `List`.
- A comment line **ends a Paragraph**: the next line starts a new block.
- A comment line directly after content is transparent to caption binding as well (§6.2).

**Examples:**

```
## foo                      →  no segment; preceding block gains { loc, text: "foo" }
foo ## bar                  →  Text("foo") — block gains { loc, text: "bar" }
``code ## not``             →  CodeInline { value: "code ## not" }
\## foo                     →  Text("## foo")
foo ### at inline           →  Text("foo") — block gains { loc, text: "# at inline" }
### at line start          →  opens a CommentBlock (§4.16); the tail is dropped

[text ## comment](url)
  →  Text("[text")  (the [ has no ] closer before the ## cut; the verbatim slice runs to the cut, §9.1.4.1)
     Paragraph.reflection += { loc, text: "comment](url)" }

| Head ## comment | Next |
  →  pre-## `| Head` fails row grammar (no closing |).
     Block becomes Paragraph([Text("| Head")]).
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

A line that begins with `###` opens a `CommentBlock`: an opaque block comment that runs to the next line beginning with `###`, or to the end of the document. §4.16 defines it.

### 2.4 Page assembly

Only a `Meta` and a PageBreaker create Page boundaries.

### 2.5 Render policy

`Reflection` entries and `CommentBlock` nodes are hidden by default: a renderer omits them unless its user asks for them, and a tool that serves authors — a formatter, an IDE preview, a comment thread — may show them. The requirement is §18.4; how a user asks is implementation-defined.

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
