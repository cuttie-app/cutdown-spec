## 14. AST Node (Segment) Reference

### Root Segments

| Segment    | Fields |
|------------|--------|
| `Document` | `type: "Document", children: Page[]` |
| `Page`     | `type: "Page", meta: Meta\|null, children: Block[]` |

### Block Segments

| Segment         | Fields |
|-----------------|--------|
| `Paragraph`     | `type: "Paragraph", children: Inline[], attributes` |
| `Section`       | `type: "Section", level: 1..9, heading: Inline[], children: Block[], attributes` |
| `CodeBlock`     | `type: "CodeBlock", language: string = "text", content: string, attributes` |
| `MathBlock`     | `type: "MathBlock", formula: string, attributes` |
| `QuoteBlock`    | `type: "QuoteBlock", children: Block[], attributes` |
| `List`          | `type: "List", ordered: bool, start: int\|null, loose: bool, children: (ListItem\|TaskItem)[], attributes` |
| `Table`         | `type: "Table", kind: "simple"\|"gfm", head: Row[]\|null, body: Row[], columns: Column[], attributes` |
| `ImageBlock`    | `type: "ImageBlock", alt: Inline[], src: string, attributes` |
| `ThematicBreak` | `type: "ThematicBreak", attributes` |
| `FileRef`       | `type: "FileRef", src: string, fragment: string\|null, query: string\|null, group: "image"\|"video"\|"audio"\|null, attributes` |
| `FileRefGroup`  | `type: "FileRefGroup", group: "image"\|"video"\|"audio", children: (FileRef\|ImageBlock)[], attributes` |
| `NamedBlock`    | `type: "NamedBlock", name: string, children: Block[], attributes` |

### Inline Segments

| Segment         | Fields |
|-----------------|--------|
| `Text`          | `type: "Text", value: string` |
| `Emphasis`      | `type: "Emphasis", children: Inline[], attributes` |
| `Strong`        | `type: "Strong", children: Inline[], attributes` |
| `Strikethrough` | `type: "Strikethrough", children: Inline[], attributes` |
| `Link`          | `type: "Link", kind: "external"\|"page"\|"tag"\|"ref"\|"cite", children: Inline[], href: string\|null, target: string\|null, attributes` |
| `CodeInline`    | `type: "CodeInline", value: string, attributes` |
| `MathInline`    | `type: "MathInline", formula: string, attributes` |
| `QuoteInline`   | `type: "QuoteInline", kind: "double"\|"single", children: Inline[], attributes` |
| `ImageInline`   | `type: "ImageInline", alt: Inline[], src: string, attributes` |
| `Span`          | `type: "Span", name: string, children: [], attributes` |
| `TextBreak`     | `type: "TextBreak"` |

### Special Nodes

| Segment         | Fields |
|-----------------|--------|
| `Meta`          | `type: "Meta", format: "yaml"\|"toml"\|"json" = "yaml", raw: string` |
| `RefDefinition` | `type: "RefDefinition", id: string, children: Inline[], attributes` |
| `ListItem`      | `type: "ListItem", children: (Block\|Inline)[], attributes` |
| `TaskItem`      | `type: "TaskItem", checked: bool, children: (Block\|Inline)[], attributes` |
| `Column`        | `type: "Column", align: "left"\|"right"\|"center"\|"comma"\|"decimal" = "left"` |
| `Row`           | `type: "Row", children: Cell[], attributes` |
| `Cell`          | `type: "Cell", children: Inline[], row: number, column: number` |
| `Variable`      | `type: "Variable", key: string, attributes` |

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
