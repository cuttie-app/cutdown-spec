## 16. Canonical Form

The grammar accepts more than one spelling for the same meaning at a small number of points. Canonical Cutdown is the subset that uses exactly one of them.

This section binds writers (§18.3) — formatters, round-trip editors, generators. Two conforming writers given the same AST produce byte-identical source. It places no obligation on a parser: every non-canonical spelling in the table below remains valid input and MUST continue to parse to the same AST.

Canonical form is not a conformance class and carries no diagnostic. A tool MAY report a non-canonical spelling as a lint; a parser MUST NOT.

The serialization of a parse *result* is a different subject, governed by [`policies/canonical-serialization-policy.md`](../policies/canonical-serialization-policy.md).

### 16.1 Registry

The table is closed. Every point at which two distinct inputs produce the same AST appears here. A spelling that carries a different AST value is not an alias and does not appear — `:--` and `---` differ (`"left"` versus `"start"`, §4.8), so neither is canonical for the other.

| # | Point | Canonical | Also valid as input | Defined in |
|---|---|---|---|---|
| 1 | `Meta` format word | omitted for `yaml`; otherwise lowercase — `toml`, `json` | `yaml` written out; any case | §4.3 |
| 2 | Nested quote marker | `> >` | `>>` | §4.6 |
| 3 | Ordered list item numbers | consecutive ascending integers from `List.start`; a first number of `0` is written `1` | any numbers after the first; `0` as the first | §4.7 |
| 4 | `TaskItem` checked marker | `[+]` | `[x]`, `[X]` | §4.7.2 |
| 5 | Trailing `\|` on a table row | omitted, where omitting it does not move the attribute scope chain | present | §4.8 |
| 6 | An empty `Header` row directly before a header separator | omitted — the separator alone | a written row of empty cells | §4.8 |
| 7 | Trailing `{attrs}` placement | on the block's own line | on following attribute-continuation lines | §6.1 |
| 8 | Block-opener escape placement | backslash before the marker — `` \``` `` | `` `\`` ``, `` ``\` `` and the equivalents for every other marker; `2026\.` for `\2026.` | §8.2 |
| 9 | Blank lines at the start and end of a document | start: none; end: exactly one line terminator after the last line | any number of blank lines at either end; no final terminator | §12.1 |
| 10 | Padding inside inline delimiters | none — `**bb**` | `** bb **`, `**  bb  **` | §12.2 |
| 11 | Inner padding of `NamedBlock`, `SpoilerBlock`, and `ListItem` content | 2 spaces per nesting level, whatever the width of the list marker | any padding the container model accepts; tabs | §10.2, §10.5 |
| 12 | Class tokens | one `.name` token per class, in order, no repeats — `{.a .b}` | `class="a b"`, mixed forms, repeated classes | §6.1.1 |
| 13 | `CodeBlock` language word | omitted for `text` — ```` ``` ```` | `text` written out | §4.4 |
| 14 | Id spelling | `{#x}` | `{id=x}`, `{id="x"}` | §6.1.1 |
| 15 | Attribute value quoting | bare `key=v` where the bare form parses; otherwise `key="v"` | quoted where the bare form parses | §6.1.1 |
| 16 | Line terminator | LF | CRLF, lone CR | §7 |
| 17 | Leading spaces on a continuation line | none beyond the container's padding (row 11) | any number | §12.1 |
| 18 | Interior whitespace runs in inline text | one space | any run of spaces and tabs | §12.1 |
| 19 | Id normalization | NFC | any Unicode normalization form | §1.1 |
| 20 | Line width | no wrapping: each inline context on one source line | the same content wrapped over several lines | §4.1, §12.1 |
| 21 | Blank lines between blocks | exactly one | two or more | §12.1 |
| 22 | Table cell padding | one space on each side of the content — `\| a \| b \|`; an empty cell is `\| \|` | any padding | §4.8 |
| 23 | Header separator cell | exactly three symbols — `---`, `:--`, `--:`, `:-:`, `--,`, `--.` | longer runs of `-` | §4.8 |

### 16.2 Notes on individual rows

**Row 2 — why the spaced form.** One space after each `>` keeps the marker run readable at depth and matches the single space that separates the innermost `>` from the content: depth three is `> > > text`, not `>>> text`. Both spellings carry the same depth (§4.6).

**Row 4 — why `[+]`.** The letter `x` is a strong left-to-right character, so `[x]` opens a directional run inside the brackets and renders incorrectly in right-to-left source. `[+]` inherits the surrounding direction and is intact in any script. `[x]` and `[X]` stay valid input because they are what a Markdown document pasted into Cutdown carries.

**Row 4 — preservation is not available.** `TaskItem.checked` is a boolean and carries no spelling. A writer cannot reproduce the input marker from the AST, so it MUST emit the canonical one.

**Row 5 — not always an alias.** A trailing `|` after the last cell changes which slot a following `{attrs}` fills (§4.8). Where it does, it is load-bearing and the row does not apply.

**Row 6 — not always an alias.** A header separator with no row above it inserts an empty `Header` row (§4.8), so `|---|---|` alone and `| | |` above it can parse to the same rows. A written row stops being an alias when it fixes the column count, or carries `{attrs}` or a `## comment`; then it is written.

**Row 9 — a final line terminator, not a blank line.** The canonical document ends with its last line terminated: `…last line\n`. That is a text file as POSIX defines it, so tools that insert a final newline already produce it.

**Row 11 — fixed width.** Continuation lines and nested lists sit 2 spaces past the column of the parent marker, even under `10. item`. The column-stack model accepts any positive step (§10.5), so the fixed width always parses back to the same tree. A writer emits no tab outside a fence.

**Rows 1 and 13 — the default is not written.** A writer omits a format or language word that equals the default, as it omits every other default.

**Row 20 — no wrapping.** A soft break adds nothing (§12.1) and the AST keeps no wrap points, so a writer has nowhere to break a line. An editor may still wrap lines on screen; that is a view setting and never reaches the bytes.

### 16.3 What is not in the registry

Two classes of input variation look like aliases and are not:

- **Recovery output.** An unclosed fence produces the same AST as a closed one plus a diagnostic (CDN-0001 … CDN-0006). The diagnostic is the difference; there is nothing to canonicalize.
- **Diagnosed surplus.** A fence or PageBreaker line whose tail is dropped — `-----`, four backticks, `### note` — parses with CDN-0016 emitted (§10.4.2). Only the undiagnosed spelling can be emitted by a writer.

---
