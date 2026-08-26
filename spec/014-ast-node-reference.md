## 14. AST Node (Segment) Reference

### Root Segments

| Segment    | Fields |
|------------|--------|
| `Document` | `type: "Document", children: Page[]` |
| `Page`     | `type: "Page", meta: Meta\|null, children: Block[]` |

### Block Segments

All block segments carry `reflection: Reflection[] | null` (null when no `##` comment is present). See §2.2 for attachment rules.

| Segment         | Fields                                                                                                                                              |
|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `Paragraph`     | `type: "Paragraph", children: Inline[], reflection, attributes`                                                                                     |
| `Section`       | `type: "Section", level: 1..9, heading: Inline[], children: Block[], reflection, attributes`                                                        |
| `CodeBlock`     | `type: "CodeBlock", language: string = "text", raw: string, caption: Inline[]\|null, reflection, attributes`                                        |
| `MathBlock`     | `type: "MathBlock", raw: string, caption: Inline[]\|null, reflection, attributes`                                                                   |
| `QuoteBlock`    | `type: "QuoteBlock", children: Block[], attribution: Inline[]\|null, reflection, attributes`                                                        |
| `List`          | `type: "List", kind: "bullet"\|"numbered"\|"checklist", start: int\|null, loose: bool, children: (ListItem\|TaskItem)[], reflection, attributes`    |
| `Table`         | `type: "Table", kind: "multiline"\|"pipe", rows: Row[], columns: Column[], caption: Inline[]\|null, reflection, attributes`                            |
| `ImageBlock`    | `type: "ImageBlock", alt: Inline[], src: string, caption: Inline[]\|null, reflection, attributes`                                                   |
| `FileRef`       | `type: "FileRef", path: string, fragment: string\|'', query: string\|'', caption: Inline[]\|null, reflection, attributes`                           |
| `FileRefGroup`  | `type: "FileRefGroup", group: "image"\|"video"\|"audio", children: (FileRef\|ImageBlock)[], caption: Inline[]\|null, reflection, attributes`        |
| `NamedBlock`    | `type: "NamedBlock", name: string, children: Block[], caption: Inline[]\|null, reflection, attributes`                                              |
| `SpoilerBlock`  | `type: "SpoilerBlock", children: Block[], caption: Inline[]\|null, reflection, attributes`                                                          |
| `CommentBlock`  | `type: "CommentBlock", text: string, reflection` — no `attributes`. Hidden by default (§2.5).                                                       |

### Inline Segments

| Segment         | Fields |
|-----------------|--------|
| `Text`          | `type: "Text", value: string` |
| `Emphasis`      | `type: "Emphasis", children: Inline[], attributes` |
| `Strong`        | `type: "Strong", children: Inline[], attributes` |
| `Highlight`     | `type: "Highlight", children: Inline[], attributes` |
| `Spoiler`       | `type: "Spoiler", children: Inline[], attributes` |
| `Link`          | `type: "Link", kind: "external"\|"page"\|"tag"\|"ref"\|"cite", children: Inline[], href: string\|'', target: string\|'', attributes` |
| `CodeInline`    | `type: "CodeInline", value: string, attributes` |
| `MathInline`    | `type: "MathInline", formula: string, attributes` |
| `QuoteInline`   | `type: "QuoteInline", kind: "double"\|"single", children: Inline[], attributes` |
| `ImageInline`   | `type: "ImageInline", alt: Inline[], src: string, attributes` |
| `Span`          | `type: "Span", name: string, children: [], attributes` |
| `TextBreak`     | `type: "TextBreak"` |

### Special Nodes

| Segment         | Fields                                                                          |
|-----------------|---------------------------------------------------------------------------------|
| `Meta`          | `type: "Meta", format: "yaml"\|"toml"\|"json" = "yaml", raw: string`            |
| `RefDefinition` | `type: "RefDefinition", ref: string, children: Inline[], attributes`            |
| `ListItem`      | `type: "ListItem", children: (Block\|Inline)[], attributes`                     |
| `TaskItem`      | `type: "TaskItem", checked: bool, children: (Block\|Inline)[], attributes`      |
| `Column`        | `type: "Column", align: "left"\|"right"\|"center"\|"comma"\|"decimal" = "left"` |
| `Row`           | `type: "Row"\|"Header", children: Cell[], attributes`                           |
| `Cell`          | `type: "Cell", children: Inline[]\|Block[], row: number, column: number` — `Inline[]` when `Table.kind` is `"pipe"`; `Block[]` when `"multiline"` |
| `Variable`      | `type: "Variable", key: string, attributes`                                     |

### Synthetic Segments

The AST schema admits nodes that are not producible by parsing. **Conforming parsers never emit them; conforming consumers must accept them.**

| Segment    | Fields |
|------------|--------|
| `Fragment` | `type: "Fragment", meta: Meta\|null, children: Block[]` |

`Fragment` is a container block with no `name`. Its `meta` carries the `Meta` of the source Page it was materialized from, or `null`. A `Fragment` is a section-scope boundary and is opaque to the derived-structure folds (§9.5): the sectionization and pagination folds treat it as a single opaque item.

### Location Type

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
- Synthetic segments (`Fragment`) carry the `loc` of the causing construct in the containing file, or no `loc`.
- Diagnostics (CDN codes) carry a `loc` identifying the triggering source range.

### Reflection Type

```typescript
interface Reflection {
  loc: Loc       // source range of the ## payload (raw-file UTF-16 offsets, see Location Type)
  text: string   // ## payload with one leading space stripped, trailing whitespace preserved
}
```

`reflection` is typed `Reflection[] | null`, and is `null` when no `##` comment is present on or adjacent to the block. See §2.2 for attachment rules.

### Attributes Type

```typescript
type Attribute =
  | { key: "id",    value: string }
  | { key: "class", value: string[] }
  | { key: string,  value: string }   // value: "" for bare-key tokens
```

`attributes` is typed `Attribute[] | null`.

Ordering: entries appear in **source order**. Deduplication rules (see §6.1) may drop entries before the array is emitted.

---
