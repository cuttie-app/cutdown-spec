## 6. Segment Attribution (Universal Attributes and Caption)

### 6.1 Universal Attributes

**AST type:** `Attribute[]` — see §A *Attributes Type* for the definition.

#### 6.1.1 Syntax

```
{#id .class key=value key="value with spaces"}
```

Token types inside `{}`:
- `#identifier` — the `#` (octothorpe) sets the `id` attribute. Emits `{ key: "id", value: "identifier" }`. First `#` wins; any subsequent `#id` or `id=` token is dropped and CDN-0020 is emitted.
  An id value is an `ID_VALUE` (§2.1), whether written `#x` or `id=x`. A value outside it — `id="a b"`, `#a#b` — is kept as written and warning CDN-0037 is emitted; no id link can reach it (§5.5). The value is converted to NFC (§2.1).
- `.classname` and `class=value` — both add to one `class` entry, `{ key: "class", value: string[] }`. Every `.x` token and every `class=` value contribute in source order; a `class=` value is split on whitespace, so `class="b c"` adds `b` and `c`. A repeated class is dropped without a diagnostic; the first occurrence keeps its place. The entry sits at the position of the first contributing token. `class=""` contributes nothing, and with no contributions there is no `class` entry.
**Example 6-1** · [`attrs-class-merge-mixed-forms`](../tests/006-universal-attributes/attrs-class-merge-mixed-forms.yaml)
  At most 32 classes are kept. Further classes are dropped and CDN-0034 is emitted.
- `key=value` — custom attribute. Emits `{ key: "key", value: "value" }`. Unquoted value: no spaces. Quoted value: spaces allowed. First occurrence wins; duplicate keys are dropped and CDN-0022 is emitted.
- `key={…}` and `key=[…]` — JSON value. When `=` is followed immediately by `{` or `[`, the value is a JSON object or array [RFC8259], and the entry holds the **parsed** value: `{data={"a":1,"b":[true,null]}}` → `{ key: "data", value: { a: 1, b: [true, null] } }`. Rules:
  - Only objects and arrays are JSON. `key=123` and `key=true` stay strings (`"123"`, `"true"`).
  - The JSON is strict [RFC8259] on one line, and it is **I-JSON** [RFC7493]; anything else degrades as described below. While scanning it, braces and brackets inside JSON strings do not count toward the closing `}` of the attribute group, and `\"` does not end a JSON string.
  - I-JSON makes three things malformed that plain JSON leaves open: an object with a repeated name, a string escape that leaves a lone surrogate (`"\uD800"`), and an out-of-range number. A number is out of range when, rounded to the nearest IEEE 754 double (round half to even), it is not finite (`1e400`), or when it is written with no fraction and no exponent and lies outside ±(2⁵³−1) (`9007199254740993`). The AST holds the rounded double: `3.14159265358979323846` is kept as the nearest double, and `9007199254740993.0` passes because the author wrote a fraction. A large id belongs in a string: `"9007199254740993"`.
  - Object names are data. `__proto__`, `constructor`, and `prototype` are ordinary names, and the AST holds them as keys like any other: `{cfg={"__proto__":1}}` → `{ key: "cfg", value: { "__proto__": 1 } }`.
  - At most 4096 Unicode scalar values and a nesting depth of 8.
  - `id` and `class` take no JSON value.
  - JSON that is malformed, over a limit, or given to `id` or `class` violates the attribute grammar: the whole `{…}` slice becomes literal text (§6.1.3).
- `key` (bare, with no `=` (equals sign)) — flag token. Emits `{ key: "key", value: "" }`. Signals a semantic hint with no associated value.
- Token order inside `{}` is preserved in the emitted `Attribute[]`.
- **At most 32 entries per group.** The `id` entry and the merged `class` entry count one each, however many tokens fed them. Entries after the 32nd are dropped and warning CDN-0041 is emitted, with the `loc` of the first dropped token. A token that only adds to an existing entry — another class, a repeated key that CDN-0022 drops — adds no entry.
- Tokens are separated by whitespace. A group may cross a soft break (§15.1): the line end separates tokens as whitespace does, and no token crosses it. An id, class, key, quoted or unquoted value, or JSON value ends at the line end, so a token split over two lines becomes two tokens — `{.cl` followed by `ass}` holds the class `cl` and the flag `ass`, and `{key=` followed by `v}` holds `key=""` and the flag `v`. If the rest is not a token (`{key` followed by `=v}`), or a quoted value is still open at the line end, the group violates the grammar (§6.1.3).

