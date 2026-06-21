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
| `Table`         | `type: "Table", kind: "simple"\|"gfm", head: Row[]\|null, body: Row[], columns: Column[], caption: Inline[]\|null, reflection, attributes`          |
| `ImageBlock`    | `type: "ImageBlock", alt: Inline[], src: string, caption: Inline[]\|null, reflection, attributes`                                                   |
| `ThematicBreak` | `type: "ThematicBreak", reflection, attributes`                                                                                                     |
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
| `Strikethrough` | `type: "Strikethrough", children: Inline[], attributes` |
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
| `Row`           | `type: "Row", children: Cell[], attributes`                                     |
| `Cell`          | `type: "Cell", children: Inline[], row: number, column: number`                 |
| `Variable`      | `type: "Variable", key: string, attributes`                                     |

### Reflection Type

```
Reflection[] | null

Reflection =
  { line: number   // 0-indexed offset from the block's opener line in source
    text: string   // ## payload with one leading space stripped
  }
```

`reflection` is `null` when no `##` comment is present on or adjacent to the block. See §2.2 for attachment rules.

### Attributes Type

```
Attribute[] | null

Attribute =
  | { key: "id",    value: string }
  | { key: "class", value: string[] }
  | { key: string,  value: string }   // value: "" for bare-key tokens
```

Ordering: entries appear in **source order**. Deduplication rules (see §6.1) may drop entries before the array is emitted.

---
