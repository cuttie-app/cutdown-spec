## 18. Canonical Form

The grammar accepts more than one spelling for the same meaning at a small number of points. Canonical Cutdown is the subset that uses exactly one of them.

This section binds writers (§20.3) — formatters, round-trip editors, generators. Two conforming writers given the same AST produce byte-identical source. It places no obligation on a parser: every non-canonical spelling in the table below remains valid input and MUST continue to parse to the same AST.

Canonical form is not a conformance class and carries no diagnostic. A tool MAY report a non-canonical spelling as a lint; a parser MUST NOT.

The serialization of a parse *result* is a different subject, governed by [`policies/canonical-serialization-policy.md`](../policies/canonical-serialization-policy.md).

### 18.1 Registry

The table is closed. Every point at which two distinct inputs produce the same AST appears here. A spelling that carries a different AST value is not an alias and does not appear — `:--` and `---` differ (`"left"` versus `"start"`, §4.8), so neither is canonical for the other.

| # | Point | Canonical | Also valid as input | Defined in |
|---|---|---|---|---|
| 1 | `Meta` format word | omitted for `yaml`; otherwise lowercase — `toml`, `json` | `yaml` written out; any case | §4.3 |
| 2 | Ordered list item numbers | consecutive ascending integers from `List.start`; a first number of `0` is written `1` | any numbers after the first; `0` as the first | §4.7 |
| 3 | `TaskItem` checked marker | `[+]` | `[x]`, `[X]` | §4.7.2 |
| 4 | Trailing `\|` on a table row | omitted, where omitting it does not move the attribute scope chain | present | §4.8 |
| 5 | An empty `Header` row directly before a header separator | omitted — the separator alone | a written row of empty cells | §4.8 |
| 6 | Trailing `{attrs}` placement | on the block's own line | on following attribute-continuation lines | §6.1 |
| 7 | Block-opener escape placement | backslash before the marker — `` \``` `` | `` `\`` ``, `` ``\` `` and the equivalents for every other marker; `2026\.` for `\2026.` | §13.2 |
| 8 | Blank lines at the start and end of a document | start: none; end: exactly one line terminator after the last line | any number of blank lines at either end; no final terminator | §15.1 |
| 9 | Padding inside inline delimiters | none — `**bb**` | `** bb **`, `**  bb  **` | §15.2 |
| 10 | Inner padding of `NamedBlock`, `SpoilerBlock`, and `ListItem` content | 2 spaces per nesting level, whatever the width of the list marker | any padding the container model accepts; tabs | §11.2, §11.5 |
| 11 | Class tokens | one `.name` token per class, in order, no repeats — `{.a .b}` | `class="a b"`, mixed forms, repeated classes | §6.1.1 |
| 12 | `CodeBlock` language word | omitted for `text` — ```` ``` ```` | `text` written out | §4.4 |
| 13 | Id spelling | `{#x}` | `{id=x}`, `{id="x"}` | §6.1.1 |
| 14 | Attribute value quoting | bare `key=v` where the bare form parses; otherwise `key="v"` | quoted where the bare form parses | §6.1.1 |
| 15 | Line terminator | LF | CRLF, lone CR | §10 |
| 16 | Leading whitespace on a continuation line | exactly the base column | fewer columns | §15.1 |
| 17 | Interior whitespace runs in inline text | one space | any run of spaces and tabs | §15.1 |
| 18 | Id normalization | NFC | any Unicode normalization form | §2.1 |
| 19 | Line width | no wrapping: each inline context on one source line | the same content wrapped over several lines | §4.1, §15.1 |
| 20 | Blank lines between blocks | exactly one | two or more | §15.1 |
| 21 | Table cell padding | one space on each side of the content — `\| a \| b \|`; an empty cell is `\| \|` | any padding | §4.8 |
| 22 | Header separator cell | exactly three symbols — `---`, `:--`, `--:`, `:-:`, `--,`, `--.` | longer runs of `-` | §4.8 |
| 23 | Trailing whitespace on a line | none — a blank line inside a quote is a bare `>` | any trailing spaces and tabs | §15.1 |
| 24 | Segment comment | a bare `###` fence, body lines as `text` holds them, standing directly before the block `before` names — or at the end of its container — at that block's padding | an orphan `## text` line; a CommentBlock before the `Meta` that fills its Page | §7.3 |

### 18.2 Notes on individual rows

**Row 3 — why `[+]`.** The letter `x` is a strong left-to-right character, so `[x]` opens a directional run inside the brackets and renders incorrectly in right-to-left source. `[+]` inherits the surrounding direction and is intact in any script. `[x]` and `[X]` stay valid input because they are what a Markdown document pasted into Cutdown carries.

**Row 3 — preservation is not available.** `TaskItem.checked` is a boolean and carries no spelling. A writer cannot reproduce the input marker from the AST, so it MUST emit the canonical one.

**Row 4 — not always an alias.** A trailing `|` after the last cell changes which slot a following `{attrs}` fills (§4.8). Where it does, it is load-bearing and the row does not apply.

**Row 5 — not always an alias.** A header separator with no row above it inserts an empty `Header` row (§4.8), so `|---|---|` alone and `| | |` above it can parse to the same rows. A written row stops being an alias when it fixes the column count, or carries `{attrs}` or a `## comment`; then it is written.

**Row 8 — a final line terminator, not a blank line.** The canonical document ends with its last line terminated: `…last line\n`. That is a text file as POSIX defines it, so tools that insert a final newline already produce it.

**Row 10 — fixed width.** Continuation lines and nested lists sit 2 spaces past the column of the parent marker, even under `10. item`. The column-stack model accepts any positive step (§11.5), so the fixed width always parses back to the same tree. A writer emits no tab outside a fence.

**Rows 1 and 12 — the default is not written.** A writer omits a format or language word that equals the default, as it omits every other default.

**Row 19 — no wrapping.** A soft break adds nothing (§15.1) and the AST keeps no wrap points, so a writer has nowhere to break a line. An editor may still wrap lines on screen; that is a view setting and never reaches the bytes.

**Row 24 — placement.** A `SegmentReflection` carries no spelling and no offset, only its anchor (§7.3). A writer emits each one as a CommentBlock just before its anchor block, entries with the same anchor in `Page.reflections` order. A comment written before a `Meta` therefore comes back after it: the `Meta` is not in `children`, so no path can point before it. A body line that begins with `###` is escaped (§13.3).

### 18.3 What is not in the registry

Two classes of input variation look like aliases and are not:

- **Recovery output.** An unclosed fence produces the same AST as a closed one plus a diagnostic (CDN-0001 … CDN-0006). The diagnostic is the difference; there is nothing to canonicalize.
- **Diagnosed surplus.** A fence or PageBreaker line whose tail is dropped — `-----`, four backticks, `### note` — parses with CDN-0016 emitted (§11.4.2). Only the undiagnosed spelling can be emitted by a writer.

---
