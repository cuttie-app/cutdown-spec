## 17. Diagnostics

A parser reports each place where it recovered from input the author probably did not mean as a **diagnostic**. A diagnostic never stops the parse and never changes the AST: every input is a valid document (§20.2), and the AST is the one §1–§16 define whether or not a consumer reads the diagnostics.

### 17.1 The diagnostic object

A parser returns the AST and the list of every diagnostic of the parse pass.

```typescript
interface Diagnostic {
  code: string                // "CDN-" and four digits (§17.2)
  level: "warning" | "info"
  loc?: Loc                   // the source range that triggered it (§A.5)
  message: string             // human-readable; the wording is implementation-defined
}
```

- **`warning`**: the input parsed, but probably not as the author meant. **`info`**: a signal that is not a problem. There is no `error` level, because no input is an error.
- A parser does not stop at the first diagnostic. It recovers as the code prescribes and goes on.
- Conformance compares `code` and `level` (§20.2 clause 2). `loc` is optional, as every `loc` is (§A.5), and `message` is not compared.
- The recovery of each code is fixed below and shows in the AST. A diagnostic carries no recovery field of its own.
- A tool MAY treat any warning as a failure of its own, as a build gate or a linter does. The parse result does not change.

### 17.2 Codes

Every code is `CDN-` followed by four digits. A code is assigned once: it never changes meaning and is never reused, even after it is retired (§17.3). How codes are assigned, deprecated, and retired is governed by the [diagnostic code registry policy](../policies/diagnostic-code-registry-policy.md).

#### CDN-0001 Unclosed CodeBlock fence

*warning · since 0.1.4*

- **Trigger:** A ` ``` ` opening fence has no matching closing ` ``` ` before end of document.
- **Recovery:** Content from the opening fence to end of document is treated as CodeBlock content.

**Example 17-1** · [`cdn-0001-unclosed-codeblock`](../tests/diagnostics/cdn-0001-unclosed-codeblock.yaml)

#### CDN-0002 Unclosed MetaBlock fence

*warning · since 0.1.4*

- **Trigger:** A `~~~` opening fence has no matching closing `~~~` before end of document.
- **Recovery:** Content from the opening fence to end of document is treated as Meta raw content.

**Example 17-2** · [`cdn-0002-unclosed-metablock`](../tests/diagnostics/cdn-0002-unclosed-metablock.yaml)

#### CDN-0003 Unclosed MathBlock fence

*warning · since 0.1.4*

- **Trigger:** A `$$$` opening fence has no matching closing `$$$` before end of document.
- **Recovery:** Content from the opening fence to end of document is treated as MathBlock formula content.

**Example 17-3** · [`cdn-0003-unclosed-mathblock`](../tests/diagnostics/cdn-0003-unclosed-mathblock.yaml)

#### CDN-0004 Unclosed NamedBlock

*warning · since 0.1.4*

- **Trigger:** A `:::name` opening line has no matching closing `:::` before end of document.
- **Recovery:** Content from the opening line to end of document is treated as NamedBlock children.

**Example 17-4** · [`cdn-0004-unclosed-namedblock`](../tests/diagnostics/cdn-0004-unclosed-namedblock.yaml)

#### CDN-0005 Unclosed SpoilerBlock fence

*warning · since 0.4.0*

- **Trigger:** A `^^^` opening fence has no matching closing `^^^` before end of document (or end of the enclosing block container).
- **Recovery:** Content from the opening fence to the boundary is treated as `SpoilerBlock` children (parsed as blocks).

**Example 17-5** · [`cdn-0005-unclosed-spoilerblock`](../tests/diagnostics/cdn-0005-unclosed-spoilerblock.yaml)

#### CDN-0006 Unclosed CommentBlock fence

*warning · since 0.5.0*

