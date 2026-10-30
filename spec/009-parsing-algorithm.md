## 9. Parsing Algorithm

Cutdown's parsing model makes three testable guarantees:

1. **Single pass.** Every character of an input snapshot is scanned a bounded number of times; parsing is linear time in snapshot length. Degradation emits verbatim substrings identified by source offset — committed text is never re-lexed or re-inline-parsed. A parser that records closer positions as it scans an inline context never rescans text to match an opener, so inline matching stays linear. An incremental implementation MAY retain an unresolved suffix between snapshots; its result for each snapshot MUST equal parsing that snapshot afresh (§15).
2. **Bounded lookahead.** At most one line at block level. At inline level, an opener (§9.1.4.1) looks ahead to the end of its inline context, which ends at the block's last line.
3. **Deferred attachment.** A deferred structural decision attaches or regroups already-built nodes only; it never re-parses text. The deferral windows are: one-block emission latency (a caption line or attribute-continuation line may bind to the preceding block) and open-inline buffering until the end of the inline context.

### 9.1 Phases

#### 9.1.1 Phase 1 — Input Interpretation

1. Receive decoded text from the UTF-8 input boundary (§7).
2. Apply the interpretive rules of §7: `\r\n` / `\r` / `\n` all read as line terminators, tabs outside fences read as single spaces, leading BOM skipped. The source text is never rewritten — all offsets index the raw input (§14, Location Type).

#### 9.1.2 Phase 2 — Block Identification

1. Split input into lines.
2. **Detect `##` boundaries and record comment payloads.** Walk lines top-to-bottom, maintaining "opaque context" state (inside the body of a `CodeBlock`, `Meta`, `MathBlock`, or CommentBlock; §0.5). Within an opaque context, the opener line and the closer line are scanned; the body lines between them are not. On all other lines, scan in source order for the first un-escaped `##` not occurring inside `CodeInline` (`` `` ``), `MathInline` (`$$`), or a quoted attribute value. A `CodeInline` or `MathInline` counts only when its closer is found within the inline context; escapes are recognized first (§11). If found: characters before `##`, without trailing whitespace, are the line's structural content; characters from `##` to (but not including) `\n` are the comment payload. Block classification (Phase 3) operates on the pre-`##` substring. The payload is later stored as a `LineReflection` on the block that owns the line, or as a `SegmentReflection` on the Page for an orphan line (§2.2) — it does not enter the inline stream.
3. Identify block boundaries: a sequence of non-blank (in pre-`##` content) lines bounded by blank lines (or document start/end) is a **block candidate** (§0.5). A standalone comment line is neither blank nor content; §2.2 defines where it attaches and which runs it ends.
4. Apply the fenced constructs that override blank-line boundaries — `` ``` ``, `~~~`, `:::`, `$$$`, `^^^` and `###`. Each opens until its closer or end of document; see §10.4.2 for the shared fence pattern and §4.3–§4.16 for each construct.

#### 9.1.3 Phase 3 — Block Classification

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
| `PAGE_BREAK` | PageBreaker (top level only; no node — §9.4) |
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
| `COMMENT_FENCE` | CommentBlock — no segment; a `SegmentReflection` on the Page (§2.3) |
| `FILE_OPEN` | InjectBlock when the locator's `path` ends with `.cutdown` or `/` (§4.17); otherwise FileBlock, grouped into a FileGroup (§4.11, §4.12) |
| `EMBED_OPEN` | EmbedBlock (§4.9) |
| (anything else) | Paragraph |

A marker followed by anything other than `MARKER_END` is not a marker, and the line is classified as if the marker were text: `-5 °C`, `3.14`, `=>`, `>quote`, and `[^a]:x` are paragraphs. U+3000 (ideographic space) is text, not a `MARKER_END`. A heading, list, or RefDefinition marker consumes all whitespace after it; a `>` consumes one whitespace character (§4.6). A run of six or more digits matches no `ORDERED_OPEN`, so the line is a paragraph (§4.7).

#### 9.1.4 Phase 4 — Inline Parsing

Inline content is parsed in source order within each block that contains inline content. The parser:

