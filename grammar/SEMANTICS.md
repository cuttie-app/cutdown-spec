---
title: Cutdown Semantic Pass Specification
status: Active
version: 0.2.0
scope: CST → AST transformation rules applied after PEG recognition
related:
  - GRAMMAR.peg
  - ../spec/007-document-model.md
  - ../spec/009-block-elements.md
  - ../spec/005-universal-attributes.md
---

# Cutdown Semantic Pass Specification

## Overview

`GRAMMAR.peg` defines the recognition grammar: it determines which sequences of
characters are valid Cutdown input and produces a **Concrete Syntax Tree (CST)**.

This document defines the **semantic passes** that transform the CST into the
final **AST** described in §14 of the spec.

Passes are applied in the order listed below. Each pass is a deterministic
tree-rewriting operation.

---

## Pass Order

| Pass | Name | Input | Output |
|------|------|-------|--------|
| S1 | Input normalization | raw bytes | normalized character stream |
| S2 | Comment stripping | character stream | character stream |
| S3 | Inline text merging | inline CST nodes | merged `Text` nodes |
| S4 | Attribute conflict resolution | `Attributes` nodes | deduplicated `Attribute[]` |
| S5 | Scope-chain distribution | `AttrChain` nodes | attributes assigned to target nodes |
| S6 | QuoteBlock content reparsing | `QuoteLine[]` | `QuoteBlock { children: Block[] }` |
| S7 | NamedBlock indentation collapsing | `NamedBlock` raw lines | normalized content lines |
| S8 | FileRefGroup merging | consecutive `FileRef`/`ImageBlock` | `FileRefGroup` wrappers |
| S9 | List loose detection | `List` nodes | `List.loose` flag set |
| S10 | RefDefinition deduplication | `RefDefinition[]` | last-wins per `id` |
| S11 | Page splitting | flat `Block[]` | `Page[]` with `ThematicBreak` / `Meta` boundaries |
| S12 | Section nesting | `Page.children` flat sequence | nested `Section` tree |

---

## S1 — Input Normalization  (§2)

Applied to the raw byte stream before PEG recognition.

1. Decode as UTF-8.
2. Strip a leading BOM (`U+FEFF`) if present.
3. Replace null bytes (`U+0000`) with `U+FFFD`.
4. Normalize all line endings (`\r\n`, `\r`) to `\n`.
5. Ensure the input ends with `\n`. If the last character is not `\n`, append one.
6. HTML entities are **not** decoded. `&amp;` is literal text in Cutdown.

---

## S2 — Comment Stripping  (§8.3)

Applied during block boundary analysis, before block classification.

- A line whose first non-indentation character is `#` is a **comment line**.
- Comment lines are removed from the line stream.
- Comment lines are **not** blank lines — they do not create block boundaries.

---

## S3 — Inline Text Merging  (§10.1)

Applied after inline parsing of any inline context (paragraph, heading, cell, etc.).

- Consecutive `Text` nodes in the same `children` array **MUST** be merged into
  a single `Text` node.
- Merging is applied bottom-up: children are merged before their parent.
- A soft break (single `\n` within a paragraph) becomes a space character `" "`
  during inline parsing; after soft-break normalization, adjacent text tokens
  are merged.
- `CodeInline` is exempt from whitespace collapsing but **not** from soft-break
  normalization: a `\n` inside ` `` `` ` becomes a space in `CodeInline.value`.

---

## S4 — Attribute Conflict Resolution  (§5.1)

Applied to each `Attributes` node (`{…}` block) independently.

Tokens within a single `{…}` block are processed left-to-right:

1. **`#id` / `id=` conflict (CDN-0020):**
   The first `#identifier` or `id="…"` token sets `id`. Any subsequent
   `#identifier` or `id=` token in the same block is dropped and CDN-0020 is
   emitted.
   Priority: `#hash` syntax and `id=` syntax are equal; first occurrence wins.

2. **`.class` vs `class=` conflict (CDN-0021):**
   All `.classname` tokens are collected into the `class` entry (`string[]`).
   If a `class="…"` token appears alongside any `.classname` token, the
   `class=` token is dropped and CDN-0021 is emitted.
   If only `class="…"` is present (no `.classname`), it is accepted as a
   single-element class list.

3. **Duplicate custom key (CDN-0022):**
   For any key that appears more than once in the same `{…}` block, the first
   occurrence wins. All subsequent occurrences are dropped and CDN-0022 is
   emitted.

**Output type:**
```
Attribute =
  | { key: "id",    value: string }
  | { key: "class", value: string[] }
  | { key: string,  value: string }   // value: "" for bare-key tokens
```

Entries appear in **source order** after deduplication.

---

## S5 — Scope-Chain Distribution  (§5.2)

Applied to every `AttrChain` node (one or more consecutive `{…}` blocks trailing
a block construct or inline element).

**Algorithm:**

1. Determine the **scope slots** for the current context (see table below).
2. Let `chain = [a₁, a₂, …, aₙ]` be the `AttrChain` tokens in source order
   (left to right).
3. Assign right-to-left: `aₙ → slot[1]`, `aₙ₋₁ → slot[2]`, etc.
4. Any `aᵢ` at the front of the chain with no slot to claim is **orphaned**:
   emit CDN-0011 and produce no AST output for that token.