- **Trigger:** A `###` opening fence has no closing line (one beginning with `###`) before end of document.
- **Recovery:** Content from the opening fence to end of document becomes the CommentBlock's `SegmentReflection` text (opaque raw string). The same rule applies as for other opaque fences (CDN-0001, CDN-0002, CDN-0003) — container boundaries are not observable from inside an opaque block.

**Example 17-6** · [`cdn-0006-unclosed-commentblock`](../tests/diagnostics/cdn-0006-unclosed-commentblock.yaml)

#### CDN-0008 Orphaned caption line

*warning · since 0.6.0*

- **Trigger:** A `^ ` line that fails any binding condition: the immediately preceding block in the current block scope is absent or not captionable, its caption slot is already filled, or a blank line separates it from the `^ ` line.
- **Recovery:** The `^ ` line is emitted as a `Paragraph` containing the literal text (including the `^ ` prefix).

**Example 17-7** · [`cdn-0008-orphaned-caption-after-image-paragraph`](../tests/diagnostics/cdn-0008-orphaned-caption-after-image-paragraph.yaml)

**Example 17-8** · [`cdn-0008-orphaned-caption-after-injectblock`](../tests/diagnostics/cdn-0008-orphaned-caption-after-injectblock.yaml)

**Example 17-9** · [`cdn-0008-orphaned-caption-blank-line`](../tests/diagnostics/cdn-0008-orphaned-caption-blank-line.yaml)

**Example 17-10** · [`cdn-0008-orphaned-caption-no-predecessor`](../tests/diagnostics/cdn-0008-orphaned-caption-no-predecessor.yaml)

**Example 17-11** · [`cdn-0008-orphaned-caption-non-captionable`](../tests/diagnostics/cdn-0008-orphaned-caption-non-captionable.yaml)

**Example 17-12** · [`cdn-0008-orphaned-caption-slot-filled`](../tests/diagnostics/cdn-0008-orphaned-caption-slot-filled.yaml)

#### CDN-0009 Attribute block on caption line ignored

*warning · since 0.6.0*

- **Trigger:** A `{...}` token appears at the end of a caption line (`^ ...`).
- **Recovery:** The `{...}` token is emitted as literal `Text` — it does not attach to any node. Caption lines carry no attributes; the parent block's attributes are set independently.

**Example 17-13** · [`cdn-0009-attrs-on-caption`](../tests/diagnostics/cdn-0009-attrs-on-caption.yaml)

#### CDN-0011 Orphaned scope-chain attributes

*warning · since 0.1.4*

- **Trigger:** One or more `{...}` blocks at the front of a trailing attribute chain have no slot to claim (chain has fewer slots than `{...}` blocks).
- **Recovery:** Excess `{...}` blocks at the front of the chain are discarded; no AST output for them. One diagnostic per chain, however many blocks are orphaned.

**Example 17-14** · [`cdn-0011-orphaned-scope-chain`](../tests/diagnostics/cdn-0011-orphaned-scope-chain.yaml)

#### CDN-0012 Heading level out of range

*warning · since 0.1.4*

- **Trigger:** A line begins with 10 or more `=` characters followed by whitespace or the line end (would be heading level > 9).
- **Recovery:** A level-9 Section is created. The first nine `=` are the marker; the surplus `=` begin the heading content (§4.2). `loc` spans the surplus.

**Example 17-15** · [`cdn-0012-heading-level-out-of-range`](../tests/diagnostics/cdn-0012-heading-level-out-of-range.yaml)

#### CDN-0013 NamedBlock without a valid name

*warning · since 0.1.5*

- **Trigger:** A NamedBlock opener (three or more `:` at the start of a line, outside an open NamedBlock) has no name word, or one that is not an `ID_NAME`: `:::`, `::: {.alert}`, `:::c++`, `::::`.
- **Recovery:** A NamedBlock is opened with `name: ""`; `{attrs}` and a `## comment` on the opener are kept, and the body is parsed as blocks (§4.13). An escaped opener (`\:::`) is not an opener and emits nothing.

