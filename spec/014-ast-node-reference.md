## 14. AST Node (Segment) Reference

**Empty values.** The AST uses `null` only to say that a node has no value of a kind. A string property with no content is `''`; an array property with no entries is `[]`; a number property is always a number. There are two exceptions:

- `Page.meta` is `null` when the Page has no `Meta` block. An empty `Meta` block is not `null`: it is a `Meta` whose `raw` is `''`.
- A path locator — `FileBlock.src`, `InjectBlock.src`, `ImageInline.src`, `Link.path` — is `null` when the node holds no valid path: the path is invalid (§9.2.5), or the `Link` is not `kind: "page"`. The node's `raw` still holds the text as written.

A property a node does not admit is omitted, not emptied — `Meta` has no `attributes` property at all (§14.7).

### 14.1 Root Segments

| Segment    | Fields |
|------------|--------|
| `Document` | `_type: "Document", children: Page[]` |
| `Page`     | `_type: "Page", meta: Meta\|null, reflections: SegmentReflection[], children: Block[]` |

### 14.2 Block Segments

All block segments except `List`, `Table`, and `FileGroup` carry `reflections: LineReflection[]` (`[]` when no `##` comment is present); so do `ListItem`, `TaskItem`, `Row`, and `FileBlock`, which own the lines inside those three. See §2.2 for attachment rules. A captionable block's `caption` is `[]` when no caption line binds to it. `QuoteBlock`, `NamedBlock`, `SpoilerBlock`, `ListItem`, and `TaskItem` hold `Inline[]` when their body is exactly one paragraph and `Block[]` otherwise; one array never mixes the two (§4.7.1).

| Segment         | Fields |
|-----------------|--------|
| `Paragraph`     | `_type: "Paragraph", children: Inline[], reflections, attributes` |
| `Section`       | `_type: "Section", level: 1..9, heading: Inline[], children: Block[], reflections, attributes` |
| `CodeBlock`     | `_type: "CodeBlock", language: string = "text", raw: string, caption: Inline[], reflections, attributes` |
| `MathBlock`     | `_type: "MathBlock", raw: string, caption: Inline[], reflections, attributes` |
| `QuoteBlock`    | `_type: "QuoteBlock", children: Inline[]\|Block[], caption: Inline[], reflections, attributes` |
| `List`          | `_type: "List", kind: "bullet"\|"numbered"\|"checklist", start: number = 1, loose: bool, children: (ListItem\|TaskItem)[], attributes` |
| `Table`         | `_type: "Table", rows: Row[], columns: Column[], caption: Inline[], attributes` |
| `FileGroup`     | `_type: "FileGroup", children: FileBlock[], attributes` |
| `EmbedBlock`    | `_type: "EmbedBlock", url: string, caption: Inline[], reflections, attributes` |
| `InjectBlock`   | `_type: "InjectBlock", raw: string, src: PathResourceLocator\|null, children: Block[], reflections, attributes` — the parser emits `children: []` (§17) |
| `NamedBlock`    | `_type: "NamedBlock", name: string, children: Inline[]\|Block[], caption: Inline[], reflections, attributes` |
| `SpoilerBlock`  | `_type: "SpoilerBlock", children: Inline[]\|Block[], caption: Inline[], reflections, attributes` |
| `RefDefinition` | `_type: "RefDefinition", ref: string, children: Inline[], reflections, attributes` |

### 14.3 Inline Segments

| Segment         | Fields |
|-----------------|--------|
| `Text`          | `_type: "Text", value: string` |
| `Emphasis`      | `_type: "Emphasis", children: Inline[], attributes` |
| `Strong`        | `_type: "Strong", children: Inline[], attributes` |
| `Highlight`     | `_type: "Highlight", children: Inline[], attributes` |
| `Spoiler`       | `_type: "Spoiler", children: Inline[], attributes` |
| `Link`          | `_type: "Link", kind: "external"\|"page"\|"id"\|"ref"\|"tag"\|"cite", children: Inline[], href: string, raw: string, path: PathResourceLocator\|null, target: string, attributes` |
| `CodeInline`    | `_type: "CodeInline", value: string, attributes` |
| `MathInline`    | `_type: "MathInline", formula: string, attributes` |
| `QuoteInline`   | `_type: "QuoteInline", kind: "double"\|"single", children: Inline[], attributes` |
| `ImageInline`   | `_type: "ImageInline", alt: Inline[], raw: string, src: PathResourceLocator\|null, attributes` |
| `EmbedImageInline` | `_type: "EmbedImageInline", alt: Inline[], url: string, attributes` |
| `Mark`          | `_type: "Mark", name: string, children: Inline[], attributes` |
| `LineBreak`     | `_type: "LineBreak"` |
| `Variable`      | `_type: "Variable", key: string, attributes` |