Attributes are semantic hints for the consumer, not HTML attributes; see §C.10 for the rationale.

#### 6.1.2 Placement

An attribute group always **follows** its target, never precedes it. It is written either on the target's own line, or — for a block — on the lines immediately after the block with no blank line between (*trailing attribute lines*, below). In both positions it is the same group, distributed by the same rules.

```
== Section {#intro}
**bold text** {.highlight}
:::callout {.warning}
```

Whitespace between a segment and its attaching `{...}` is consumed by the attachment and does not appear in the AST. See §15 for the full rule.

##### Block Opening Lines — Last-Attr Rule

On a heading, the **last `{...}` token at the end of its content is claimed by the Section**; on a fence opener line (CodeBlock, MathBlock, NamedBlock, SpoilerBlock), the last `{...}` token on the line is claimed by the block. All earlier `{...}` tokens on the same line follow inline attachment rules and bind to their immediately preceding inline element.

An empty `{}` as the last token explicitly assigns no attributes to the block, freeing earlier `{...}` to bind inward.

**Example 6-2** · [`attrs-heading-last-attr-inline`](../tests/006-universal-attributes/attrs-heading-last-attr-inline.yaml)

**Example 6-3** · [`attrs-heading-last-attr-empty`](../tests/006-universal-attributes/attrs-heading-last-attr-empty.yaml)

**Example 6-4** · [`attrs-heading-last-attr-simple`](../tests/006-universal-attributes/attrs-heading-last-attr-simple.yaml)

This rule applies only in block opening line context. In paragraph context all `{...}` follow inline attachment rules exclusively.

##### Per-segment placement rules

- `Meta`: no attributes supported.
- `RefDefinition`: has `attributes`.
- `Table`: see §4 for row and table attr placement.
- `List / FileGroup / QuoteBlock / Paragraph`: scope-chain rule (Rule B) — see below.
- `EmbedBlock`, `InjectBlock`: the last `{...}` on the line is claimed by the block; earlier groups have no slot and are dropped with CDN-0011.

```ebnf
ATTR_GROUP  ::= "{" ATTR_SEP* (ATTR_TOKEN (ATTR_SEP+ ATTR_TOKEN)*)? ATTR_SEP* "}"
ATTR_SEP    ::= WHITESPACE | SOFT_BREAK
ATTR_TOKEN  ::= ID_TOKEN | CLASS_TOKEN | KEY_VALUE | FLAG
ID_TOKEN    ::= "#" (CHAR - (WHITESPACE | "}" | CONTROL))+
CLASS_TOKEN ::= "." CLASS_NAME
CLASS_NAME  ::= (CHAR - (UNICODE_WHITESPACE | CONTROL | "{" | "}" | '"' | "=" | "#"))+
ATTR_KEY    ::= (ID_CHAR - ".") ID_CHAR*
FLAG        ::= ATTR_KEY
KEY_VALUE   ::= ATTR_KEY "=" (QUOTED | JSON_VALUE | UNQUOTED)?
UNQUOTED    ::= (CHAR - (WHITESPACE | CONTROL | "{" | "[" | "}" | '"')) (CHAR - (WHITESPACE | CONTROL | "}" | '"'))*
QUOTED      ::= '"' (QUOTED_CHAR | QUOTED_PAIR)* '"'
QUOTED_CHAR ::= CHAR - (CONTROL | '"' | "\")
QUOTED_PAIR ::= "\" (CHAR - CONTROL)
JSON_VALUE  ::= object | array      /* [RFC8259] §4 and §5, on one line */
```

- A key is ASCII and never begins with `.`; a class name may hold any letters, and `.a.b` is the one class `a.b`.
- An id token is recognized by its `#`; whether its value is an `ID_VALUE` (§2.1) is a separate test, and a value outside it is kept with CDN-0037.
- In a quoted value a backslash pairs with the next character, so neither `\"` nor `\\` ends the value. `\"` gives `"`. `\\` is kept for the consumer, as in every template (§5.11.1). Every other pair is kept as written.
- `key=` with nothing after the `=` gives the value `""`.
- A group that matches no `ATTR_GROUP` violates the grammar (§6.1.3).

- `Cell`, `Column`, `Page`, `Document`: no attributes supported.

##### Scope-chain rule (Rule B)

A sequence of `{attr}` blocks at the end of an inline context is distributed **right-to-left** through a scope chain. The **last** `{}` in the sequence is claimed by the **highest segment** in the current hierarchy; each preceding `{}` claims the next lower segment. Any `{}` blocks at the front of the sequence that have no segment to claim are dropped with CDN-0011 (§6.1.3).

