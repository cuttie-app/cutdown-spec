## 6. Segment Attribution (Universal Attributes and Caption)

### 6.1 Universal Attributes

**AST type:** `Attribute[]` — see §14 *Attributes Type* for the definition.

#### 6.1.1 Syntax

```
{#id .class key=value key="value with spaces"}
```

Token types inside `{}`:
- `#identifier` — the `#` (octothorpe) sets the `id` attribute. Emits `{ key: "id", value: "identifier" }`. First `#` wins; any subsequent `#id` or `id=` token is dropped and CDN-0020 is emitted.
  An id value is an `ID_VALUE` (§1.2), whether written `#x` or `id=x`. A value outside it — `id="a b"`, `#a#b` — is kept as written and warning CDN-0037 is emitted; no id link can reach it (§5.5).
- `.classname` and `class=value` — both add to one `class` entry, `{ key: "class", value: string[] }`. Every `.x` token and every `class=` value contribute in source order; a `class=` value is split on whitespace, so `class="b c"` adds `b` and `c`. A repeated class is dropped without a diagnostic; the first occurrence keeps its place. The entry sits at the position of the first contributing token. `class=""` contributes nothing, and with no contributions there is no `class` entry.
  ```
  {.a class="b c" .d .a}  →  [{ key: "class", value: ["a", "b", "c", "d"] }]
  ```
  At most 32 classes are kept. Further classes are dropped and CDN-0034 is emitted.
- `key=value` — custom attribute. Emits `{ key: "key", value: "value" }`. Unquoted value: no spaces. Quoted value: spaces allowed. First occurrence wins; duplicate keys are dropped and CDN-0022 is emitted.
- `key={…}` and `key=[…]` — JSON value. When `=` is followed immediately by `{` or `[`, the value is a JSON object or array (RFC 8259), and the entry holds the **parsed** value: `{data={"a":1,"b":[true,null]}}` → `{ key: "data", value: { a: 1, b: [true, null] } }`. Rules:
  - Only objects and arrays are JSON. `key=123` and `key=true` stay strings (`"123"`, `"true"`).
  - The JSON must be strict and on one line. While scanning it, braces and brackets inside JSON strings do not count toward the closing `}` of the attribute group, and `\"` does not end a JSON string.
  - At most 4096 Unicode scalar values and a nesting depth of 8.
  - `id` and `class` take no JSON value.
  - JSON that is malformed, over a limit, or given to `id` or `class` violates the attribute grammar: the whole `{…}` slice becomes literal text (§6.1.3).
- `key` (bare, with no `=` (equals sign)) — flag token. Emits `{ key: "key", value: "" }`. Signals a semantic hint with no associated value.
- Token order inside `{}` is preserved in the emitted `Attribute[]`.

> **Philosophy:** Universal Attributes are semantic hints for consumers — they are not one-to-one mappings to HTML attributes. A bare `{banner}` does not mean `<div banner>`; it means "this element has the semantic role 'banner'." The consuming application decides how to expand, map, or ignore any attribute token. Cutdown makes no assumption about the rendering target.

#### 6.1.2 Placement

An attribute group always **follows** its target, never precedes it. It is written either on the target's own line, or — for a block — on the lines immediately after the block with no blank line between (*trailing attribute lines*, below). In both positions it is the same group, distributed by the same rules.

```
== Section {#intro}
**bold text** {.highlight}
:::callout {.warning}
```

Whitespace between a segment and its attaching `{...}` is consumed by the attachment and does not appear in the AST. See §12 for the full rule.

##### Block Opening Lines — Last-Attr Rule

On lines that open a block construct (headings, named blocks), the **last `{...}` token on the line is claimed by the block**. All earlier `{...}` tokens on the same line follow inline attachment rules and bind to their immediately preceding inline element.

An empty `{}` as the last token explicitly assigns no attributes to the block, freeing earlier `{...}` to bind inward.

```
= Heading **bold**{.b} {#h}    →  Section({id:"h"},  [Text("Heading "), Strong({class:"b"}, "bold")])
= Heading **bold**{.b} {}      →  Section({},        [Text("Heading "), Strong({class:"b"}, "bold")])
= Heading **bold** {#h}        →  Section({id:"h"},  [Text("Heading "), Strong("bold")])
```

