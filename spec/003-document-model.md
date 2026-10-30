## 3. Document Model

Cutdown introduces `Document`, `Page`, `Section`, and `Block` segments to represent the logical structure of a document. The parser produces a tree of these segments, which is then consumed by renderers or other tools.

A Cutdown document is a tree rooted at a `Document` segment. Every file produces at least one `Page`, even if empty. Every file produces exactly one `Document`, however many pages it holds.

---

### 3.1 Document

The root node of every Cutdown file. Produced automatically — there is no explicit document syntax.

**AST type:**

```typescript
interface Document {
  _type: "Document"
  children: Page[]
}
```

---

### 3.2 Page

A logical division within a document. Every document has at least one Page.

**AST type:**

```typescript
interface Page {
  _type: "Page"
  meta: Meta | null
  reflections: SegmentReflection[]
  children: Block[]
}
```

`reflections` holds the Page's segment comments — every CommentBlock and orphan `##` line on the Page, at any depth — in source order (§2.3).

Pages are not parsed — they are **derived** from the root block sequence by the pagination fold, which is defined in §9.3.2. Two constructs drive it: `Meta` blocks (§4.3) and PageBreakers (§4.10).

A **Ghost Page** is a Page with `meta: null`, `reflections: []`, and `children: []`. Ghost Pages are valid and emitted as-is; consumers decide how to handle them.

---
