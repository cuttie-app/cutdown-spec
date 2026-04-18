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
  meta: Meta | {}
  children: Block[]
}
```

**Pages are opened by:**
- Initial Page: always present at document start, even if empty.
- `ThematicBreak` (`---`) at top level → closes current Page, opens new Page; `ThematicBreak` becomes first child of the new Page.
- `Meta` block when `Page.meta` is already set → closes current Page, opens new Page, fills its `meta`.

Ghost Pages (`meta: null`, `children: []`) are valid and emitted as-is. Consumers decide how to handle them.

---

See `Section` in §4 Block Segments.