**Example 17-16** · [`cdn-0013-invalid-name-word`](../tests/diagnostics/cdn-0013-invalid-name-word.yaml)

**Example 17-17** · [`cdn-0013-nameless-namedblock-opener`](../tests/diagnostics/cdn-0013-nameless-namedblock-opener.yaml)

#### CDN-0014 Crossed inline element boundaries

*warning · since 0.3.2*

- **Trigger:** An inline element A closes via its delimiter while an opener of a **different** inline type B (one of `**`, `__`, `~~`, `^^`, `""`, `''`, `[`) was present inside A's content and emitted as literal text — and a closer for B exists in the inline stream after A's boundary. Span points to A's closing delimiter (the crossing closer).
- **Recovery:** Existing greedy left-to-right behavior applies unchanged. No AST change. The diagnostic is informational only.

**Example 17-18** · [`cdn-0014-emphasis-strong-cross`](../tests/diagnostics/cdn-0014-emphasis-strong-cross.yaml)

**Example 17-19** · [`cdn-0014-no-fire-valid-nesting`](../tests/diagnostics/cdn-0014-no-fire-valid-nesting.yaml)

**Example 17-20** · [`cdn-0014-quote-link-cross`](../tests/diagnostics/cdn-0014-quote-link-cross.yaml)

#### CDN-0015 Invalid or empty Variable key

*warning · since 0.3.4*

- **Trigger:** A `{{...}}` token contains zero characters (empty key `{{}}`) or one or more characters outside `ID_CHAR`.
- **Recovery:** The entire `{{...}}` span is emitted as literal `Text`; no `Variable` node is created.

**Example 17-21** · [`cdn-0015-invalid-variable-key`](../tests/diagnostics/cdn-0015-invalid-variable-key.yaml)

**Example 17-22** · [`cdn-0015-variable-inner-spaces`](../tests/diagnostics/cdn-0015-variable-inner-spaces.yaml)

#### CDN-0016 Fence tail dropped

*warning · since 0.8.0*