1. Scans for openers (`**`, `__`, `~~`, `^^`, '\`\`', `[`, `![`, `::`, `{{`, `""`, `''`, `$$`).
2. On finding an opener, scans forward for a valid closer.
3. If no valid closer is found, the opener degrades. The degradation rule depends on the opener's class (§9.1.4.1).
4. Resolves escape sequences `\x` before delimiter matching.
5. Collects trailing `{attrs}` after each completed inline element.

##### 9.1.4.1 Degradation classes

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

A Class 2 opener searches for its closer through the whole inline context, across soft breaks (§12.1). An unresolved Class 2 opener causes the source from the opener to the end of its own line — the line end, or the `##` cut (§2.2) — to be emitted as a single verbatim `Text` run, copied from the source by offset; the next line parses normally. The slice is never inline-parsed: closed constructs inside a dead slice are lost (they remain literal). Constructs committed *before* the opener are retained. `[a __b__ c` yields `Text("[a __b__ c")` — the `Emphasis` inside the dead slice does not exist.

**Attribute braces.** `{` (left brace) opens an attribute scan running to the matching `}` (right brace), which may stand on a later line of the inline context (§6.1.1). If the content violates the attribute grammar (§6) or the `}` never arrives, the slice — braces included, when present, and never past the end of the `{`'s own line — is emitted as verbatim `Text` and never inline-parsed. This is the intentional **literal-span idiom**: `{a **b**}` is the literal text `{a **b**}`. Consequence: any future extension of the attribute grammar is a breaking change for text relying on this idiom.

**Class 3 — bracket-matched, counted: `Mark`.**

`::name … ::` (§5.10) is the only construct whose opener and closer are textually distinct, so the parser matches them by counting rather than by taking the first closer. The matching rule, the depth cap and CDN-0031 are defined in §5.10.

An opener that never matches degrades per **Class 1**: the opener alone (`::` plus the name) is emitted as `Text` and parsing continues immediately after it, so following constructs parse normally.

`##` boundaries are NOT re-scanned during Phase 4 — they were established in Phase 2 (§9.1.2). The inline parser receives only the pre-`##` content of each line, joined by soft breaks. The cut ends its line as a line end does: an opener before it may still close on a later line, and if it never closes it degrades per its class (§9.1.4.1) — for a Class 2 opener the `##` cut ends the slice. In `[text ## here](url)` with no later line, the `[` has no `]` (right bracket) and degrades. See §2.2 for examples.

Id, ref, tag, and cite links (`[text](#id)`, `[text](^ref)`, `[text](~tag)`, `[text](@cite)`, including the empty-text forms such as `[](^ref)`) are emitted as `Link` nodes in place. Resolving them — against segment ids, `RefDefinition` segments, tags, or a bibliography — is the consumer's responsibility.

### 9.2 PathResourceLocator

A **PathResourceLocator** is the parsed form of a path written in source. Four properties carry one: `FileBlock.src` (§4.11), `InjectBlock.src` (§4.17), `ImageInline.src` (§5.9), and `Link.path` (§5.5). Each of those nodes also carries `raw: string`, the path as written with escapes resolved (§9.2.2); the locator holds what is decomposed from `raw` and normalized (§9.2.4). This subsection is the only definition of how a path is parsed; those sections state only where their path ends.

**Resources and pointers.** Two families of nodes name something outside the document, and they admit different targets:

- A **resource** is fetched by the consumer and placed in the document: `FileBlock`, `InjectBlock`, `ImageInline`, `EmbedImageInline`, `EmbedBlock`. Its source is a path, or — for the embed nodes only — a URL beginning with literal `https://`. Nothing else is admitted, because the consumer must be able to fetch and place it.
- A **pointer** is followed, printed, or ignored by the consumer, never placed: `Link`. Its target is as wide as possible — every URI scheme, a page path, or an id, ref, tag, or cite target (§5.5).

Cutdown filters no scheme. It cannot know its consumer: in an HTML page `javascript:` is a hazard, in a printed book it is ink. Filtering is the consumer's decision, and §18.4 clause 7 makes it a duty for a consumer whose output can run a link (§19.1).

A path never begins with `https://`. Where such a value stands in an image source, the node is an `EmbedImageInline` instead (§5.9.1). In a link target, any URI scheme makes an external `Link` (§5.5). Every URL is a plain string, kept as written and never decomposed.

