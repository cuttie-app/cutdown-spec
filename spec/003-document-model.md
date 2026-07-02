## 3. Document Model

A Cutdown document is a tree rooted at a `Document` segment. Every file produces at least one `Page`, even if empty.

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
  meta: Meta | {}
  children: Block[]
}
```

Pages are not parsed — they are **derived** from the root block sequence by the pagination fold (§9.5.2). In summary:

- The initial Page is always present at document start, even if empty.
- A PageBreak (top-level `---`, §9.6) unconditionally closes the current Page — as a Ghost Page if empty — and opens a new one. It produces no node.
- A `Meta` block closes the current Page and opens a new Page carrying it as `meta`, unless it is the first pagination-relevant item of the document, in which case it fills the initial Page's `meta`.

Ghost Pages (`meta: null`, `children: []`) are valid and emitted as-is. Consumers decide how to handle them.

---

See `Section` in §4 Block Segments.
