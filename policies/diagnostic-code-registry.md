---
title: Cutdown Diagnostic Code Registry
Status: Active
Scope: Canonical list of all stable diagnostic codes emitted by conforming Cutdown parsers
Related:
  - ./diagnostics-policy.md
  - ./diagnostic-code-registry-policy.md
  - ./versioning-policy.md
---

## Cutdown Diagnostic Code Registry

All codes use the prefix `CDN-`. Codes are permanently assigned — retired codes are marked `removed` but never reused.

---

### CDN-0001 — Unclosed CodeBlock fence

| Field | Value |
|---|---|
| code | CDN-0001 |
| title | Unclosed CodeBlock fence |
| level | warning |
| trigger | A ` ``` ` opening fence has no matching closing ` ``` ` before end of document |
| recovery | Content from the opening fence to end of document is treated as CodeBlock content |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0002 — Unclosed MetaBlock fence

| Field | Value |
|---|---|
| code | CDN-0002 |
| title | Unclosed MetaBlock fence |
| level | warning |
| trigger | A `~~~` opening fence has no matching closing `~~~` before end of document |
| recovery | Content from the opening fence to end of document is treated as Meta raw content |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0003 — Unclosed MathBlock fence

| Field | Value |
|---|---|
| code | CDN-0003 |
| title | Unclosed MathBlock fence |
| level | warning |
| trigger | A `$$$` opening fence has no matching closing `$$$` before end of document |
| recovery | Content from the opening fence to end of document is treated as MathBlock formula content |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0004 — Unclosed NamedBlock

| Field | Value |
|---|---|
| code | CDN-0004 |
| title | Unclosed NamedBlock |
| level | warning |
| trigger | A `:::name` opening line has no matching closing `:::` before end of document |
| recovery | Content from the opening line to end of document is treated as NamedBlock children |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0005 — Unclosed SpoilerBlock fence

| Field | Value |
|---|---|
| code | CDN-0005 |
| title | Unclosed SpoilerBlock fence |
| level | warning |
| trigger | A `^^^` opening fence has no matching closing `^^^` before end of document (or end of the enclosing block container) |
| recovery | Content from the opening fence to the boundary is treated as `SpoilerBlock` children (parsed as blocks) |
| introduced_in | next |
| status | active |
| owner | Language |

---

### CDN-0006 — Unclosed CommentBlock fence

| Field | Value |
|---|---|
| code | CDN-0006 |
| title | Unclosed CommentBlock fence |
| level | warning |
| trigger | A `###` opening fence has no closing line (one beginning with `###`) before end of document |
| recovery | Content from the opening fence to end of document is treated as `CommentBlock` text (opaque raw string). The same rule applies as for other opaque fences (CDN-0001, CDN-0002, CDN-0003) — container boundaries are not observable from inside an opaque block. |
| introduced_in | 0.5.0 |
| status | active |
| owner | Language |

---

### CDN-0007 — Attributes on table delimiter row dropped

| Field | Value |
|---|---|
| code | CDN-0007 |
| title | Attributes on table delimiter row dropped |
| level | warning |
| trigger | A `{...}` block appears on a table header separator row |
| recovery | The `{...}` block is dropped. Delimiter rows are structural metadata (alignment markers) and have no AST shape to carry attributes. Trailing CommentInlines on the delimiter row are still attached to the preceding header Row's `comments` array (see §4.8). |
| introduced_in | 0.5.0 |
| status | removed — as of 0.8.0 `{attrs}` on a header separator row claim the Table slot (§4.8) and `+` rows in pipe tables are ignored entirely; no dropped-attr case remains |
| owner | Language |

---

### CDN-0008 — Orphaned caption line

| Field | Value |
|---|---|
| code | CDN-0008 |
| title | Orphaned caption line |
| level | warning |
| trigger | A `^ ` line that fails any binding condition: the immediately preceding block in the current block scope is absent or not captionable, its caption slot is already filled, or a blank line separates it from the `^ ` line |
| recovery | The `^ ` line is emitted as a `Paragraph` containing the literal text (including the `^ ` prefix) |
| introduced_in | next |
| status | active |
| owner | Language |

---

### CDN-0009 — Attribute block on caption line ignored