```typescript
interface PathResourceLocator {
  path: string               // raw up to the first unescaped ? or #
  query: QueryParam[]        // pairs after ?, up to the first unescaped #
  fragment: string           // everything after the first unescaped #
}

interface QueryParam {
  key: string
  value: string
}
```

Cutdown reads three characters as structure inside a path: `/` (slash) separates folders, `?` (question mark) opens the query, and `#` (octothorpe) opens the fragment. Within the query, `&` (ampersand) separates pairs and the first `=` (equals sign) of a pair separates key from value.

#### 9.2.1 Extent

The construct that owns the path decides where it ends:

| Owner | The path runs from | to |
|---|---|---|
| `FileBlock`, `InjectBlock` (a line beginning `/`) | the leading `/` | the end of the line, after removing one trailing attribute sequence — whitespace followed by one or more `{…}` groups that close the line — and then trailing whitespace |
| `ImageInline` `(…)` | the character after `(` | the first unbalanced `)` |
| `Link` `(…)` | the character after `(` | the first unbalanced `)` |

A link target is scanned this way whatever its kind; the kind is chosen after the extent is known (§5.5). A `(…)` extent may cross a soft break: the scan continues on the next line of the inline context, and the line break folds under the base-column rule (§12.1), so whitespace beyond the base column becomes one space of the path.

Brackets nest inside every path. A `(` or `[` opens a pair, and the closer that matches it is path content, not the end of the path: `![](/shots/run (2).png)` has the path `/shots/run (2).png`. Parentheses and square brackets are counted separately. Escaped brackets are not counted.

A `{…}` group belongs to the attribute sequence only when the sequence is preceded by whitespace and closes the line. `/a {draft}.png` and `/a/{draft}` are paths without attributes.

```ebnf
PAREN_EXTENT ::= (PATH_CHAR | PATH_ESCAPE | SOFT_BREAK | "(" PAREN_EXTENT ")")*
PATH_CHAR    ::= CHAR - ("(" | ")" | "\" | LINE_TERMINATOR)
PATH_ESCAPE  ::= "\" (CHAR - LINE_TERMINATOR)
FILE_LINE    ::= FILE_PATH (WHITESPACE+ ATTR_GROUP (WHITESPACE* ATTR_GROUP)*)? WHITESPACE*
FILE_PATH    ::= "/" ((CHAR - ("\" | LINE_TERMINATOR)) | PATH_ESCAPE)*
```

A `(…)` extent is a `PAREN_EXTENT` followed by the unbalanced `)`. In a `FILE_LINE` the attribute sequence is taken only when it closes the line, so where both readings match, the `{…}` groups are attributes.

#### 9.2.2 Characters and escapes

A path may contain any Unicode scalar value, the space included. A backslash escapes the next character:

| Written | `raw` holds | Effect |
|---|---|---|
| `\\` | `\\`, unchanged | a literal backslash, resolved by the consumer (§5.11.1); the pair is still an escape while the path is scanned, so `\\)` ends the path |
| `\(` `\)` `\[` `\]` | the bracket | not counted for nesting, never ends the path |
| `\?` `\#` `\&` `\=` | the character | no query, fragment, or pair boundary |
| `\^` `\~` `\@` | the character | in a link target, no ref, tag, or cite sigil (§5.5) |
| `\:` | `:` | in a link target, no URI scheme (§5.5); elsewhere a plain colon |
| `\{{` | `\{{`, unchanged | an escaped interpolation token, resolved by the consumer (§5.11.1) |
| `\` before any other character | both characters | none |

#### 9.2.3 Decomposition

1. `raw` is the extent with escapes resolved, except the two template escapes `\\` and `\{{`, which stay for the consumer (§5.11.1). In a `FileBlock` or `InjectBlock` line, leading and trailing whitespace is removed first.
2. `path` is `raw` up to the first unescaped `?` or `#`, or all of `raw` if neither occurs.
3. If an unescaped `?` comes first, the query text runs from after it to the first unescaped `#` or the end. It is split on `&`; each part is split at its first `=` into `key` and `value`. A part with no `=` has `value: ''`. Empty parts (`a&&b`) produce no pair. Pairs keep source order, and repeated keys are all kept. Nothing is percent-decoded: `%20` stays `%20`. At most 32 pairs are kept; any further pairs are dropped and warning CDN-0042 is emitted, with the `loc` of the first dropped pair.
4. `fragment` is everything after the first unescaped `#`. A `?` after the `#` is fragment content.

The parts are read from the extent as written, so an escaped `?`, `#`, `&`, or `=` is never a boundary:

```ebnf
LOCATOR       ::= PATH_PART ("?" QUERY_PART)? ("#" FRAGMENT_PART)?
PATH_PART     ::= ((LOC_CHAR - ("?" | "#")) | PATH_ESCAPE)*
QUERY_PART    ::= PAIR ("&" PAIR)*
PAIR          ::= PAIR_KEY ("=" PAIR_VALUE)?
PAIR_KEY      ::= ((LOC_CHAR - ("&" | "=" | "#")) | PATH_ESCAPE)*
PAIR_VALUE    ::= ((LOC_CHAR - ("&" | "#")) | PATH_ESCAPE)*
FRAGMENT_PART ::= (LOC_CHAR | PATH_ESCAPE)*
LOC_CHAR      ::= CHAR - "\"
```

Absent parts are empty: `query: []`, `fragment: ''`.

```
/My Docs/Q3 report.pdf         → { path: "/My Docs/Q3 report.pdf", query: [], fragment: "" }
/data.csv?sheet=2&range=A1:D9  → { path: "/data.csv", query: [{key:"sheet",value:"2"}, {key:"range",value:"A1:D9"}], fragment: "" }
/video.mp4#t=30,45             → { path: "/video.mp4", query: [], fragment: "t=30,45" }
/card.cutdown?name=Ann&flag    → { path: "/card.cutdown", query: [{key:"name",value:"Ann"}, {key:"flag",value:""}], fragment: "" }
```

#### 9.2.4 Root and normalization

Every path is read from the **project root**, which the consumer supplies. A path written without a leading `/` is read as if it began with one: `![x](images/a.png)` and `![x](/images/a.png)` name the same file. Cutdown has no paths relative to the document, because the parser does not know where the document lies.

After decomposition the parser normalizes `path`, in this order:

1. If `path` does not begin with `/`, a `/` is prepended.
2. `path` is split at every `/` into segments, which are read in order from the start:
   - an empty segment is dropped: `/a//b` → `/a/b`;
   - a `.` segment is dropped: `/a/./b` → `/a/b`;
   - a `..` segment drops itself and the segment before it: `/a/b/../c` → `/a/c`. A `..` with no segment before it is dropped too, and it makes the path invalid (§9.2.5): `/../x`, `../intro`.
3. The remaining segments are joined with `/` after a leading `/`. If the last written segment was empty, `.`, or `..`, the result ends with `/`: `/a/.` → `/a/`, `/a/b/..` → `/a/`. A path with no segments left is `/`.
4. The result is converted to Unicode Normalization Form C (NFC), so that a letter written as one code point and the same letter written with a combining mark give the same `path`.

`raw` keeps what was written; `query` and `fragment` are not normalized, except as §5.5 states for a page link. Nothing is percent-decoded and letter case is kept.

```
images/a.png        → { path: "/images/a.png" }
/a/./b/../c.png     → { path: "/a/c.png" }
//x.png             → { path: "/x.png" }
/chapters/.         → { path: "/chapters/" }
```

Every later rule reads the normalized `path`: whether a line is an `InjectBlock` (§4.17), the validity rules below, and the `.cutdown` suffix of a page link (§5.5). Cutdown still resolves no path; it fixes how a path is read and spelled. A consumer that maps a path to storage confines it to the root after its own resolution (§18.4 clause 10, §19.5).

#### 9.2.5 Validity

A path is **invalid** when any of these holds:

- `path` is empty before normalization — a path names something (an image source `![x]()` or `![x](#a)`; §5.9 adds the image-only rules);
- `raw` contains a control character: U+0000–U+001F, U+007F, or U+0080–U+009F;
- `raw` contains a bidi control (`BIDI_CONTROL`, §0.4), such as U+202E (right-to-left override);
- a `..` segment climbs above the root (`/../x`, `../intro`, `/a/../../b`);
- the normalized `path` ends with `/`, except in an `InjectBlock`, where a trailing `/` names a folder (§4.17), and in a `FileBlock` whose path is `/` itself (§4.11).

An invalid path does not change the parse. The owning node is emitted as usual with `raw` as written, its locator is `null`, and warning CDN-0032 is emitted.

**Length.** Length is not a validity rule. A `raw` longer than 2048 Unicode scalar values is kept in full and read by the steps above; nothing is cut, and warning CDN-0035 is emitted. The same limit applies to every URL string: `EmbedBlock.url` (§4.9), `EmbedImageInline.url` (§5.9.1), and `Link.href` (§5.5).

A page link never has an empty path: an empty target is a wiki link (§5.5). A `FileBlock` or `InjectBlock` path begins with `/`, so it is never empty either.

### 9.3 Derived Structure

Parsing (Phases 1–4) produces a **flat block sequence** — one for the document root, and one for the child list of every block container (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`). `Section` nesting and the `Page[]` division are not parsed; they are **derived** from these flat sequences by two deterministic folds: the sectionization fold (§9.3.1) and the pagination fold (§9.3.2).

**Implementation neutrality.** The folds define the resulting tree, not an implementation strategy. A parser MAY interleave fold logic with block classification, run the folds as separate post-passes, or use any other strategy — it conforms as long as it produces the same tree.

#### 9.3.1 Sectionization fold

The sectionization fold applies independently to every flat block sequence (root and each container child list).

**A `Section` spans from its heading to the next heading of level ≤ its own within the same sequence, or to the sequence's end.** Equivalently, walking the sequence in document order:

1. On a heading of level `n`: close all open Sections of level ≥ `n` within this sequence, then open a new `Section(level=n)`.
2. All subsequent non-heading blocks belong to the innermost open Section.
3. All open Sections close at the end of the sequence. Section scope never crosses a container boundary.

**Skipped levels.** A heading whose level is deeper than the innermost open Section by more than one (e.g. `=` followed directly by `===`) nests under the nearest shallower open Section. The written level is preserved in the `Section` node; no intermediate Sections are synthesized; no diagnostic is emitted. The written level is the source of truth — tree depth is incidental, and consumers that need a normalized depth derive it themselves.

**Section attributes** are those at the end of the heading only. Rule B (§6) never assigns a scope-chain slot to a Section.

#### 9.3.2 Pagination fold

The pagination fold applies **only to the root sequence** — blocks inside containers never affect pagination regardless of their type. Two items drive the fold: `Meta` blocks and PageBreakers (§9.4).

1. The document begins with `Page[0]`, initially empty (`meta: null`, `reflections: []`, `children: []`).
2. A **PageBreaker** unconditionally closes the current Page — as a Ghost Page if it is empty — and opens a new empty Page. A PageBreaker also closes all open root-level Sections. Every PageBreaker produces a page boundary: a leading `---` at document start yields a leading Ghost Page; consecutive separators yield Ghost Pages.
3. A **`Meta` block** whose current Page has `meta: null` fills that slot. No new Page is created, whatever content the Page already holds: a `Meta` after paragraphs, comments, or any other block still fills the Page those blocks are on, and a `Meta` after a PageBreaker fills the Page the PageBreaker opened.
4. A **`Meta` block** whose current Page already has a `meta` closes that Page and opens a new Page carrying itself as `meta`.
5. All other root blocks are appended to the current Page's `children`, and every segment comment the fold reaches — at root level or inside a root block — is appended to the current Page's `reflections` (§2.3).
6. Ghost Pages (`meta: null`, `reflections: []`, `children: []`) are valid and emitted as-is. Consumers decide how to handle them.

Steps 3 and 4 depend only on the current Page's `meta` slot, never on where the `Meta` stands among other blocks. Content before a `Meta` therefore never creates a Page boundary; only a PageBreaker or a second `Meta` does.

### 9.4 PageBreaker

A **PageBreaker** is the pagination signal consumed by the fold in §9.3.2. It produces no AST node. The construct — its syntax, its diagnostics, and its behaviour inside block containers — is defined in §4.10.

### 9.5 Incremental availability

Incremental availability does not create a second parsing mode. At every decoded Unicode-scalar boundary, an implementation MUST produce the same AST and diagnostics as an ordinary parse of the source available at that boundary. Later source MAY reinterpret an unresolved inline suffix, an open block/container, or derived structure that depends on it. Consumers MAY delay semantic rendering until an end of block (§0.5, §15); Cutdown defines no rendering schedule.

---
