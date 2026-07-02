## 9. Parsing Algorithm

Cutdown's parsing model makes three testable guarantees:

1. **Single pass.** Every character of input is scanned a bounded number of times; parsing is linear time in input length. Degradation emits verbatim substrings identified by source offset — committed text is never re-lexed or re-inline-parsed.
2. **Bounded lookahead.** At most one line at block level; at most to end of line at inline level.
3. **Deferred attachment.** Structural decisions may be deferred, but deferred decisions only attach or regroup already-built nodes — they never re-parse text. The deferral windows are: one-block emission latency (a caption line or attribute-continuation line may bind to the preceding block), multiline table buffering until the table closes, and open-inline buffering until end of line.

### 9.1 Phase 1 — Input Interpretation

1. Validate UTF-8.
2. Apply the interpretive rules of §7: `\r\n` / `\r` / `\n` all read as line terminators, tabs outside fences read as single spaces, leading BOM skipped. The source text is never rewritten — all offsets index the raw input (§14, Location Type).

### 9.2 Phase 2 — Block Identification

1. Split input into lines.
2. **Detect `##` boundaries and record Reflection payloads.** Walk lines top-to-bottom, maintaining "opaque context" state (inside `CodeBlock`, `Meta`, `MathBlock`, or `CommentBlock`). Lines inside an opaque context are NOT scanned, except for the opener line (first line of the fence) and the closer line (the closing fence). On all other lines, scan left-to-right for the first un-escaped `##` not occurring inside `CodeInline` (`` `` ``), `MathInline` (`$$`), or a quoted attribute value. If found: characters before `##` are the line's structural content; characters from `##` to (but not including) `\n` are the comment payload. Block classification (Phase 3) operates on the pre-`##` substring. The payload is later attached to the appropriate block as a `Reflection` entry (§2.2) — it does not enter the inline stream.
3. Identify block boundaries: a sequence of non-blank (in pre-`##` content) lines bounded by blank lines (or document start/end) is a **block candidate**.
4. Special blocks that override blank-line boundaries:
   - Code fences: ` ``` ` opens until the next ` ``` ` (or end of document).
   - Meta blocks: `~~~` opens until the next `~~~` (or end of document).
   - Named blocks `:::` open until a closing `:::` (or end of document).
   - Math blocks: `$$$` opens until the next `$$$` (or end of document).
   - Spoiler blocks: `^^^` opens until the next `^^^` (or end of document, or end of the enclosing block container). SpoilerBlocks do not nest — see §4.15.
   - Comment blocks: `###` opens until the next bare `###` at the same column (or end of document). Content is opaque — see §2.3.

### 9.3 Phase 3 — Block Classification

Each block candidate is classified by its first line:

| First line matches | Block type |
|-------------------|------------|
| `^(={1,9}) ` | Heading → Section |
| `^---` | PageBreak (top level only; no node — §9.6) |
| `^` ``` ` | CodeBlock |
| `^~~~` | Meta |
| `^:::[ID_LITERAL]` | NamedBlock |
| `^\|` | Table |
| `^> ` | QuoteBlock |
| `^- ` or `^- \[[ x]\] ` | List (unordered / task) |
| `^[0-9]+\. ` | List (ordered) |
| `^\[^[ID_LITERAL]` | RefDefinition |
| `^\$\$\$` | MathBlock |
| `^\^\^\^` | SpoilerBlock |
| `^###` | CommentBlock |
| `^/` | FileRef |
| `^!\[` | ImageBlock |
| (anything else) | Paragraph |

### 9.4 Phase 4 — Inline Parsing

Inline content is parsed left-to-right within each block that contains inline content. The parser:

1. Scans for openers (`**`, `__`, `~~`, `^^`, '\`\`', `[`, `![`, `::`, `{{`, `""`, `''`, `$$`).
2. On finding an opener, scans forward for a valid closer.
3. If no valid closer is found, the opener degrades. The degradation rule depends on the opener's class (§9.4.1).
4. Resolves escape sequences `\x` before delimiter matching.
5. Collects trailing `{attrs}` after each completed inline element.

#### 9.4.1 Degradation classes

Inline openers fall into two classes with different degradation behavior. In both cases no diagnostic is emitted — degradation to visible literal text is silent by design.

**Class 1 — symmetrical doubled delimiters: opener-as-text.**

| Opener | Construct |
|--------|-----------|
| `**` | Strong |
| `__` | Emphasis |
| `~~` | Highlight |
| `^^` | Spoiler |
| `` `` `` | CodeInline |
| `$$` | MathInline |
| `""` / `''` | QuoteInline |

If no closer is found before the end of the inline context, the opener alone is emitted as `Text` and parsing continues immediately after it. Constructs following the dead opener are parsed normally: `**a __b__ c` yields `Text("**a ")`, `Emphasis(b)`, `Text(" c")`.

**Class 2 — asymmetrical bracket-like openers: verbatim slice.**

| Opener | Construct |
|--------|-----------|
| `[` / `![` | Link / ImageInline |
| `{{` | Variable |
| `{` | attribute scan (§6) |

