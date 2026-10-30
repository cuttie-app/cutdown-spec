## 12. Parsing Algorithm

Cutdown's parsing model makes three testable guarantees:

1. **Single pass.** Every character of an input snapshot is scanned a bounded number of times; parsing is linear time in snapshot length. Degradation emits verbatim substrings identified by source offset — committed text is never re-lexed or re-inline-parsed. A parser that records closer positions as it scans an inline context never rescans text to match an opener, so inline matching stays linear. An incremental implementation MAY retain an unresolved suffix between snapshots; its result for each snapshot MUST equal parsing that snapshot afresh (§19).
2. **Bounded lookahead.** At most one line at block level. At inline level, an opener (§12.1.4.1) looks ahead to the end of its inline context, which ends at the block's last line.
3. **Deferred attachment.** A deferred structural decision attaches or regroups already-built nodes only; it never re-parses text. The deferral windows are: one-block emission latency (a caption line or attribute-continuation line may bind to the preceding block) and open-inline buffering until the end of the inline context.

### 12.1 Phases

#### 12.1.1 Phase 1 — Input Interpretation

1. Receive decoded text from the UTF-8 input boundary (§10).
2. Apply the interpretive rules of §10: `\r\n` / `\r` / `\n` all read as line terminators, tabs outside fences read as single spaces, leading BOM skipped. The source text is never rewritten — all offsets index the raw input (§A, Location Type).

#### 12.1.2 Phase 2 — Block Identification

1. Split input into lines.
2. **Detect `##` boundaries and record comment payloads.** Walk lines top-to-bottom, maintaining "opaque context" state (inside the body of a `CodeBlock`, `Meta`, `MathBlock`, or CommentBlock; §1.5). Within an opaque context, the opener line and the closer line are scanned; the body lines between them are not. On all other lines, scan in source order for the first un-escaped `##` not occurring inside `CodeInline` (`` `` ``), `MathInline` (`$$`), or a quoted attribute value. A `CodeInline` or `MathInline` counts only when its closer is found within the inline context; escapes are recognized first (§14). If found: characters before `##`, without trailing whitespace, are the line's structural content; characters from `##` to (but not including) `\n` are the comment payload. Block classification (Phase 3) operates on the pre-`##` substring. The payload is later stored as a `LineReflection` on the block that owns the line, or as a `SegmentReflection` on the Page for an orphan line (§7.2) — it does not enter the inline stream.
3. Identify block boundaries: a sequence of non-blank (in pre-`##` content) lines bounded by blank lines (or document start/end) is a **block candidate** (§1.5). A standalone comment line is neither blank nor content; §7.2 defines where it attaches and which runs it ends.
4. Apply the fenced constructs that override blank-line boundaries — `` ``` ``, `~~~`, `:::`, `$$$`, `^^^` and `###`. Each opens until its closer or end of document; see §11.4.2 for the shared fence pattern and §4.3–§4.16 for each construct.

#### 12.1.3 Phase 3 — Block Classification

Each block candidate is classified by its first line, after container prefixes and leading whitespace are removed. The line is matched against these openers:

```ebnf
MARKER_END    ::= WHITESPACE | LINE_TERMINATOR    /* or the end of input */
HEADING_OPEN  ::= "="+ MARKER_END
PAGE_BREAK    ::= "---"
CODE_FENCE    ::= "```"
META_FENCE    ::= "~~~"
NAMED_FENCE   ::= ":::"
MATH_FENCE    ::= "$$$"
SPOILER_FENCE ::= "^^^"
COMMENT_FENCE ::= "###"
TABLE_OPEN    ::= "|"
QUOTE_MARKER  ::= ">" MARKER_END
BULLET_OPEN   ::= "-" MARKER_END
TASK_OPEN     ::= "-" WHITESPACE "[" (" " | "x" | "X" | "+") "]" MARKER_END
ORDERED_OPEN  ::= DIGIT DIGIT? DIGIT? DIGIT? DIGIT? "." MARKER_END
DIGIT         ::= [0-9]
REFDEF_OPEN   ::= "[^" ID_NAME "]:" MARKER_END
FILE_OPEN     ::= "/"
EMBED_OPEN    ::= "https://"
```

| First line begins with | Block type |
|-------------------|------------|
| `HEADING_OPEN` | Heading → Section; ten or more `=` give level 9 (§4.2) |
| `PAGE_BREAK` | PageBreaker (top level only; no node — §16.3) |
| `CODE_FENCE` | CodeBlock |
| `META_FENCE` | Meta |
| `NAMED_FENCE` | NamedBlock |
| `TABLE_OPEN` | Table |
| `QUOTE_MARKER` | QuoteBlock |
| `TASK_OPEN` or `BULLET_OPEN` | List (task / unordered) |
| `ORDERED_OPEN` | List (ordered) |
| `REFDEF_OPEN` | RefDefinition |
| `MATH_FENCE` | MathBlock |
| `SPOILER_FENCE` | SpoilerBlock |
| `COMMENT_FENCE` | CommentBlock — no segment; a `SegmentReflection` on the Page (§7.3) |
| `FILE_OPEN` | InjectBlock when the locator's `path` ends with `.cutdown` or `/` (§4.17); otherwise FileBlock, grouped into a FileGroup (§4.11, §4.12) |
| `EMBED_OPEN` | EmbedBlock (§4.9) |
| (anything else) | Paragraph |

A marker followed by anything other than `MARKER_END` is not a marker, and the line is classified as if the marker were text: `-5 °C`, `3.14`, `=>`, `>quote`, and `[^a]:x` are paragraphs. U+3000 (ideographic space) is text, not a `MARKER_END`. A heading, list, or RefDefinition marker consumes all whitespace after it; a `>` consumes one whitespace character (§4.6). A run of six or more digits matches no `ORDERED_OPEN`, so the line is a paragraph (§4.7).

#### 12.1.4 Phase 4 — Inline Parsing

Inline content is parsed in source order within each block that contains inline content. The parser:

1. Scans for openers (`**`, `__`, `~~`, `^^`, '\`\`', `[`, `![`, `::`, `{{`, `""`, `''`, `$$`).
2. On finding an opener, scans forward for a valid closer.
3. If no valid closer is found, the opener degrades. The degradation rule depends on the opener's class (§12.1.4.1).
4. Resolves escape sequences `\x` before delimiter matching.
5. Collects trailing `{attrs}` after each completed inline element.

##### 12.1.4.1 Degradation classes

Inline openers fall into three classes with different degradation behavior. An unmatched opener degrades to visible literal text without a diagnostic, by design. CDN-0031 caps `Mark` nesting depth (§5.10); it is a limit, not a degradation.

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
| `[` / `![` | Link / ImageInline, EmbedImageInline |
| `{{` | Variable |
| `{` | attribute scan (§6) |

A Class 2 opener searches for its closer through the whole inline context, across soft breaks (§15.1). An unresolved Class 2 opener causes the source from the opener to the end of its own line — the line end, or the `##` cut (§7.2) — to be emitted as a single verbatim `Text` run, copied from the source by offset; the next line parses normally. The slice is never inline-parsed: closed constructs inside a dead slice are lost (they remain literal). Constructs committed *before* the opener are retained. `[a __b__ c` yields `Text("[a __b__ c")` — the `Emphasis` inside the dead slice does not exist.

**Attribute braces.** `{` (left brace) opens an attribute scan running to the matching `}` (right brace), which may stand on a later line of the inline context (§6.1.1). If the content violates the attribute grammar (§6) or the `}` never arrives, the slice — braces included, when present, and never past the end of the `{`'s own line — is emitted as verbatim `Text` and never inline-parsed. This is the intentional **literal-span idiom**: `{a **b**}` is the literal text `{a **b**}`. Consequence: any future extension of the attribute grammar is a breaking change for text relying on this idiom.

**Class 3 — bracket-matched, counted: `Mark`.**

`::name … ::` (§5.10) is the only construct whose opener and closer are textually distinct, so the parser matches them by counting rather than by taking the first closer. The matching rule, the depth cap and CDN-0031 are defined in §5.10.

An opener that never matches degrades per **Class 1**: the opener alone (`::` plus the name) is emitted as `Text` and parsing continues immediately after it, so following constructs parse normally.

`##` boundaries are NOT re-scanned during Phase 4 — they were established in Phase 2 (§12.1.2). The inline parser receives only the pre-`##` content of each line, joined by soft breaks. The cut ends its line as a line end does: an opener before it may still close on a later line, and if it never closes it degrades per its class (§12.1.4.1) — for a Class 2 opener the `##` cut ends the slice. In `[text ## here](url)` with no later line, the `[` has no `]` (right bracket) and degrades. See §7.2 for examples.

Id, ref, tag, and cite links (`[text](#id)`, `[text](^ref)`, `[text](~tag)`, `[text](@cite)`, including the empty-text forms such as `[](^ref)`) are emitted as `Link` nodes in place. Resolving them — against segment ids, `RefDefinition` segments, tags, or a bibliography — is the consumer's responsibility.

### 12.2 Incremental availability

Incremental availability does not create a second parsing mode. At every decoded Unicode-scalar boundary, an implementation MUST produce the same AST and diagnostics as an ordinary parse of the source available at that boundary. Later source MAY reinterpret an unresolved inline suffix, an open block/container, or derived structure that depends on it. Consumers MAY delay semantic rendering until an end of block (§1.5, §19); Cutdown defines no rendering schedule.

---
