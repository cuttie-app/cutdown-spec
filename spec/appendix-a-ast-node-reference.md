## A. AST Node (Segment) Reference

Each node's interface opens the section that defines it. This appendix indexes those sections and defines what the nodes share: empty values, source locations, reflections, and attributes.

**Empty values.** The AST uses `null` only to say that a node has no value of a kind. A string property with no content is `''`; an array property with no entries is `[]`; a number property is always a number. There are two exceptions:

- `Page.meta` is `null` when the Page has no `Meta` block. An empty `Meta` block is not `null`: it is a `Meta` whose `raw` is `''`.
- A path locator — `FileBlock.src`, `InjectBlock.src`, `ImageInline.src`, `Link.path` — is `null` when the node holds no valid path: the path is invalid (§8.5), or the `Link` is not `kind: "page"`. The node's `raw` still holds the text as written.

A property a node does not admit is omitted, not emptied — `Meta` has no `attributes` property at all (§A.7).

### A.1 Root Segments

| Segment    | Defined in |
|------------|------------|
| `Document` | §3.1 |
| `Page`     | §3.2 |

### A.2 Block Segments

All block segments except `List`, `Table`, and `FileGroup` carry `reflections: LineReflection[]` (`[]` when no `##` comment is present); so do `ListItem`, `TaskItem`, `Row`, and `FileBlock`, which own the lines inside those three. See §7.2 for attachment rules. A captionable block's `caption` is `[]` when no caption line binds to it. `QuoteBlock`, `NamedBlock`, `SpoilerBlock`, `ListItem`, and `TaskItem` hold `Inline[]` when their body is exactly one paragraph and `Block[]` otherwise; one array never mixes the two (§4.7.1).

| Segment         | Defined in |
|-----------------|------------|
| `Paragraph`     | §4.1 |
| `Section`       | §4.2 |
| `CodeBlock`     | §4.4 |
| `MathBlock`     | §4.5 |
| `QuoteBlock`    | §4.6 |
| `List`          | §4.7 |
| `Table`         | §4.8 |
| `EmbedBlock`    | §4.9 |
| `FileGroup`     | §4.12 |
| `NamedBlock`    | §4.13 |
| `RefDefinition` | §4.14 |
| `SpoilerBlock`  | §4.15 |
| `InjectBlock`   | §4.17 |

### A.3 Inline Segments

| Segment            | Defined in |
|--------------------|------------|
| `Text`             | §5.1 |
| `Emphasis`         | §5.2 |
| `Strong`           | §5.3 |
| `Highlight`        | §5.4 |
| `Link`             | §5.5 |
| `CodeInline`       | §5.6 |
| `MathInline`       | §5.7 |
| `QuoteInline`      | §5.8 |
| `ImageInline`      | §5.9 |
| `EmbedImageInline` | §5.9.1 |
| `Mark`             | §5.10 |
| `Variable`         | §5.11 |
| `Spoiler`          | §5.12 |
| `LineBreak`        | §5.13 |

### A.4 Special Nodes

| Segment               | Defined in |
|-----------------------|------------|
| `Meta`                | §4.3 — held in `Page.meta`, never in `children` |
| `ListItem`            | §4.7.1 |
| `TaskItem`            | §4.7.2 |
| `Row`                 | §4.8 |
| `Cell`                | §4.8 |
| `Column`              | §4.8 |
| `FileBlock`           | §4.11 — only inside a `FileGroup` |
| `PathResourceLocator` | §8 — a value, not a segment: no `_type` |

### A.5 Location Type

Every segment MAY carry a source location, `loc?: Loc`:

```typescript
interface Loc {
  file?: string   // source file identifier, when known
  start: number   // offset of the segment's first code unit
  end: number     // offset one past the segment's last code unit (end-exclusive)
}
```

- Offsets index **UTF-16 code units of the raw input file** — the text exactly as read, before any interpretation (§10). This mirrors the [LSP]'s baseline position encoding and is the native indexing of the reference TypeScript implementation.
- Line/column positions are derived from offsets by consumers; they are never stored.
- Conformance AST comparison **ignores `loc`**. Position correctness is verified by a separate, smaller test set.
- Segments the parser synthesises rather than reads carry the `loc` of the causing construct in the containing file, or no `loc` at all. A padded table `Cell` (§4.8) has no source range and no causing construct at a position, so it carries no `loc`. A padded `Cell` is an ordinary empty `Cell`, not a distinct node type.
- Blocks a consumer places in `InjectBlock.children` (§9) keep the `loc` of the document they were parsed from; `loc.file` names that document.
- Diagnostics (CDN codes) carry a `loc` identifying the triggering source range.

### A.6 Reflection Types

```typescript
interface LineReflection {
  loc: Loc       // source range of the ## payload (raw-file UTF-16 offsets, §A.5)
  text: string   // payload after ##, one leading space stripped
}

interface SegmentReflection {
  loc: Loc          // the CommentBlock body, or the ## payload of an orphan line
  text: string      // CommentBlock: body lines joined with \n, no trailing \n; orphan line: the payload
  before: number[]  // child-index path to the block the comment stands before (§7.3)
}
```

Property `reflections` on a block: is typed `LineReflection[]`, and is `[]` when no `##` comment is present on or after the node's lines. See §7.2 for attachment rules.

Property `reflections` on a `Page`: is typed `SegmentReflection[]`, in source order, and is `[]` when the Page holds no CommentBlock and no orphan `##` line. See §7.3 for the anchor path.

### A.7 Attributes Type

```typescript
type Attribute =
  | { key: "id",    value: string }
  | { key: "class", value: string[] }
  | { key: string,  value: string }   // value: "" for bare-key tokens
```

Property `attributes`: is typed `Attribute[]`. A block or inline node with no attributes carries an empty array, never `null`. Nodes that admit no attributes at all (`Meta`, `Column`, `Cell`) omit the field entirely.

Ordering: entries appear in **source order**. Deduplication rules (see §6.1.1) may drop entries before the array is emitted.

---