| Field | Value |
|---|---|
| code | CDN-0009 |
| title | Attribute block on caption line ignored |
| level | warning |
| trigger | A `{...}` token appears at the end of a caption line (`^ ...`) |
| recovery | The `{...}` token is emitted as literal `Text` — it does not attach to any node. Caption lines carry no attributes; the parent block's attributes are set independently. |
| introduced_in | next |
| status | active |
| owner | Language |

---

### CDN-0010 — ThematicBreak text content dropped (removed)

| Field | Value |
|---|---|
| code | CDN-0010 |
| title | ThematicBreak text content dropped |
| level | warning |
| trigger | A ThematicBreak line (`---`) contains non-whitespace, non-attribute text (e.g., `--- some text {.x}`) |
| recovery | Text between the dashes and optional `{attrs}` is silently discarded; ThematicBreak node is emitted normally |
| introduced_in | 0.1.4 |
| status | removed — the `ThematicBreak` node was deleted in 0.8.0; superseded by CDN-0016 (PageBreaker tail dropped) |
| owner | Language |

---

### CDN-0011 — Orphaned scope-chain attributes

| Field | Value |
|---|---|
| code | CDN-0011 |
| title | Orphaned scope-chain attributes |
| level | warning |
| trigger | One or more `{...}` blocks at the front of a trailing attribute chain have no slot to claim (chain has fewer slots than `{...}` blocks) |
| recovery | Excess `{...}` blocks at the front of the chain are discarded; no AST output for them. One diagnostic per chain, however many blocks are orphaned |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0012 — Heading level out of range

| Field | Value |
|---|---|
| code | CDN-0012 |
| title | Heading level out of range |
| level | warning |
| trigger | A line begins with 10 or more `=` characters followed by a space (would be heading level > 9) |
| recovery | A level-9 Section is created. The first nine `=` are the marker; the surplus `=` begin the heading content (§4.2). `loc` spans the surplus |
| introduced_in | 0.1.4 |
| status | active |
| owner | Language |

---

### CDN-0020 — Duplicate id attribute

| Field | Value |
|---|---|
| code | CDN-0020 |
| title | Duplicate id attribute |
| level | warning |
| trigger | A second `#id` or `id=` token appears in a `{...}` block after the first `id` claim has already been made |
| recovery | The duplicate token is dropped; the first `#id` or `id=` value is kept |
| introduced_in | 0.2.0 |
| status | active |
| owner | Language |

---

### CDN-0021 — `class=` conflicts with `.class` syntax

| Field | Value |
|---|---|
| code | CDN-0021 |
| title | class= conflicts with .class syntax |
| level | warning |
| trigger | None since 0.11.0. Formerly: a `class=` token appears alongside one or more `.classname` tokens in the same `{...}` block |
| recovery | None since 0.11.0: `class=` and `.classname` merge into one `class` entry (§6.1.1). Formerly: the `class=` token was dropped |
| introduced_in | 0.2.0 |
| status | deprecated — no longer emitted; the code stays reserved |
| owner | Language |

---

### CDN-0022 — Duplicate custom attribute key

| Field | Value |
|---|---|
| code | CDN-0022 |
| title | Duplicate custom attribute key |
| level | warning |
| trigger | A `key=value` token appears more than once for the same key in a `{...}` block |
| recovery | All occurrences after the first are dropped; the first value is kept |
| introduced_in | 0.2.0 |
| status | active |
| owner | Language |

---

### CDN-0013 — NamedBlock without a valid name

| Field | Value |
|---|---|
| code | CDN-0013 |
| title | NamedBlock without a valid name |
| level | warning |
| trigger | A NamedBlock opener (three or more `:` at the start of a line, outside an open NamedBlock) has no name word, or one that is not wholly `ID_LITERAL`: `:::`, `::: {.alert}`, `:::c++`, `::::` |
| recovery | A NamedBlock is opened with `name: ""`; `{attrs}` and a `## comment` on the opener are kept, and the body is parsed as blocks (§4.13). An escaped opener (`\:::`) is not an opener and emits nothing |
| introduced_in | 0.1.5 |
| status | active |
| owner | Language |

---

### CDN-0014 — Crossed inline element boundaries

| Field | Value |
|---|---|
| code | CDN-0014 |
| title | Crossed inline element boundaries |
| level | warning |
| trigger | An inline element A closes via its delimiter while an opener of a **different** inline type B (one of `**`, `__`, `~~`, `^^`, `""`, `''`, `[`) was present inside A's content and emitted as literal text — and a closer for B exists in the inline stream after A's boundary. Span points to A's closing delimiter (the crossing closer). |
| recovery | Existing greedy left-to-right behavior applies unchanged. No AST change. The diagnostic is informational only. |
| introduced_in | 0.3.2 |
| status | active |
| owner | Language |

