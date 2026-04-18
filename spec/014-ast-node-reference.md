## 14. AST Node Reference

### Block Nodes

| Node | Fields |
|------|--------|
| `Document` | `type: "Document", children: Page[]` |
| `Page` | `type: "Page", meta: Meta\|null, children: (ThematicBreak\|Section\|Block)[]` |
| `Section` | `type: "Section", level: 1..9, heading: Inline[], attributes, children: (Section\|Block)[]` |
| `Paragraph` | `type: "Paragraph", children: Inline[], attributes` |
| `ThematicBreak` | `type: "ThematicBreak", attributes` |
| `CodeBlock` | `type: "CodeBlock", language: string = "text", content: string, attributes` |
| `Meta` | `type: "Meta", format: "yaml"\|"toml"\|"json" = "yaml", raw: string` |
| `QuoteBlock` | `type: "QuoteBlock", children: (Section\|Block)[], attributes` |
| `List` | `type: "List", ordered: bool, start: int\|null, loose: bool, children: (ListItem\|TaskItem)[], attributes` |
| `ListItem` | `type: "ListItem", children: (Section\|Block\|Inline)[], attributes` |
| `TaskItem` | `type: "TaskItem", checked: bool, children: (Section\|Block\|Inline)[], attributes` |
| `Table` | `type: "Table", kind: "simple"\|"gfm", head: Row[]\|null, body: Row[], columns: Column[], attributes` |
| `Row` | `type: "Row", children: Cell[], attributes` |
| `Cell` | `type: "Cell", children: Inline[], row: number, column: number` |
| `Column` | `type: "Column", align: "left"\|"right"\|"center"\|"comma"\|"decimal" = "left"` |
| `FileRef` | `type: "FileRef", src: string, fragment: string\|null, query: string\|null, group: "image"\|"video"\|"audio"\|null, attributes` |
| `ImageBlock` | `type: "ImageBlock", alt: Inline[], src: string, attributes` |
| `FileRefGroup` | `type: "FileRefGroup", group: "image"\|"video"\|"audio", children: (FileRef\|ImageBlock)[], attributes` |
| `NamedBlock` | `type: "NamedBlock", name: string, attributes, children: (Section\|Block)[]` |
| `RefDefinition` | `type: "RefDefinition", id: string, children: Inline[], attributes` |
| `MathBlock` | `type: "MathBlock", formula: string, attributes` |

### Inline Nodes

| Node | Fields |
|------|--------|
| `Text` | `type: "Text", value: string` |
| `Emphasis` | `type: "Emphasis", children: Inline[], attributes` |
| `Strong` | `type: "Strong", children: Inline[], attributes` |
| `Strikethrough` | `type: "Strikethrough", children: Inline[], attributes` |
| `CodeInline` | `type: "CodeInline", value: string, attributes` |
| `TextBreak` | `type: "TextBreak"` |
| `Link` | `type: "Link", kind: "external"\|"page"\|"tag"\|"ref"\|"cite", children: Inline[], href: string\|null, target: string\|null, attributes` |
| `ImageInline` | `type: "ImageInline", alt: Inline[], src: string, attributes` |
| `Span` | `type: "Span", name: string, children: [], attributes` |
| `MathInline` | `type: "MathInline", formula: string, attributes` |
| `Variable` | `type: "Variable", key: string, attributes` |
| `QuoteInline` | `type: "QuoteInline", kind: "double"\|"single", children: Inline[], attributes` |

### Attributes Type

```
Attribute[] | null

Attribute =
  | { key: "id",    value: string }
  | { key: "class", value: string[] }
  | { key: string,  value: string }   // value: "" for bare-key tokens
```

`null` means no attribute block was present in source. An empty `[]` means an explicit empty block `{}` was authored.

Ordering: entries appear in **source order**. Deduplication rules (see §6.1) may drop entries before the array is emitted.

---
