## 8. Escaping

**Rule:** A backslash `\` before a special character emits the literal character. The `\` is consumed.

A backslash before a **non-special** character emits both the backslash and the character literally. The `\` is NOT consumed silently.

```
\*   →  Text("*")
\\   →  Text("\")
\a   →  Text("\a")
```

### 8.1 Special Characters

The following characters are special and may be escaped:

```
= # * _ ~ ` $ [ ] ( ) ! { } : - > / \ | " ' ^
```

Escaping inside opaque containers (CodeInline, CodeBlock, Meta, MathBlock, CommentBlock) follows narrow per-construct rules — see §8.3.

---

### 8.2 Block-Opener Escapes

A backslash before any one character of a line-start block marker suppresses the marker. The line becomes a `Paragraph` with the marker chars emitted as literal text. The `\` is consumed; marker chars are kept verbatim.

Applies at **line start only** (after container-indent stripping, before the first non-whitespace char of the marker). Mid-line occurrences of these chars are governed by §8 inline rules.

| Construct | Marker | Escape forms (all equivalent) | Result |
|---|---|---|---|
| Heading (§4.2) | `=` ... `=========` | `\=`, `\==`, `\===` ... | `Paragraph([Text("= ...")])` |
| List item (§4.7) | `- ` | `\- item` | `Paragraph([Text("- item")])` |
| QuoteBlock (§4.6) | `> ` | `\> quoted` | `Paragraph([Text("> quoted")])` |
| ThematicBreak (§4.10) | `---` | `\---`, `-\--`, `--\-` | `Paragraph([Text("---")])` — **also suppresses the page break at Page scope** |
| FileRef (§4.11) | `/path` | `\/path` | `Paragraph([Text("/path")])` |
| CodeBlock (§4.4) | `` ``` `` | `` \``` ``, `` `\`` ``, `` ``\` `` | Paragraph; residual backticks still feed inline parsing |
| Meta (§4.3) | `~~~` | `\~~~`, `~\~~`, `~~\~` | `Paragraph([Text("~~~")])` |
| MathBlock (§4.5) | `$$$` | `\$$$`, `$\$$`, `$$\$` | `Paragraph([Text("$$$")])` |
| CommentBlock (§4.16) | `###` (line start) | `\###`, `#\##`, `##\#` | `Paragraph([Text("###")])` |
| NamedBlock (§4.13) | `:::name` | `\:::name`, `:\::name`, `::\:name` | `Paragraph([Text(":::name")])` — **no CDN-0013** |
| SpoilerBlock (§4.15) | `^^^` | `\^^^`, `^\^^`, `^^\^` | `Paragraph([Text("^^^")])` |
| Caption (§6.5) | `^ ` | `\^ text` | `Paragraph([Text("^ text")])` |
| GFM table row (§4.8) | `\|` | `\| cell \|` | `Paragraph([Text("\| cell \|")])` |
| Multiline table opener / separator (§4.8) | `+-` | `\+-`, `+\-` | `Paragraph([Text("+-")])` |

**Notes:**

- The escape suppresses *the block opener only*. Residual characters re-enter normal processing, regardless of which of the three marker chars carried the escape. Example: `` \``` ``, `` `\`` ``, and `` ``\` `` all become a Paragraph containing three backtick characters; inline parsing then opens a `CodeInline` from the first two and leaves the third as a literal `` ` ``. To produce three literal backticks, escape each: `` \`\`\` ``.
- Attributes that follow an escaped marker are literal text — there is no block to attach them to. `\--- {.cover}` → `Paragraph([Text("--- {.cover}")])`.
- The rule applies in every block scope (Page scope, ListItem, TaskItem, QuoteBlock, NamedBlock, SpoilerBlock).
- `##` (line comment, mid-line) is escaped with `\##` or `#\#` per §2.2 — that is a separate inline escape, not a block-opener escape.
- No diagnostic is emitted when an opener is escaped. The backslash is a deliberate author signal.

---

### 8.3 Opaque-Block Closer Escapes

Opaque containers (whose content is captured verbatim) admit a single **narrow escape**: the fence character itself. All other backslashes inside opaque content are literal.

| Container | Escape | Result | Other `\X` inside |
|---|---|---|---|
| CodeInline (§5.6) | `` \` `` | literal `` ` `` | literal `\X` (including `\\` → two chars) |
| CodeBlock (§4.4) | `` \` `` | literal `` ` `` | literal `\X` |
| Meta (§4.3) | `\~` | literal `~` | literal `\X` |
| CommentBlock (§4.16) | `\#` | literal `#` | literal `\X` |
| MathBlock (§4.5) | — **none** | n/a | fully literal (LaTeX owns `\`) |

**Notes:**

- The escape applies **uniformly throughout opaque content** — line-start or mid-line. `\fence` anywhere produces `fence`. A closer line `\~~~`, `~\~~`, or `~~\~` keeps the Meta block open and emits a literal `~~~` content line. (Mid-line uniformity is a simplification — closers are only detected at line start, so mid-line escape has no closer-suppression effect; it just affects the captured raw character.)
- `\\` inside an opaque (non-Math) block emits two literal characters `\\`. Backslash is "active" only directly before its fence character.
- `\#` in a CommentBlock always escapes to `#`, regardless of how many `#` characters neighbor it. The rule does not look at run length.
- **MathBlock carve-out:** no escape is processed because LaTeX assigns its own meaning to backslash. The trade-off is that a literal `$$$` line inside a MathBlock body is unsupported — wrap such content in a `CodeBlock` or split the math.
- **NamedBlock** (`:::`) and **SpoilerBlock** (`^^^`) are not opaque — their children are parsed as blocks. To prevent a content line from being read as the container's closer, use the same escape mechanic as §8.2: a `\` before any one of the three fence chars at line start (e.g., `\:::`, `:\::`, `::\:` for NamedBlock; `\^^^`, `^\^^`, `^^\^` for SpoilerBlock). The line becomes a Paragraph containing the literal fence chars.
- No diagnostic is emitted for closer escapes.

---