---

### CDN-0015 — Invalid or empty Variable key

| Field | Value |
|---|---|
| code | CDN-0015 |
| title | Invalid or empty Variable key |
| level | warning |
| trigger | A `{{...}}` token contains zero characters (empty key `{{}}`) or one or more characters that are not `[a-zA-Z0-9._-]` (non-`ID_LITERAL`) |
| recovery | The entire `{{...}}` span is emitted as literal `Text`; no `Variable` node is created |
| introduced_in | 0.3.4 |
| status | active |
| owner | Language |

---

### CDN-0016 — Fence tail dropped

| Field | Value |
|---|---|
| code | CDN-0016 |
| title | Fence tail dropped |
| level | warning |
| trigger | An opener or closer line of a fence (`` ``` ``, `~~~`, `$$$`, `^^^`, `:::`, `###`), or a top-level PageBreaker line (`---`), carries text after its three symbols that the construct does not keep (§10.4.2): surplus symbols, unsupported `{attrs}`, or other text — `----`, `--- {.x}`, four backticks, `### note`, `^^^ x`, ```` ``` done ```` |
| recovery | The tail is discarded and the construct takes effect normally. `loc` spans the dropped tail |
| introduced_in | 0.8.0 |
| status | active |
| owner | Language |

---

### CDN-0017 — Page separator inside block container

| Field | Value |
|---|---|
| code | CDN-0017 |
| title | Page separator inside block container |
| level | warning |
| trigger | A blank-line-surrounded `---` line is encountered inside a block container (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`) |
| recovery | The line is emitted as `Paragraph([Text("---")])`; no page boundary is created. Page separation is a top-level construct. `loc` spans the `---` line. A `---` glued to a preceding paragraph is ordinary content and emits no diagnostic |
| introduced_in | 0.8.0 |
| status | active |
| owner | Language |

---

### CDN-0018 — Table row cell count exceeds column count

| Field | Value |
|---|---|
| code | CDN-0018 |
| title | Table row cell count exceeds column count |
| level | warning |
| trigger | A table content row or header separator has more cells than the column count fixed by the first content row (§4.8, *Table shape*) |
| recovery | The surplus cells are dropped; the row parses normally with exactly the column count of cells. Short rows are padded instead and emit nothing; a mismatched `+` decoration row is inert and emits nothing. `loc` spans the dropped cells |
| introduced_in | next |
| status | active |
| owner | Language |

---

### CDN-0030 — Meta block inside block container

| Field | Value |
|---|---|
| code | CDN-0030 |
| title | Meta block inside block container |
| level | warning |
| trigger | A `~~~` fence opener is encountered inside a block container (`ListItem`, `TaskItem`, `QuoteBlock`, or `NamedBlock`) |
| recovery | The entire raw span — including the opening `~~~` line, all content lines, and the closing `~~~` line — is emitted as a single `Paragraph` with literal text. No `Meta` node is created. |
| introduced_in | 0.2.1 |
| status | active |
| owner | Language |

---

### CDN-0031 — Mark nesting depth exceeded

| Field | Value |
|---|---|
| code | CDN-0031 |
| title | Mark nesting depth exceeded |
| level | warning |
| trigger | A `::name` `Mark` opener (§5.10) is encountered at nesting depth 9 or deeper; the maximum depth is 8 |
| recovery | The over-deep opener does not open a `Mark`. It degrades to literal `Text("::" + name)` and parsing continues immediately after it; enclosing `Mark` nodes are unaffected and still close normally. `loc` spans the rejected opener |
| introduced_in | 0.10.0 |
| status | active |
| owner | Language |

---

### CDN-0032 — Invalid path

| Field | Value |
|---|---|
| code | CDN-0032 |
| title | Invalid path |
| level | warning |
| trigger | A `PathResourceLocator` (§9.2) — in a `FileBlock`, `InjectBlock`, `ImageInline`, or page `Link` — breaks a validity rule of §9.2.5 or §5.9: an empty path, a control character, a `..` climbing above the root (paths are read from the project root, so `[x](../intro)` triggers it), or a trailing `/` after normalization outside an `InjectBlock`. An empty segment (`a//b`) is normalized away and never triggers it. A wiki link with empty text (`[]()`, §5.5) names no path and triggers it too, and so does an image source beginning with a link sigil (`#`, `^`, `~`, `@`) or with a URI scheme other than `https://` (§5.9). A value beginning with `https://` is a URL, not a path, and never triggers it |
| recovery | The owning node is emitted as usual, with `raw` as written and its locator `null`. `loc` spans the path. When `raw` begins with `http://`, the message adds the hint "did you mean https://?" — only `https://` makes a URL. When a `..` climbs above the root, the message adds the hint "paths start at the project root" |
| introduced_in | 0.11.0 |
| status | active |
| owner | Language |

---

### CDN-0033 — Invalid link target

| Field | Value |
|---|---|
| code | CDN-0033 |
| title | Invalid link target |
| level | warning |
| trigger | An id, ref, tag, or cite link target (§5.5) is empty or holds a character its kind does not admit: `[x](#)`, `[x](^a b)`, `[x](~a//b)`, `[x](~a/)`, `[x](~a/../b)`, `[x](@)` |
| recovery | The `Link` is emitted with the kind its sigil selects and `target` as written, without the sigil. `loc` spans the target |
| introduced_in | 0.11.0 |
| status | active |
| owner | Language |

---

### CDN-0034 — Class limit exceeded

| Field | Value |
|---|---|
| code | CDN-0034 |
| title | Class limit exceeded |
| level | warning |
| trigger | One `{...}` group contributes more than 32 distinct classes through `.classname` and `class=` tokens (§6.1.1) |
| recovery | The first 32 classes are kept in source order; the rest are dropped. `loc` spans the first dropped class token |
| introduced_in | 0.11.0 |
| status | active |
| owner | Language |

---

### CDN-0035 — Value exceeds limit of 2048 chars

| Field | Value |
|---|---|
| code | CDN-0035 |
| title | Value exceeds limit of 2048 chars |
| level | warning |
| trigger | A path `raw` (§9.2.5), an `EmbedBlock.url` (§4.9), or a `Link.href` (§5.5) is longer than 2048 Unicode scalar values |
| recovery | None needed: the value is kept in full, and a path is decomposed as usual. The node keeps its type. `loc` spans the value |
| introduced_in | 0.11.0 |
| status | active |
| owner | Language |

---

### CDN-0036 — Unsupported link form `[text][target]`

| Field | Value |
|---|---|
| code | CDN-0036 |
| title | Unsupported link form `[text][target]` |
| level | warning |
| trigger | The `]` closing a link text or image alt is followed directly by a second `[` that closes on the same line (§5.5): `[docs][guide]`, `![a][b]` |
| recovery | Both bracket groups are emitted as one literal `Text`, exactly as written, and parsing continues after them. The message says to write `[text](target)`. `loc` spans both groups |
| introduced_in | 0.11.0 |
| status | active |
| owner | Language |

---

### CDN-0037 — Invalid id

| Field | Value |
|---|---|
| code | CDN-0037 |
| title | Invalid id |
| level | warning |
| trigger | An `id` attribute value (`#x` or `id=x`, §6.1.1) holds a character outside `ID_VALUE` (§1.2): `{id="a b"}`, `{#a#b}` |
| recovery | The `id` entry is kept with its value as written. No id link can reach it. `loc` spans the value |
| introduced_in | 0.11.0 |
| status | active |
| owner | Language |

---

### CDN-0038 — Invalid language code

| Field | Value |
|---|---|
| code | CDN-0038 |
| title | Invalid language code |
| level | warning |
| trigger | A CodeBlock opener carries a language word that is not wholly `ID_LITERAL` (§4.4): ```` ```c++ ````, ```` ```C# ```` |
| recovery | `language` is `"text"`; the rest of the opener is read as usual. `loc` spans the word |
| introduced_in | 0.11.0 |
| status | active |
| owner | Language |

---

### CDN-0039 — Invalid Meta format

| Field | Value |
|---|---|
| code | CDN-0039 |
| title | Invalid Meta format |
| level | warning |
| trigger | A Meta opener carries a format word other than `yaml`, `toml`, or `json` in any case (§4.3): `~~~xml`, `~~~yml` |
| recovery | `format` is `"yaml"`. `loc` spans the word |
| introduced_in | 0.11.0 |
| status | active |
| owner | Language |

---