This rule applies only in block opening line context. In paragraph context all `{...}` follow inline attachment rules exclusively.

##### Per-segment placement rules

- `Meta`: no attributes supported.
- `RefDefinition`: has `attributes`.
- `Table`: see §4 for row and table attr placement.
- `List / FileGroup / QuoteBlock / Paragraph`: scope-chain rule (Rule B) — see below.
- `EmbedBlock`, `InjectBlock`: the last `{...}` on the line is claimed by the block; earlier groups have no slot and are dropped with CDN-0011.
- `Cell`, `Column`, `Page`, `Document`: no attributes supported.

##### Scope-chain rule (Rule B)

A sequence of `{attr}` blocks at the end of an inline context is distributed **right-to-left** through a scope chain. The **last** `{}` in the sequence is claimed by the **highest segment** in the current hierarchy; each preceding `{}` claims the next lower segment. Any `{}` blocks at the front of the sequence that have no segment to claim are **silently dropped**.

An empty `{}` is valid syntax. It claims its slot and assigns nothing to that segment's attributes.

`{...}` is tokenized **atomically** — the interior is never parsed as inline markup. If the `{` (left brace) has no matching `}` (right brace) before end of inline context, the entire slice from `{` to end of line is emitted as one verbatim `Text` run (Class 2 degradation, §9.1.4.1; see §6.1.3).

**Scope slots by context:**

| Context | Slot 1 (last `{}`) | Slot 2 | Slot 3 |
|---|---|---|---|
| Standalone Paragraph | Paragraph | last attr-bearing inline | — |
| List item | List | ListItem | last attr-bearing inline |
| Table row — mid-table, cell open | Row | last attr-bearing inline | — |
| Table row — mid-table, cell sealed | Row | — | — |
| Table row — last row, cell open | Table | Row | last attr-bearing inline |
| Table row — last row, cell sealed | Table | Row | — |
| FileBlock line | FileGroup | FileBlock | — |
| QuoteBlock nesting (`> >`) | outermost QuoteBlock | … inner levels … | Paragraph → inline |

**Table rows.** `Cell` bears no attributes (see *Per-segment placement rules* above), so the chain walks **past** the cell to the last attr-bearing inline inside it. Whether that slot exists depends on the trailing `|` (pipe):

- **Cell open** — the row omits the trailing `|`, so the chain sits inside the last cell's inline context and the inline slot is available.
- **Cell sealed** — the row writes the trailing `|`, closing the last cell's inline context before the chain begins. There is no open inline context, so the inline slot does not exist and the chain stops at `Row`.

**A chain written before the closer belongs to the cell, not the row.** Every cell is its own inline context, so Rule B applies inside it with the cell's own slots — and since `Cell` bears no attributes, the only slot is that cell's last attr-bearing inline. This holds for any cell, not just the last.

```
| AA | **BB** {.a}         →  Table({.a}, Row(...))          ← open: row chain, slot 1 = Table
| AA | **BB** | {.a}       →  Table({.a}, Row(...))          ← after the closer: row chain
| AA | **BB** {.a} |       →  Row(Cell(...), Cell(Strong({.a}, "BB")))   ← before the closer: cell chain
| **AA** {.x} | BB |       →  Row(Cell(Strong({.x}, "AA")), Cell("BB"))  ← non-final cell
```

So the closer sets how deep the row chain reaches, and the chain's position relative to the closer selects which chain applies. A cell chain has exactly one slot; a second group orphans (CDN-0011).

The slot searches the **last cell only**. If that cell holds no attr-bearing inline, the slot goes unclaimed and the `{}` is dropped with CDN-0011 (§6.1.3) — the chain never scans sideways into an earlier cell, exactly as `- text {.a}{.b}{.c}` drops `.a` rather than hunting leftward.

```
| AA | **BB** {.a}{.b}{.c}       →  Table({.c}, Row({.b}, Cell(...), Cell(Strong({.a}, "BB"))))
| AA | **BB** | {.a}{.b}{.c}     →  Table({.c}, Row({.b}, ...))              ← sealed; {.a} dropped
| AA | **BB** | CC {.a}{.b}{.c}  →  Table({.c}, Row({.b}, ...))              ← last cell is Text; {.a} dropped
```