An unresolved Class 2 opener causes the source from the opener to its terminator — end of line, or the `##` cut (§2.2) — to be emitted as a single verbatim `Text` run, copied from the source by offset. The slice is never inline-parsed: closed constructs inside a dead slice are lost (they remain literal). Constructs committed *before* the opener are retained. `[a __b__ c` yields `Text("[a __b__ c")` — the `Emphasis` inside the dead slice does not exist.

**Attribute braces.** `{` opens an attribute scan running to the matching `}` or end of line. If the content violates the attribute grammar (§6) or the `}` never arrives, the entire slice — braces included, when present — is emitted as verbatim `Text` and never inline-parsed. This is the intentional **literal-span idiom**: `{a **b**}` is the literal text `{a **b**}`. Consequence: any future extension of the attribute grammar is a breaking change for text relying on this idiom.

**`::` (Span)** belongs to neither class: it has no closer to scan for. If `::` is not immediately followed by a valid `ID_LITERAL` name, it is emitted as `Text("::")` and parsing continues.

`##` boundaries are NOT re-scanned during Phase 4 — they were established in Phase 2 (§9.2). The inline parser receives only the pre-`##` substring of each line. When that substring leaves an inline opener unclosed (e.g. `[text ` with no `]` because `##` swallowed it), the opener degrades per its class (§9.4.1) — for a Class 2 opener the `##` cut acts as the slice terminator. See §2.2 for examples.

Reference links (`[text][^ref]`) are emitted as `Link { kind: "ref" }` in-place. Resolution against `RefDefinition` segments is the consumer's responsibility.

Citation links (`[text][@cite]`, including `[][@cite]`) are emitted as `Link { kind: "cite" }` in-place. Citation resolution is the consumer's responsibility.

### 9.5 Derived Structure

Parsing (Phases 1–4) produces a **flat block sequence** — one for the document root, and one for the child list of every block container (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`). `Section` nesting and the `Page[]` division are not parsed; they are **derived** from these flat sequences by two deterministic folds: the sectionization fold (§9.5.1) and the pagination fold (§9.5.2).

**Implementation neutrality.** The folds define the resulting tree, not an implementation strategy. A parser MAY interleave fold logic with block classification, run the folds as separate post-passes, or use any other strategy — it conforms as long as it produces the same tree.

#### 9.5.1 Sectionization fold

The sectionization fold applies independently to every flat block sequence (root and each container child list).

**A `Section` spans from its heading to the next heading of level ≤ its own within the same sequence, or to the sequence's end.** Equivalently, walking the sequence left-to-right:

1. On a heading of level `n`: close all open Sections of level ≥ `n` within this sequence, then open a new `Section(level=n)`.
2. All subsequent non-heading blocks belong to the innermost open Section.
3. All open Sections close at the end of the sequence. Section scope never crosses a container boundary.

**Skipped levels.** A heading whose level is deeper than the innermost open Section by more than one (e.g. `=` followed directly by `===`) nests under the nearest shallower open Section. The written level is preserved in the `Section` node; no intermediate Sections are synthesized; no diagnostic is emitted. The written level is the source of truth — tree depth is incidental, and consumers that need a normalized depth derive it themselves.

**Section attributes** are those on the heading line only. Rule B (§6) never assigns a scope-chain slot to a Section.

#### 9.5.2 Pagination fold

The pagination fold applies **only to the root sequence** — blocks inside containers never affect pagination regardless of their type. Two items drive the fold: `Meta` blocks and PageBreaks (§9.6).

1. The document begins with `Page[0]`, initially empty (`meta: null`, `children: []`).
2. A **PageBreak** unconditionally closes the current Page — as a Ghost Page if it is empty — and opens a new empty Page. A PageBreak also closes all open root-level Sections. Every PageBreak produces a page boundary: a leading `---` at document start yields a leading Ghost Page; consecutive separators yield Ghost Pages.
3. A **`Meta` block** closes the current Page and opens a new Page, assigning itself to the new Page's `meta` — **unless** it is the first pagination-relevant item of the document (no block, `Meta`, or PageBreak has been consumed before it), in which case it fills `Page[0].meta` and no new Page is created. In particular, a `Meta` block following a PageBreak does **not** fill the page the PageBreak opened; it closes it as a Ghost Page and opens its own.
4. All other root blocks are appended to the current Page's `children`.
5. Ghost Pages (`meta: null`, `children: []`) are valid and emitted as-is. Consumers decide how to handle them.

### 9.6 PageBreak

A **PageBreak** is a top-level line beginning exactly `---`. It is a pagination signal, not a block: it is consumed by the pagination fold (§9.5.2) and **produces no AST node**.

The rest of the line — surplus hyphens, `{attrs}`, any other content — is dropped, and a diagnostic is emitted (CDN-0016). There is no attributed form: the entire line after the leading `---` is discarded.

Inside a block container, a blank-line-surrounded `---` line is not a PageBreak: it parses as `Paragraph(Text("---"))` and a diagnostic is emitted (CDN-0017) noting that page separation is a top-level construct. A `---` line glued to a preceding paragraph remains paragraph content per the no-interrupt rule (§10.1); no diagnostic is emitted.

Cutdown performs no front-matter detection: a document-leading `---` is a PageBreak like any other.

---