### 14.4 Special Nodes

| Segment         | Fields                                                                          |
|-----------------|---------------------------------------------------------------------------------|
| `Meta`          | `_type: "Meta", format: "yaml"\|"toml"\|"json" = "yaml", raw: string` |
| `ListItem`      | `_type: "ListItem", children: Inline[]\|Block[], reflections, attributes` |
| `TaskItem`      | `_type: "TaskItem", checked: bool, children: Inline[]\|Block[], reflections, attributes` |
| `FileBlock`     | `_type: "FileBlock", raw: string, src: PathResourceLocator\|null, caption: Inline[], reflections, attributes` — only inside a `FileGroup` |
| `Column`        | `_type: "Column", align: "start"\|"left"\|"right"\|"center"\|"comma"\|"decimal" = "start"` |
| `Row`           | `_type: "Row"\|"Header", children: Cell[], reflections, attributes` — a header separator with no row above it inserts an empty `Header` row (§4.8) |
| `Cell`          | `_type: "Cell", children: Inline[], row: number, column: number` |
| `PathResourceLocator` | `path: string, query: QueryParam[], fragment: string` — a value, not a segment: no `_type` (§9.2) |

### 14.5 Location Type

Every segment MAY carry a source location, `loc?: Loc`:

```typescript
interface Loc {
  file?: string   // source file identifier, when known
  start: number   // offset of the segment's first code unit
  end: number     // offset one past the segment's last code unit (end-exclusive)
}
```

- Offsets index **UTF-16 code units of the raw input file** — the text exactly as read, before any interpretation (§7). This mirrors the [LSP]'s baseline position encoding and is the native indexing of the reference TypeScript implementation.
- Line/column positions are derived from offsets by consumers; they are never stored.
- Conformance AST comparison **ignores `loc`**. Position correctness is verified by a separate, smaller test set.
- Segments the parser synthesises rather than reads carry the `loc` of the causing construct in the containing file, or no `loc` at all. A padded table `Cell` (§4.8) has no source range and no causing construct at a position, so it carries no `loc`. A padded `Cell` is an ordinary empty `Cell`, not a distinct node type.
- Blocks a consumer places in `InjectBlock.children` (§17) keep the `loc` of the document they were parsed from; `loc.file` names that document.
- Diagnostics (CDN codes) carry a `loc` identifying the triggering source range.

### 14.6 Reflection Types

```typescript
interface LineReflection {
  loc: Loc          // source range of the ## payload (raw-file UTF-16 offsets, see Location Type)
  text: string      // ## payload with one leading space stripped, trailing whitespace preserved
}

interface SegmentReflection {
  loc: Loc          // the CommentBlock body, or the ## payload of an orphan line
  text: string      // CommentBlock body lines joined with \n, no trailing \n; or the orphan payload
  before: number[]  // child-index path to the block the comment stands before (§2.3)
}
```

Property `reflections` on a block: is typed `LineReflection[]`, and is `[]` when no `##` comment is present on or after the node's lines. See §2.2 for attachment rules.

Property `reflections` on a `Page`: is typed `SegmentReflection[]`, in source order, and is `[]` when the Page holds no CommentBlock and no orphan `##` line. See §2.3 for the anchor path.

### 14.7 Attributes Type

```typescript
type Attribute =
  | { key: "id",    value: string }
  | { key: "class", value: string[] }
  | { key: string,  value: string | JsonObject | JsonArray }   // value: "" for bare-key tokens

type JsonValue  = null | boolean | number | string | JsonObject | JsonArray
type JsonObject = { [key: string]: JsonValue }
type JsonArray  = JsonValue[]
```

A JSON attribute value (§6.1.1) is author data, so a JSON `null` may appear inside it. It never stands for an absent property.

Property `attributes`: is typed `Attribute[]`. A block or inline node with no attributes carries an empty array, never `null`. Nodes that admit no attributes at all (`Meta`, `Column`, `Cell`) omit the field entirely.

Ordering: entries appear in **source order**. Deduplication rules (see §6.1.1) may drop entries before the array is emitted.

---