Single NL does not break the attr chain. A sequence of `{}` blocks may span multiple lines (one per line) as long as no blank line appears between them.

```
- ::sp:: {.a}{.b}{.c}  →  List({.c}, ListItem({.b}, Mark({.a})))

- ::sp:: {.a}{.b}      →  List({.b}, ListItem({.a}, Mark()))

- ::sp:: {.a}          →  List({.a}, ListItem(Mark()))

- ::sp:: {}            →  List({},   ListItem(Mark()))     ← {} no-op on List

- ::sp:: {.a}{}        →  List({},   ListItem({.a}, Mark())) ← {} no-op on List; {.a} to ListItem

- text {.a}{.b}      →  List({.b}, ListItem({.a}, Text("text")))

- text {.a}          →  List({.a}, ListItem(Text("text")))

- text {.a}{.b}{.c}  →  List({.c}, ListItem({.b}, Text("text")))   ← {.a} dropped (Text has no attrs)
```

Same rule applies to `FileGroup`. Each `FileBlock` line has two slots: its `FileGroup` and itself.

```
/img.png {.a}{.b}   →  FileGroup({.b}, FileBlock({.a}, ...))
/img.png {.a}       →  FileGroup({.a}, FileBlock(...))
/img.png {}         →  FileGroup({},   FileBlock(...))    ← {} no-op on group
/img.png {.a}{}     →  FileGroup({},   FileBlock({.a}, ...))
```

Multiline equivalents (all produce identical AST):

```
- li item {.a}{.b}

- li item
  {.a}{.b}

- li item
  {.a}
  {.b}
```

##### Trailing attr lines and loose-list detection

A line consisting solely of `{attrs}` immediately after a list item with no preceding blank line is a **trailing attr line**, not a blank line. Loose list detection ignores trailing attr lines.

```
- item one
{.attrs}         ← trailing attr line, NOT a blank line → list stays tight
- item two

- item one

{.attrs}         ← blank line precedes → list is loose; {.attrs} is orphaned (literal)
- item two
```

`{attrs}` may appear at the end of a Paragraph or ListItem either on the same line as the final content line, or on the immediately following line (no blank line between). A line consisting solely of `{attrs}` immediately after a paragraph (no blank line) is consumed as part of the paragraph's scope chain and does not start a new block.

#### 6.1.3 Orphan Attributes

An `{...}` sequence that cannot be assigned to any segment in the current scope chain is an **orphan**.

Orphan behaviour depends on position:

| Position | Behaviour | Example |
|---|---|---|
| Middle of inline content (no preceding attr-bearing segment, slots exhausted) | `Text("{...}")` emitted verbatim | `price is {high}` → `Text("price is ")` + `Text("{high}")` |
| After a double blank line (own block, no following content claims it) | `Text("{...}")` emitted verbatim | |
| End of scope chain, all slots filled, excess `{}` at the front | dropped (no AST output), **CDN-0011** emitted | `{.x}{.a}{.b}` on a 2-slot context → `{.x}` dropped |

`{` is always consumed as the start of an attribute scan, running to the matching `}` or end of line. If the content violates the attribute grammar or the `}` never arrives, the **entire slice** — braces included, when present — is emitted as one verbatim `Text` run and is never inline-parsed (Class 2 degradation, §9.1.4.1). This is the intentional literal-span idiom: `{a **b**}` is the literal text `{a **b**}`. Consequence: any future extension of the attribute grammar is a breaking change for text relying on this idiom.

Authors who want a literal `{` SHOULD escape it with `\{` to make intent explicit:

```
price is \{high\}  →  Text("price is {high}")
```

#### 6.1.4 Attribute Inside Link Text

`{attrs}` appearing inside `[...]` follows paragraph rules: it attaches to the preceding inline element, or is dropped if no preceding inline element exists.

```
[**bold** {.foo}](https://a.b)  →  Link { children: [Strong({class:"foo"}, "bold")], href: "https://a.b" }
[{.foo} text](https://a.b)      →  Link { children: [Text("text")], href: "https://a.b" }   ({.foo} dropped)
```

