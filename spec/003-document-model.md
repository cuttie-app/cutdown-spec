## 3. Document Model

Cutdown introduces `Document`, `Page`, `Section`, and `Block` segments to represent the logical structure of a document. The parser produces a tree of these segments, which is then consumed by renderers or other tools.

A Cutdown document is a tree rooted at a `Document` segment. Every file produces at least one `Page`, even if empty. Every file produce exactly one `Document` segment, even if multiple pages or multiple transclusions are present.

---

### 3.1 Document

The root node of every Cutdown file. Produced automatically — there is no explicit document syntax.

**AST type:**

```typescript
interface Document {
  type: "Document"
  children: Page[]
}
```

---

### 3.2 Page

A logical division within a document. Every document has at least one Page.

**AST type:**

```typescript
interface Page {
  type: "Page"
  meta: Meta | null
  children: Block[]
}
```

Pages are not parsed — they are **derived** from the root block sequence by the pagination fold, which is defined in §9.5.2. Two constructs drive it: `Meta` blocks (§4.3) and PageBreakers (§4.10).

A **Ghost Page** is a Page with `meta: null` and `children: []`. Ghost Pages are valid and emitted as-is; consumers decide how to handle them.

---