- **Trigger:** An opener or closer line of a fence (`` ``` ``, `~~~`, `$$$`, `^^^`, `:::`, `###`), or a top-level PageBreaker line (`---`), carries text after its three symbols that the construct does not keep (§11.4.2): surplus symbols, unsupported `{attrs}`, or other text — `----`, `--- {.x}`, four backticks, `### note`, `^^^ x`, ```` ``` done ````.
- **Recovery:** The tail is discarded and the construct takes effect normally. `loc` spans the dropped tail.

**Example 17-23** · [`cdn-0016-fence-tail-dropped`](../tests/diagnostics/cdn-0016-fence-tail-dropped.yaml)

**Example 17-24** · [`cdn-0016-no-fire-bare-pagebreaker`](../tests/diagnostics/cdn-0016-no-fire-bare-pagebreaker.yaml)

**Example 17-25** · [`cdn-0016-pagebreaker-tail-dropped`](../tests/diagnostics/cdn-0016-pagebreaker-tail-dropped.yaml)

#### CDN-0017 Page separator inside block container

*warning · since 0.8.0*

- **Trigger:** A blank-line-surrounded `---` line is encountered inside a block container (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`).
- **Recovery:** The line is emitted as `Paragraph([Text("---")])`; no page boundary is created. Page separation is a top-level construct. `loc` spans the `---` line. A `---` glued to a preceding paragraph is ordinary content and emits no diagnostic.

**Example 17-26** · [`cdn-0017-no-fire-glued-hyphens`](../tests/diagnostics/cdn-0017-no-fire-glued-hyphens.yaml)

**Example 17-27** · [`cdn-0017-pagebreaker-inside-container`](../tests/diagnostics/cdn-0017-pagebreaker-inside-container.yaml)

#### CDN-0018 Table row cell count exceeds column count

*warning · since 0.9.0*

- **Trigger:** A table content row or header separator has more cells than the column count fixed by the first content row (§4.8, *Table shape*).
- **Recovery:** The surplus cells are dropped; the row parses normally with exactly the column count of cells. Short rows are padded instead and emit nothing; a mismatched `+` decoration row is inert and emits nothing. `loc` spans the dropped cells.

**Example 17-28** · [`cdn-0018-no-fire-short-row`](../tests/diagnostics/cdn-0018-no-fire-short-row.yaml)

**Example 17-29** · [`cdn-0018-table-surplus-cells`](../tests/diagnostics/cdn-0018-table-surplus-cells.yaml)

#### CDN-0020 Duplicate id attribute

*warning · since 0.2.0*

- **Trigger:** A second `#id` or `id=` token appears in a `{...}` block after the first `id` claim has already been made.
- **Recovery:** The duplicate token is dropped; the first `#id` or `id=` value is kept.

**Example 17-30** · [`cdn-0020-duplicate-id`](../tests/diagnostics/cdn-0020-duplicate-id.yaml)

#### CDN-0022 Duplicate custom attribute key

*warning · since 0.2.0*

- **Trigger:** A `key=value` token appears more than once for the same key in a `{...}` block.
- **Recovery:** All occurrences after the first are dropped; the first value is kept.

**Example 17-31** · [`cdn-0022-duplicate-custom-key`](../tests/diagnostics/cdn-0022-duplicate-custom-key.yaml)

#### CDN-0030 Meta block inside block container

*warning · since 0.2.1*

- **Trigger:** A `~~~` fence opener is encountered inside a block container (`ListItem`, `TaskItem`, `QuoteBlock`, or `NamedBlock`).
- **Recovery:** The entire raw span — including the opening `~~~` line, all content lines, and the closing `~~~` line — is emitted as a single `Paragraph` with literal text. No `Meta` node is created.

**Example 17-32** · [`cdn-0030-meta-block-inside-container`](../tests/diagnostics/cdn-0030-meta-block-inside-container.yaml)

#### CDN-0031 Mark nesting depth exceeded

*warning · since 0.10.0*

- **Trigger:** A `::name` `Mark` opener (§5.10) is encountered at nesting depth 9 or deeper; the maximum depth is 8.
- **Recovery:** The over-deep opener does not open a `Mark`. It degrades to literal `Text("::" + name)` and parsing continues immediately after it; enclosing `Mark` nodes are unaffected and still close normally. `loc` spans the rejected opener.

**Example 17-33** · [`cdn-0031-mark-depth-exceeded`](../tests/diagnostics/cdn-0031-mark-depth-exceeded.yaml)

#### CDN-0032 Invalid path

*warning · since 0.11.0*

- **Trigger:** A `PathResourceLocator` (§8) — in a `FileBlock`, `InjectBlock`, `ImageInline`, or page `Link` — breaks a validity rule of §8.5 or §5.9: an empty path, a control character, a `..` climbing above the root (paths are read from the project root, so `[x](../intro)` triggers it), or a trailing `/` after normalization outside an `InjectBlock`. An empty segment (`a//b`) is normalized away and never triggers it. A wiki link with empty text (`[]()`, §5.5) names no path and triggers it too, and so does an image source beginning with a link sigil (`#`, `^`, `~`, `@`) or with a URI scheme other than `https://` (§5.9). A value beginning with `https://` is a URL, not a path, and never triggers it.
- **Recovery:** The owning node is emitted as usual, with `raw` as written and its locator `null`. `loc` spans the path. When `raw` begins with `http://`, the message adds the hint "did you mean https://?" — only `https://` makes a URL. When a `..` climbs above the root, the message adds the hint "paths start at the project root".

**Example 17-34** · [`cdn-0032-image-empty-path`](../tests/diagnostics/cdn-0032-image-empty-path.yaml)

**Example 17-35** · [`cdn-0032-image-fragment-only`](../tests/diagnostics/cdn-0032-image-fragment-only.yaml)

**Example 17-36** · [`cdn-0032-image-other-scheme`](../tests/diagnostics/cdn-0032-image-other-scheme.yaml)

**Example 17-37** · [`cdn-0032-image-reserved-sigil`](../tests/diagnostics/cdn-0032-image-reserved-sigil.yaml)

**Example 17-38** · [`cdn-0032-invalid-path`](../tests/diagnostics/cdn-0032-invalid-path.yaml)

**Example 17-39** · [`cdn-0032-no-fire-url`](../tests/diagnostics/cdn-0032-no-fire-url.yaml)

**Example 17-40** · [`cdn-0032-page-link-dot-last`](../tests/diagnostics/cdn-0032-page-link-dot-last.yaml)

**Example 17-41** · [`cdn-0032-trailing-slash-page-link`](../tests/diagnostics/cdn-0032-trailing-slash-page-link.yaml)

**Example 17-42** · [`cdn-0032-wiki-dot-title`](../tests/diagnostics/cdn-0032-wiki-dot-title.yaml)

#### CDN-0033 Invalid link target

*warning · since 0.11.0*

- **Trigger:** An id, ref, tag, or cite link target (§5.5) is empty or holds a character its kind does not admit: `[x](#)`, `[x](^a b)`, `[x](~a//b)`, `[x](~a/)`, `[x](~a/../b)`, `[x](@)`.
- **Recovery:** The `Link` is emitted with the kind its sigil selects and `target` as written, without the sigil. `loc` spans the target.

**Example 17-43** · [`cdn-0033-empty-id-target`](../tests/diagnostics/cdn-0033-empty-id-target.yaml)

**Example 17-44** · [`cdn-0033-id-target-with-hash`](../tests/diagnostics/cdn-0033-id-target-with-hash.yaml)

**Example 17-45** · [`cdn-0033-invalid-ref-target`](../tests/diagnostics/cdn-0033-invalid-ref-target.yaml)

**Example 17-46** · [`cdn-0033-invalid-tag-level`](../tests/diagnostics/cdn-0033-invalid-tag-level.yaml)

**Example 17-47** · [`cdn-0033-tag-dot-level`](../tests/diagnostics/cdn-0033-tag-dot-level.yaml)

#### CDN-0034 Class limit exceeded

*warning · since 0.11.0*

- **Trigger:** One `{...}` group contributes more than 32 distinct classes through `.classname` and `class=` tokens (§6.1.1).
- **Recovery:** The first 32 classes are kept in source order; the rest are dropped. `loc` spans the first dropped class token.

**Example 17-48** · [`cdn-0034-class-limit-exceeded`](../tests/diagnostics/cdn-0034-class-limit-exceeded.yaml)

#### CDN-0035 Value exceeds limit of 2048 chars

*warning · since 0.11.0*

- **Trigger:** A path `raw` (§8.5), an `EmbedBlock.url` (§4.9), or a `Link.href` (§5.5) is longer than 2048 Unicode scalar values.
- **Recovery:** None needed: the value is kept in full, and a path is decomposed as usual. The node keeps its type. `loc` spans the value.

**Example 17-49** · [`cdn-0035-long-embed-url`](../tests/diagnostics/cdn-0035-long-embed-url.yaml)

**Example 17-50** · [`cdn-0035-long-href`](../tests/diagnostics/cdn-0035-long-href.yaml)

**Example 17-51** · [`cdn-0035-long-path`](../tests/diagnostics/cdn-0035-long-path.yaml)

#### CDN-0036 Unsupported link form `[text][target]`

*warning · since 0.11.0*

- **Trigger:** The `]` closing a link text or image alt is followed directly by a second `[` that closes on the same line (§5.5): `[docs][guide]`, `![a][b]`.
- **Recovery:** Both bracket groups are emitted as one literal `Text`, exactly as written, and parsing continues after them. The message says to write `[text](target)`. `loc` spans both groups.

**Example 17-52** · [`cdn-0036-bracket-image-form`](../tests/diagnostics/cdn-0036-bracket-image-form.yaml)

**Example 17-53** · [`cdn-0036-bracket-link-form`](../tests/diagnostics/cdn-0036-bracket-link-form.yaml)

#### CDN-0037 Invalid id

*warning · since 0.11.0*

- **Trigger:** An `id` attribute value (`#x` or `id=x`, §6.1.1) holds a character outside `ID_VALUE` (§2.1): `{id="a b"}`, `{#a#b}`.
- **Recovery:** The `id` entry is kept with its value as written. No id link can reach it. `loc` spans the value.

**Example 17-54** · [`cdn-0037-id-with-space`](../tests/diagnostics/cdn-0037-id-with-space.yaml)

#### CDN-0038 Invalid language code

*warning · since 0.11.0*

- **Trigger:** A CodeBlock opener carries a language word that is not an `ID_NAME` (§4.4): ```` ```c++ ````, ```` ```C# ````.
- **Recovery:** `language` is `"text"`; the rest of the opener is read as usual. `loc` spans the word.

**Example 17-55** · [`cdn-0038-invalid-language-code`](../tests/diagnostics/cdn-0038-invalid-language-code.yaml)

#### CDN-0039 Invalid Meta format

*warning · since 0.11.0*

- **Trigger:** A Meta opener carries a format word other than `yaml`, `toml`, or `json` in any case (§4.3): `~~~xml`, `~~~yml`.
- **Recovery:** `format` is `"yaml"`. `loc` spans the word.

**Example 17-56** · [`cdn-0039-invalid-meta-format`](../tests/diagnostics/cdn-0039-invalid-meta-format.yaml)

#### CDN-0040 Block nesting limit exceeded

*warning · since 0.11.0*

- **Trigger:** A `QuoteBlock`, `ListItem`, `TaskItem`, `NamedBlock`, or `SpoilerBlock` opener would open a container at block depth 33 (§11.7).
- **Recovery:** The opener does not open; its line is classified as if the marker were text, inside the depth-32 container. `loc` spans the marker.

**Example 17-57** · [`cdn-0040-block-nesting-limit`](../tests/diagnostics/cdn-0040-block-nesting-limit.yaml)

#### CDN-0041 Attribute entry limit exceeded

*warning · since 0.11.0*

- **Trigger:** One `{...}` group produces more than 32 entries; the `id` entry and the merged `class` entry count one each (§6.1.1).
- **Recovery:** The first 32 entries are kept in source order; the rest are dropped. `loc` spans the first dropped token.

**Example 17-58** · [`cdn-0041-attribute-entry-limit`](../tests/diagnostics/cdn-0041-attribute-entry-limit.yaml)

#### CDN-0042 Query pair limit exceeded

*warning · since 0.11.0*

- **Trigger:** The query of a `PathResourceLocator` holds more than 32 pairs (§8.3).
- **Recovery:** The first 32 pairs are kept in source order; the rest are dropped. `loc` spans the first dropped pair.

**Example 17-59** · [`cdn-0042-query-pair-limit`](../tests/diagnostics/cdn-0042-query-pair-limit.yaml)

### 17.3 Retired codes

A retired code is no longer emitted. Its number stays reserved.

| Code | Title | Status | Since | Reason |
|---|---|---|---|---|
| CDN-0007 | Attributes on table delimiter row dropped | removed | 0.5.0 | As of 0.8.0 `{attrs}` on a header separator row claim the Table slot (§4.8) and `+` rows in pipe tables are ignored entirely; no dropped-attr case remains |
| CDN-0010 | ThematicBreak text content dropped | removed | 0.1.4 | The `ThematicBreak` node was deleted in 0.8.0; superseded by CDN-0016 (PageBreaker tail dropped) |
| CDN-0021 | `class=` conflicts with `.class` syntax | deprecated | 0.2.0 | Since 0.11.0 `.x` and `class=` merge into one class entry (§6.1.1), so no conflict remains |

---
