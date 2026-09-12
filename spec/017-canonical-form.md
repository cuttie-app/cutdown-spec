## 17. Canonical Form

The grammar accepts more than one spelling for the same meaning at a small number of points. Canonical Cutdown is the subset that uses exactly one of them.

This section binds tools that **write** source — formatters, round-trip editors, generators. Two conforming writers given the same AST produce byte-identical source. It places no obligation on a parser: every non-canonical spelling in the table below remains valid input and MUST continue to parse to the same AST.

Canonical form is not a compliance level (§15) and carries no diagnostic. A tool MAY report a non-canonical spelling as a lint; a parser MUST NOT.

The serialization of a parse *result* is a different subject, governed by [`policies/canonical-serialization-policy.md`](../policies/canonical-serialization-policy.md).

### 17.1 Registry

The table is closed. Every point at which two distinct inputs produce the same AST appears here. A spelling that carries a different AST value is not an alias and does not appear — `:---` and `----` differ (`"left"` versus `"start"`, §4.8), so neither is canonical for the other.

| # | Point | Canonical | Also valid as input | Defined in |
|---|---|---|---|---|
| 1 | `Meta` format tag | lowercase — `yaml`, `toml`, `json` | any case | §4.3 |
| 2 | Nested quote marker | `> >` | `>>` | §4.6 |
| 3 | Ordered list item numbers | consecutive ascending integers from `List.start` | any numbers after the first | §4.7 |
| 4 | `TaskItem` unchecked marker | `[ ]` | — | §4.7.2 |
| 5 | `TaskItem` checked marker | `[+]` | `[x]`, `[X]` | §4.7.2 |
| 6 | Trailing `\|` on a table row | omitted, where omitting it does not move the attribute scope chain | present | §4.8 |
| 7 | A table with no rows and no columns | `\|` | a header-separator-only table | §4.8 |
| 8 | Trailing `{attrs}` placement | on the block's own line | on following attribute-continuation lines | §6.1 |
| 9 | Block-opener escape placement | backslash before the marker — `` \``` `` | `` `\`` ``, `` ``\` `` and the equivalents for every other marker | §8.2 |
| 10 | Blank lines at the start and end of a document | none | any number | §12.1 |
| 11 | Padding inside inline delimiters | none — `**bb**` | `** bb **`, `**  bb  **` | §12.2 |

### 17.2 Notes on individual rows

**Row 2 — why the spaced form.** One space after each `>` keeps the marker run readable at depth and matches the single space that separates the innermost `>` from the content: depth three is `> > > text`, not `>>> text`. Both spellings carry the same depth (§4.6).

**Row 5 — why `[+]`.** The letter `x` is a strong left-to-right character, so `[x]` opens a directional run inside the brackets and renders incorrectly in right-to-left source. `[+]` inherits the surrounding direction and is intact in any script. `[x]` and `[X]` stay valid input because they are what a Markdown document pasted into Cutdown carries.

**Row 5 — preservation is not available.** `TaskItem.checked` is a boolean and carries no spelling. A writer cannot reproduce the input marker from the AST, so it MUST emit the canonical one.

**Row 6 — not always an alias.** A trailing `|` after the last cell changes which slot a following `{attrs}` fills (§4.8). Where it does, it is load-bearing and the row does not apply.

**Row 7 — a writer must still pick one.** `Table { rows: [], columns: [] }` is produced both by a lone `|` and by a table whose only line is a header separator. The separator carries alignment for columns that do not exist, so the shorter form is canonical.

### 17.3 What is not in the registry

Three classes of input variation look like aliases and are not:

- **Recovery output.** An unclosed fence produces the same AST as a closed one plus a diagnostic (CDN-0001 … CDN-0005). The diagnostic is the difference; there is nothing to canonicalize.
- **Diagnosed surplus.** `-----` parses as a PageBreaker with its tail dropped and CDN-0016 emitted (§4.10). `---` is the only undiagnosed spelling, so it is the only one a writer can emit.
- **Layout.** Line width, blank-line counts, table column padding, and indentation width are a tool's style settings. They are outside this section and outside the spec.

---