5. An empty `{}` is valid syntax — it claims its slot and assigns no attributes
   to that node (leaving the node's `attributes` as `null` or `[]`).

**Scope slots by context:**

| Context | Slot 1 (last `{}`) | Slot 2 | Slot 3 |
|---|---|---|---|
| Heading line | `Section` | last attr-bearing inline | — |
| NamedBlock opener | `NamedBlock` | last attr-bearing inline | — |
| Standalone Paragraph | `Paragraph` | last attr-bearing inline | — |
| List item | `List` | `ListItem` | last attr-bearing inline |
| Table row — mid-table | `Row` | — | — |
| Table row — last row | `Table` | `Row` | — |
| FileRef / ImageBlock in group | `FileRefGroup` | `FileRef` / `ImageBlock` | last attr-bearing inline |
| Inline element (paragraph context) | inline element | — | — |

**Single-NL transparency:** A sequence of `{…}` blocks may span multiple lines
(one per line) as long as no blank line appears between them.

---

## S6 — QuoteBlock Content Reparsing  (§9.6)

Applied to each `QuoteBlock` node after recognition.

1. Collect all `QuoteLine` nodes in the block.
2. For each line, strip the leading `>` characters (equal to the nesting depth)
   and one optional following space.
3. Reassemble the stripped lines into a text buffer.
4. Reparse the buffer as a full `Block*` sequence (recursive — may produce
   nested `QuoteBlock` nodes).
5. Replace the `QuoteLine[]` children with the reparsed `Block[]`.

Nesting depth: count the leading `>` characters on the first line of the group.
`>>` = outer block contains an inner `QuoteBlock`.

---

## S7 — NamedBlock Indentation Collapsing  (§9.10)

Applied to each `NamedBlock` before its content is parsed as blocks.

1. Examine the first non-blank content line inside the `:::name` opener.
2. Count its leading spaces — this is the **base indentation** `n`.
3. Strip exactly `n` leading spaces from every content line. Lines with fewer
   than `n` leading spaces have all available leading spaces stripped.
4. The closing `:::` is recognized regardless of its own indentation.
5. Parse the stripped lines as `Block*`.

---

## S8 — FileRefGroup Merging  (§9.9.2)

Applied to the `children` array of each `Page` (and `NamedBlock`, `ListItem`, etc.)
after block parsing.

**Algorithm:**

1. Walk the block list sequentially.
2. When a `FileRef` or `ImageBlock` node is encountered with a known group
   (`"image"`, `"video"`, `"audio"`):
   - Start (or extend) a `FileRefGroup` for that group.
   - Subsequent `FileRef` / `ImageBlock` nodes with the **same** group and **no
     blank line** between them are appended to the same `FileRefGroup`.
3. A blank line or a node with a different group ends the current group.
4. `FileRef` nodes with `group: null` are never grouped.
5. Wrap the collected nodes in `FileRefGroup { group, children }`.

---

## S9 — List Loose Detection  (§9.7.3)

Applied to each `List` node after its items are parsed.

- A `List` is **loose** if any blank line appears **between** two of its items.
- Intra-item blank lines (within a single item) do **not** trigger looseness.
- Trailing attr lines (lines consisting solely of `{…}`) immediately after an
  item with no preceding blank line are **not** blank lines for this purpose.
- When loose, set `List.loose = true`. Default is `false`.
- `loose` is an advisory flag. It does not alter `ListItem.children`.

---

## S10 — RefDefinition Deduplication  (§9.11)

Applied document-wide after all blocks are parsed.

- Collect all `RefDefinition` nodes across the document.
- For each `id`, keep only the **last** definition encountered in document order.
- Discard earlier definitions with the same `id` (no diagnostic emitted).

Rationale: a host document can override any definition from a transcluded
fragment by placing its own definition after the include point. First-wins would
make override order depend on fragment inclusion order, which is unpredictable.

---

## S11 — Page Splitting  (§7.4)

Applied to the flat block sequence produced by the document parser.

**Rules:**

1. Every document starts with one open `Page { meta: null, children: [] }`.
2. When a `ThematicBreak` node is encountered:
   - Close the current `Page`.
   - Open a new `Page`.
   - The `ThematicBreak` becomes the **first child** of the new `Page`.
3. When a `MetaBlock` node is encountered:
   - If the current `Page.meta` is `null`: set `Page.meta` to this `Meta` node.
     The `MetaBlock` does **not** appear in `Page.children`.
   - If the current `Page.meta` is already set: close the current `Page`, open
     a new `Page`, set its `meta` to this `Meta` node.
4. A `Page` with `meta: null` and `children: []` is a **Ghost Page** — a valid
   `Page` node. Ghost Pages arise when:
   - The document is empty (one Ghost Page emitted).
   - A `ThematicBreak` opens a new `Page` that receives no content before the
     next `ThematicBreak` or end of document.

---

## S12 — Section Nesting  (§7.1)

Applied per `Page` after page splitting. Transforms a flat sequence of blocks
into a nested `Section` tree.

**Algorithm:**

Maintain a stack of open `Section` nodes. For each block in `Page.children`:

1. If the block is a `Heading` of level `n`:
   - Pop all sections from the stack with `level >= n`.
   - Create `Section { level: n, heading: <heading inline content>, children: [] }`.
   - If the stack is non-empty, append the new section to the top section's
     `children`. Otherwise append to `Page.children`.
   - Push the new section onto the stack.
2. Otherwise:
   - If the stack is non-empty, append the block to the top section's `children`.
   - Otherwise append to `Page.children`.

**Scope:** Sections are scoped to the containing block context. A `Section` never
crosses a `Page` boundary. `NamedBlock`, `QuoteBlock`, and `ListItem` each have
their own independent section scope when they contain heading-like content — but
note that headings inside those containers are treated as paragraph content by
the block parser (§8.1), so nested headings do not arise in practice.

---
