## 14. AST Node (Segment) Reference

**Empty values.** The AST never uses `null` for an absent value, with one exception. A string property with no content is `''`; an array property with no entries is `[]`; a number property is always a number. The exception is `Page.meta`, which is `null` when the Page has no `Meta` block. An empty `Meta` block is not `null`: it is a `Meta` whose `raw` is `''`.

A property a node does not admit is omitted, not emptied — `CommentBlock` has no `attributes` property at all (§14.7).

### 14.1 Root Segments

| Segment    | Fields |
|------------|--------|
| `Document` | `_type: "Document", children: Page[]` |
| `Page`     | `_type: "Page", meta: Meta\|null, children: Block[]` |

### 14.2 Block Segments

All block segments carry `reflection: Reflection[]` (`[]` when no `##` comment is present). See §2.2 for attachment rules. A captionable block's `caption` is `[]` when no caption line binds to it.

| Segment         | Fields |
|-----------------|--------|
| `Paragraph`     | `_type: "Paragraph", children: Inline[], reflection, attributes` |
| `Section`       | `_type: "Section", level: 1..9, heading: Inline[], children: Block[], reflection, attributes` |
| `CodeBlock`     | `_type: "CodeBlock", language: string = "text", raw: string, caption: Inline[], reflection, attributes` |
| `MathBlock`     | `_type: "MathBlock", raw: string, caption: Inline[], reflection, attributes` |
| `QuoteBlock`    | `_type: "QuoteBlock", children: Block[], caption: Inline[], reflection, attributes` |
| `List`          | `_type: "List", kind: "bullet"\|"numbered"\|"checklist", start: number = 1, loose: bool, children: (ListItem\|TaskItem)[], reflection, attributes` |
| `Table`         | `_type: "Table", rows: Row[], columns: Column[], caption: Inline[], reflection, attributes` |
| `FileGroup`     | `_type: "FileGroup", children: FileBlock[], reflection, attributes` |
| `EmbedBlock`    | `_type: "EmbedBlock", url: string, caption: Inline[], reflection, attributes` |
| `InjectBlock`   | `_type: "InjectBlock", src: PathResourceLocator, children: Block[], reflection, attributes` — the parser emits `children: []` (§17) |
| `NamedBlock`    | `_type: "NamedBlock", name: string, children: Block[], caption: Inline[], reflection, attributes` |
| `SpoilerBlock`  | `_type: "SpoilerBlock", children: Block[], caption: Inline[], reflection, attributes` |
| `CommentBlock`  | `_type: "CommentBlock", text: string, reflection` — no `attributes`. Hidden by default (§2.5). |
| `RefDefinition` | `_type: "RefDefinition", ref: string, children: Inline[], reflection, attributes` |

### 14.3 Inline Segments

| Segment         | Fields |
|-----------------|--------|
| `Text`          | `_type: "Text", value: string` |
| `Emphasis`      | `_type: "Emphasis", children: Inline[], attributes` |
| `Strong`        | `_type: "Strong", children: Inline[], attributes` |
| `Highlight`     | `_type: "Highlight", children: Inline[], attributes` |
| `Spoiler`       | `_type: "Spoiler", children: Inline[], attributes` |
| `Link`          | `_type: "Link", kind: "external"\|"page"\|"tag"\|"ref"\|"cite", children: Inline[], href: string, path: PathResourceLocator, target: string, attributes` |
| `CodeInline`    | `_type: "CodeInline", value: string, attributes` |
| `MathInline`    | `_type: "MathInline", formula: string, attributes` |
| `QuoteInline`   | `_type: "QuoteInline", kind: "double"\|"single", children: Inline[], attributes` |
| `ImageInline`   | `_type: "ImageInline", alt: Inline[], src: PathResourceLocator, attributes` |
| `Mark`          | `_type: "Mark", name: string, children: Inline[], attributes` |
| `LineBreak`     | `_type: "LineBreak"` |
| `Variable`      | `_type: "Variable", key: string, attributes` |

### 14.4 Special Nodes

| Segment         | Fields                                                                          |
|-----------------|---------------------------------------------------------------------------------|
| `Meta`          | `_type: "Meta", format: "yaml"\|"toml"\|"json" = "yaml", raw: string` |
| `ListItem`      | `_type: "ListItem", children: (Block\|Inline)[], attributes` |
| `TaskItem`      | `_type: "TaskItem", checked: bool, children: (Block\|Inline)[], attributes` |
| `FileBlock`     | `_type: "FileBlock", src: PathResourceLocator, caption: Inline[], attributes` — only inside a `FileGroup`; no `reflection` (§2.2) |
| `Column`        | `_type: "Column", align: "start"\|"left"\|"right"\|"center"\|"comma"\|"decimal" = "start"` |
| `Row`           | `_type: "Row"\|"Header", children: Cell[], attributes` |
| `Cell`          | `_type: "Cell", children: Inline[], row: number, column: number` |
| `PathResourceLocator` | `raw: string, path: string, query: QueryParam[], fragment: string` — a value, not a segment: no `_type` (§9.2) |

### 14.5 Location Type

Every segment MAY carry a source location, `loc?: Loc`:

```typescript
interface Loc {
  file?: string   // source file identifier, when known
  start: number   // offset of the segment's first code unit
  end: number     // offset one past the segment's last code unit (end-exclusive)
}
```

- Offsets index **UTF-16 code units of the raw input file** — the text exactly as read, before any interpretation (§7). This mirrors the Language Server Protocol's baseline position encoding and is the native indexing of the reference TypeScript implementation.
- Line/column positions are derived from offsets by consumers; they are never stored.
- Conformance AST comparison **ignores `loc`**. Position correctness is verified by a separate, smaller test set.
- Segments the parser synthesises rather than reads carry the `loc` of the causing construct in the containing file, or no `loc` at all. A padded table `Cell` (§4.8) has no source range and no causing construct at a position, so it carries no `loc`. A padded `Cell` is an ordinary empty `Cell`, not a distinct node type.
- Blocks a consumer places in `InjectBlock.children` (§17) keep the `loc` of the document they were parsed from; `loc.file` names that document.
- Diagnostics (CDN codes) carry a `loc` identifying the triggering source range.

### 14.6 Reflection Type

```typescript
interface Reflection {
  loc: Loc       // source range of the ## payload (raw-file UTF-16 offsets, see Location Type)
  text: string   // ## payload with one leading space stripped, trailing whitespace preserved
}
```

Property `reflection`: is typed `Reflection[]`, and is `[]` when no `##` comment is present on or adjacent to the block. See §2.2 for attachment rules.

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

Property `attributes`: is typed `Attribute[]`. A block or inline node with no attributes carries an empty array, never `null`. Nodes that admit no attributes at all (`CommentBlock`, `Meta`, `Column`, `Cell`) omit the field entirely.

Ordering: entries appear in **source order**. Deduplication rules (see §6.1.1) may drop entries before the array is emitted.

---
