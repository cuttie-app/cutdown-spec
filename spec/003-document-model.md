## 3. Document Model

A Cutdown document is a tree rooted at a `Document` node. Every file produces at least one `Page`, even if empty.

---

### Document

The root node of every Cutdown file. Produced automatically — there is no explicit document syntax.

**AST type:**

```typescript
interface Document {
  type: "Document"
  children: Page[]
}
```

---

### Page

A logical division within a document. Every document has at least one Page.

**AST type:**

```typescript
interface Page {
  type: "Page"
  meta: Meta | null
  children: (ThematicBreak | Section | Block)[]
}
```

**Pages are opened by:**
- Initial Page: always present at document start, even if empty.
- `ThematicBreak` (`---`) at top level → closes current Page, opens new Page; `ThematicBreak` becomes first child of the new Page.
- `Meta` block when `Page.meta` is already set → closes current Page, opens new Page, fills its `meta`.

Ghost Pages (`meta: null`, `children: []`) are valid and emitted as-is. Consumers decide how to handle them.

---

### Section

**Syntax:** `={n} inline-content {attrs}`

A heading creates a `Section` node. Consumers receive `Section` nodes — there is no bare `Heading` node in the AST. A section contains all subsequent blocks until a heading of equal or lesser level, end of the current block container, or end of document.

**AST type:**

```typescript
interface Section {
  type: "Section"
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  heading: Inline[]
  children: (Section | Block)[]
  attributes: Attribute[]
}
```

| Syntax              | Level |
|---------------------|-------|
| `= Heading`         | 1     |
| `== Heading`        | 2     |
| `=== Heading`       | 3     |
| `==== Heading`      | 4     |
| `===== Heading`     | 5     |
| `====== Heading`    | 6     |
| `======= Heading`   | 7     |
| `======== Heading`  | 8     |
| `========= Heading` | 9     |

- Heading content is **parsed by inline rules**. Result is `Inline[]`.
- A heading MUST be preceded by a blank line (or be the first non-comment line of the document or block container).
- The **last `{...}` on the heading line** is claimed by the Section (Last-Attr Rule). Earlier `{...}` attach to preceding inline elements. An explicit empty `{}` as the last token means the Section carries no attributes.
- Sections nest by level. A level-2 heading inside a level-1 section creates a child section. A level-1 heading closes all open sections and opens a new one at the root.
- Sections may appear inside block containers (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`). Scoping follows the same level logic but is **bounded by the container** — never crosses container boundaries.

---
