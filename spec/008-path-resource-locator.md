## 8. PathResourceLocator

A **PathResourceLocator** is the parsed form of a path written in source. Four properties carry one: `FileBlock.src` (§4.11), `InjectBlock.src` (§4.17), `ImageInline.src` (§5.9), and `Link.path` (§5.5). Each of those nodes also carries `raw: string`, the path as written with escapes resolved (§8.2); the locator holds what is decomposed from `raw` and normalized (§8.4). This subsection is the only definition of how a path is parsed; those sections state only where their path ends.

**Resources and pointers.** Two families of nodes name something outside the document, and they admit different targets:

- A **resource** is fetched by the consumer and placed in the document: `FileBlock`, `InjectBlock`, `ImageInline`, `EmbedImageInline`, `EmbedBlock`. Its source is a path, or — for the embed nodes only — a URL beginning with literal `https://`. Nothing else is admitted, because the consumer must be able to fetch and place it.
- A **pointer** is followed, printed, or ignored by the consumer, never placed: `Link`. Its target is as wide as possible — every URI scheme, a page path, or an id, ref, tag, or cite target (§5.5).

Cutdown filters no scheme. It cannot know its consumer: in an HTML page `javascript:` is a hazard, in a printed book it is ink. Filtering is the consumer's decision, and §20.4 clause 7 makes it a duty for a consumer whose output can run a link (§21.1).

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

### 8.1 Extent

The construct that owns the path decides where it ends:

| Owner | The path runs from | to |
|---|---|---|
| `FileBlock`, `InjectBlock` (a line beginning `/`) | the leading `/` | the end of the line, after removing one trailing attribute sequence — whitespace followed by one or more `{…}` groups that close the line — and then trailing whitespace |
| `ImageInline` `(…)` | the character after `(` | the first unbalanced `)` |
| `Link` `(…)` | the character after `(` | the first unbalanced `)` |

A link target is scanned this way whatever its kind; the kind is chosen after the extent is known (§5.5). A `(…)` extent may cross a soft break: the scan continues on the next line of the inline context, and the line break folds under the base-column rule (§15.1), so whitespace beyond the base column becomes one space of the path.

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

### 8.2 Characters and escapes

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

### 8.3 Decomposition

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

**Example 8-1** · [`fileblock-spaces-in-path`](../tests/008-path-resource-locator/fileblock-spaces-in-path.yaml)

**Example 8-2** · [`fileblock-query`](../tests/008-path-resource-locator/fileblock-query.yaml)

**Example 8-3** · [`fileblock-query-and-fragment`](../tests/008-path-resource-locator/fileblock-query-and-fragment.yaml)

**Example 8-4** · [`injectblock-query`](../tests/009-injection/injectblock-query.yaml)

### 8.4 Root and normalization

Every path is read from the **project root**, which the consumer supplies. A path written without a leading `/` is read as if it began with one: `![x](images/a.png)` and `![x](/images/a.png)` name the same file. Cutdown has no paths relative to the document, because the parser does not know where the document lies.

After decomposition the parser normalizes `path`, in this order:

1. If `path` does not begin with `/`, a `/` is prepended.
2. `path` is split at every `/` into segments, which are read in order from the start:
   - an empty segment is dropped: `/a//b` → `/a/b`;
   - a `.` segment is dropped: `/a/./b` → `/a/b`;
   - a `..` segment drops itself and the segment before it: `/a/b/../c` → `/a/c`. A `..` with no segment before it is dropped too, and it makes the path invalid (§8.5): `/../x`, `../intro`.
3. The remaining segments are joined with `/` after a leading `/`. If the last written segment was empty, `.`, or `..`, the result ends with `/`: `/a/.` → `/a/`, `/a/b/..` → `/a/`. A path with no segments left is `/`.
4. The result is converted to Unicode Normalization Form C (NFC), so that a letter written as one code point and the same letter written with a combining mark give the same `path`.

`raw` keeps what was written; `query` and `fragment` are not normalized, except as §5.5 states for a page link. Nothing is percent-decoded and letter case is kept.

**Example 8-5** · [`path-root-relative`](../tests/008-path-resource-locator/path-root-relative.yaml)

**Example 8-6** · [`path-dot-segments`](../tests/008-path-resource-locator/path-dot-segments.yaml)

**Example 8-7** · [`path-empty-segments`](../tests/008-path-resource-locator/path-empty-segments.yaml)

**Example 8-8** · [`injectblock-folder-dot`](../tests/009-injection/injectblock-folder-dot.yaml)

Every later rule reads the normalized `path`: whether a line is an `InjectBlock` (§4.17), the validity rules below, and the `.cutdown` suffix of a page link (§5.5). Cutdown still resolves no path; it fixes how a path is read and spelled. A consumer that maps a path to storage confines it to the root after its own resolution (§20.4 clause 10, §21.5).

**Equivalence.** Two locators name the same resource when their normalized `path` values are equal, code point for code point. The normalization steps above are the only equivalences: letters that differ in case are different names (`/A.png` and `/a.png`), and a percent escape is not its character (`/a%20b` and `/a b`). `query` and `fragment` do not change which resource is named; they travel with it to the consumer, as a page link's `#id` picks a segment of the same document. A consumer that compares locators — a link checker, or the cycle check of §20.4 clause 2 — compares `path` and nothing else.

### 8.5 Validity

A path is **invalid** when any of these holds:

- `path` is empty before normalization — a path names something (an image source `![x]()` or `![x](#a)`; §5.9 adds the image-only rules);
- `raw` contains a control character: U+0000–U+001F, U+007F, or U+0080–U+009F;
- `raw` contains a bidi control (`BIDI_CONTROL`, §1.4), such as U+202E (right-to-left override);
- a `..` segment climbs above the root (`/../x`, `../intro`, `/a/../../b`);
- the normalized `path` ends with `/`, except in an `InjectBlock`, where a trailing `/` names a folder (§4.17), and in a `FileBlock` whose path is `/` itself (§4.11).

An invalid path does not change the parse. The owning node is emitted as usual with `raw` as written, its locator is `null`, and warning CDN-0032 is emitted.

**Length.** Length is not a validity rule. A `raw` longer than 2048 Unicode scalar values is kept in full and read by the steps above; nothing is cut, and warning CDN-0035 is emitted. The same limit applies to every URL string: `EmbedBlock.url` (§4.9), `EmbedImageInline.url` (§5.9.1), and `Link.href` (§5.5).

A page link never has an empty path: an empty target is a wiki link (§5.5). A `FileBlock` or `InjectBlock` path begins with `/`, so it is never empty either.

---