An empty `{}` is valid syntax. It claims its slot and assigns nothing to that segment's attributes.

`{...}` is tokenized **atomically** — the interior is never parsed as inline markup. If the `{` (left brace) has no matching `}` (right brace) before end of inline context, the slice from `{` to the end of its own line is emitted as one verbatim `Text` run (Class 2 degradation, §12.1.4.1; see §6.1.3).

**Scope slots by context:**

| Context | Slot 1 (last `{}`) | Slot 2 | Slot 3 |
|---|---|---|---|
| Standalone Paragraph | Paragraph | last attr-bearing inline | — |
| List item — last item of its List | List | ListItem | last attr-bearing inline |
| List item — any other item | ListItem | last attr-bearing inline | — |
| Table row — mid-table, cell open | Row | last attr-bearing inline | — |
| Table row — mid-table, cell sealed | Row | — | — |
| Table row — last row, cell open | Table | Row | last attr-bearing inline |
| Table row — last row, cell sealed | Table | Row | — |
| FileBlock line | FileGroup | FileBlock | — |
| QuoteBlock nesting (`> >`) | outermost QuoteBlock | … inner levels … | Paragraph → inline |

The chain is computed on the parsed blocks. When a container then holds its one paragraph as inline content (§4.6, §4.7.1), whatever the paragraph claimed moves to the container.

**List items.** Only the last item of a `List` reaches the `List`, as only the last row reaches the `Table`. Every other item's chain starts at its own `ListItem` or `TaskItem`, so each `List` has one claimant. Whether an item is last is known at the next line (one-block emission latency, §12). A nested item reaches only its own `List`.

**Example 6-5** · [`attrs-scope-chain-list-mid-item`](../tests/006-universal-attributes/attrs-scope-chain-list-mid-item.yaml)

**Example 6-6** · [`attrs-scope-chain-list`](../tests/006-universal-attributes/attrs-scope-chain-list.yaml)

**Table rows.** `Cell` bears no attributes (see *Per-segment placement rules* above), so the chain walks **past** the cell to the last attr-bearing inline inside it. Whether that slot exists depends on the trailing `|` (pipe):

- **Cell open** — the row omits the trailing `|`, so the chain sits inside the last cell's inline context and the inline slot is available.
- **Cell sealed** — the row writes the trailing `|`, closing the last cell's inline context before the chain begins. There is no open inline context, so the inline slot does not exist and the chain stops at `Row`.

**A chain written before the closer belongs to the cell, not the row.** Every cell is its own inline context, so Rule B applies inside it with the cell's own slots — and since `Cell` bears no attributes, the only slot is that cell's last attr-bearing inline. This holds for any cell, not just the last.

**Example 6-7** · [`table-attrs-open-cell-single`](../tests/004-block-segments/table-attrs-open-cell-single.yaml)

**Example 6-8** · [`table-attrs-last-row-single`](../tests/004-block-segments/table-attrs-last-row-single.yaml)

**Example 6-9** · [`table-cell-inline-attrs-before-closer`](../tests/004-block-segments/table-cell-inline-attrs-before-closer.yaml)

**Example 6-10** · [`table-cell-inline-attrs-non-final-cell`](../tests/004-block-segments/table-cell-inline-attrs-non-final-cell.yaml)

So the closer sets how deep the row chain reaches, and the chain's position relative to the closer selects which chain applies. A cell chain has exactly one slot; a second group orphans (CDN-0011).

The slot searches the **last cell only**. If that cell holds no attr-bearing inline, the slot goes unclaimed and the `{}` is dropped with CDN-0011 (§6.1.3) — the chain never scans sideways into an earlier cell, exactly as `- text {.a}{.b}{.c}` drops `.a` rather than hunting leftward.

**Example 6-11** · [`table-scope-chain-inline-open-cell`](../tests/004-block-segments/table-scope-chain-inline-open-cell.yaml)

**Example 6-12** · [`table-scope-chain-inline-sealed-cell`](../tests/004-block-segments/table-scope-chain-inline-sealed-cell.yaml)

**Example 6-13** · [`table-scope-chain-inline-last-cell-only`](../tests/004-block-segments/table-scope-chain-inline-last-cell-only.yaml)

Single NL does not break the attr chain. A sequence of `{}` blocks may span multiple lines (one per line) as long as no blank line appears between them.

**Example 6-14** · [`attrs-scope-chain-mark`](../tests/006-universal-attributes/attrs-scope-chain-mark.yaml)

**Example 6-15** · [`attrs-scope-chain-mark-2`](../tests/006-universal-attributes/attrs-scope-chain-mark-2.yaml)