### 6.2 Caption

A caption line enriches the immediately preceding captionable block with a `caption` field. It does not produce a separate AST node.

**Syntax:**

```
^ inline-content
```

A line at block start consisting of `^` (caret) followed by a single space and then any inline content. The `^` and space are consumed; the remainder is parsed as `Inline[]`.

**Binding rule:** A caption line binds to the immediately preceding block in the current block scope when all three hold:

1. That block is captionable (see table below);
2. No caption line has bound to that block yet;
3. No blank line separates the block's last line from the `^ ` line.

Inside a `FileGroup`, the immediately preceding block is the `FileBlock` on the line above. The caption binds to that `FileBlock` and the group continues.

Condition 2 is a fact about the parse, not about the AST: a bare `^ ` line binds and yields `caption: []`, which looks the same as no caption, yet it still fills the slot.

**Otherwise the caption line is orphaned:** it becomes a `Paragraph` containing the line verbatim, and warning CDN-0008 is emitted.

Lines that emit no block are **transparent** — they are not "the immediately preceding block" and do not break binding. Any number of them may intervene:

- a trailing `{attrs}` line (sets the block's attributes; emits no node);
- a standalone `## comment` line directly after the block (attaches backwards, §2.2).

```
| col |
{#tbl-one}
^ Caption text   →  Table { caption: [...], attributes: [{id:"tbl-one"}] }

| col |
## editorial note
^ Caption text   →  Table { caption: [...], rows: [Row { reflection: [{ loc: { start: 11, end: 25 }, text: "editorial note" }] }] }
```

**Single-line only.** A caption is exactly one line. A second consecutive `^ ` line fails condition 2, so it orphans.

The "preceding block" is always resolved within the current block scope (§1.6). A `^ ` line inside a `NamedBlock` binds to the last captionable child of that `NamedBlock`, not to anything outside it.

**Captionable blocks and their AST fields:**

| Block | Field added |
|---|---|
| `Table` | `caption: Inline[]` |
| `CodeBlock` | `caption: Inline[]` |
| `MathBlock` | `caption: Inline[]` |
| `FileBlock` | `caption: Inline[]` |
| `EmbedBlock` | `caption: Inline[]` |
| `NamedBlock` | `caption: Inline[]` |
| `SpoilerBlock` | `caption: Inline[]` |
| `QuoteBlock` | `caption: Inline[]` |

All captionable blocks carry `caption: []` when no caption line binds. `FileGroup` and `InjectBlock` are not captionable.

**`FileBlock` captions do not split the group.** A `^ ` line binds to the `FileBlock` above it, and the next `FileBlock` line stays in the same `FileGroup`:

```
/a.png
^ First image
/b.png
^ Second image     →  FileGroup(FileBlock(caption: "First image"), FileBlock(caption: "Second image"))
```

**Inline content.** The caption text is parsed by the full inline rule set:

- `##` behaves normally — consumes to EOL; the payload goes to the captioned node's `reflection` at the caption line's offset, or, for a `Table`, to its last row (§2.2).
- `{{variable}}` is allowed — `Variable` nodes are valid caption content.
- A trailing `{attrs}` sequence at end of the caption line is emitted as literal text and does not attach to anything → warning CDN-0009. Caption text inherits no scope-chain slot; the parent block's attributes are set independently.

**Escaping.** `\^` at line start suppresses the caption opener → `Paragraph([Text("^ ...")])`. See §8.2.

**Example:**

```
Input:
  | Name | Score |
  |:-----|------:|
  | Alice |   42 |
  ^ Results from the first cohort

AST:
  Table {
    caption: [Text("Results from the first cohort")],
    rows: [Row(_type:"Header",...), Row(_type:"Row",...)],
    attributes: []
  }

Input:
  > To be, or not to be.
  ^ William Shakespeare, __Hamlet__, Act 3

AST:
  QuoteBlock {
    caption: [Text("William Shakespeare, "), Emphasis([Text("Hamlet")]), Text(", Act 3")],
    children: [Paragraph([Text("To be, or not to be.")])],
    attributes: []
  }
```

---