**Example 6-16** · [`attrs-scope-chain-mark-1`](../tests/006-universal-attributes/attrs-scope-chain-mark-1.yaml)

**Example 6-17** · [`attrs-scope-chain-mark-empty`](../tests/006-universal-attributes/attrs-scope-chain-mark-empty.yaml)

**Example 6-18** · [`attrs-scope-chain-mark-noop`](../tests/006-universal-attributes/attrs-scope-chain-mark-noop.yaml)

**Example 6-19** · [`attrs-scope-chain-text`](../tests/006-universal-attributes/attrs-scope-chain-text.yaml)

**Example 6-20** · [`attrs-scope-chain-text-1`](../tests/006-universal-attributes/attrs-scope-chain-text-1.yaml)

**Example 6-21** · [`attrs-scope-chain-text-3`](../tests/006-universal-attributes/attrs-scope-chain-text-3.yaml)

Same rule applies to `FileGroup`. Each `FileBlock` line has two slots: its `FileGroup` and itself.

**Example 6-22** · [`attrs-scope-chain-fileblock`](../tests/006-universal-attributes/attrs-scope-chain-fileblock.yaml)

**Example 6-23** · [`attrs-scope-chain-fileblock-1`](../tests/006-universal-attributes/attrs-scope-chain-fileblock-1.yaml)

**Example 6-24** · [`attrs-scope-chain-fileblock-empty`](../tests/006-universal-attributes/attrs-scope-chain-fileblock-empty.yaml)

**Example 6-25** · [`attrs-scope-chain-fileblock-noop`](../tests/006-universal-attributes/attrs-scope-chain-fileblock-noop.yaml)

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

`{` is always consumed as the start of an attribute scan, running to the matching `}`, which is searched for through the inline context. If the content violates the attribute grammar or the `}` never arrives, the **slice** from `{` — braces included, when present — to the `}` or to the end of the `{`'s own line, whichever comes first, is emitted as one verbatim `Text` run and is never inline-parsed (Class 2 degradation, §12.1.4.1). This is the intentional literal-span idiom: `{a **b**}` is the literal text `{a **b**}`. Consequence: any future extension of the attribute grammar is a breaking change for text relying on this idiom.

Writing `\{` makes a literal brace explicit:

**Example 6-26** · [`attrs-escape-brace`](../tests/006-universal-attributes/attrs-escape-brace.yaml)

#### 6.1.4 Attribute Inside Link Text

`{attrs}` appearing inside `[...]` follows paragraph rules: it attaches to the preceding inline element, or is dropped if no preceding inline element exists.

**Example 6-27** · [`attrs-link-text`](../tests/006-universal-attributes/attrs-link-text.yaml)

**Example 6-28** · [`attrs-link-text-orphan`](../tests/006-universal-attributes/attrs-link-text-orphan.yaml)

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
- a standalone `## comment` line directly after the block (attaches backwards, §7.2).

**Example 6-29** · [`caption-attrs-own-line`](../tests/006-universal-attributes/caption-attrs-own-line.yaml)

**Example 6-30** · [`caption-comment-own-line-transparent`](../tests/006-universal-attributes/caption-comment-own-line-transparent.yaml)

**Single-line only.** A caption is exactly one line. A second consecutive `^ ` line fails condition 2, so it orphans.

The "preceding block" is always resolved within the current block scope (§2.5). A `^ ` line inside a `NamedBlock` binds to the last captionable child of that `NamedBlock`, not to anything outside it.

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

**Example 6-31** · [`caption-fileblock-does-not-split-group`](../tests/006-universal-attributes/caption-fileblock-does-not-split-group.yaml)

**Inline content.** The caption text is parsed by the full inline rule set:

- `##` behaves normally — consumes to EOL; the payload goes to the captioned node's `reflections` at the caption line's offset, or, for a `Table`, to its last row (§7.2).
- `{{variable}}` is allowed — `Variable` nodes are valid caption content.
- A trailing `{attrs}` sequence at end of the caption line is emitted as literal text and does not attach to anything → warning CDN-0009. Caption text inherits no scope-chain slot; the parent block's attributes are set independently.

**Escaping.** `\^` at line start suppresses the caption opener → `Paragraph([Text("^ ...")])`. See §13.2.

**Example 6-32** · [`caption-table-basic`](../tests/006-universal-attributes/caption-table-basic.yaml)

**Example 6-33** · [`caption-quoteblock`](../tests/006-universal-attributes/caption-quoteblock.yaml)

---
