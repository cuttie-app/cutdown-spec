# Extension: Task Item

- **Status:** Active
- **Layer:** Extension
- **AST Node:** `TaskItem`
- **Inline / Block:** Block (list item variant)
- **Parser profile:** `task-item`

---

## Summary

The `TaskItem` extension recognizes checkbox-prefixed unordered list items and emits `TaskItem` nodes carrying a `checked` boolean. Consumers that support interactive or renderable task lists (to-do lists, checklists) use this node; consumers that do not may ignore it and fall back to treating the item as a regular `ListItem`.

---

## Syntax

```
- [ ] Unchecked task
- [x] Checked task
- [X] Also checked
```

- Marker: `- ` (standard unordered list marker) followed immediately by `[ ]` (unchecked) or `[x]`/`[X]` (checked), then a space and inline content.
- Only unordered list items may be task items. Ordered list items cannot carry checkboxes.
- A task item is still part of a `List` node. The `List` node's `ordered: false` applies.

---

## AST

```
List { ordered: false, loose: bool, children: (ListItem | TaskItem)[], attributes }

TaskItem { checked: bool, children: (Block | Inline)[], attributes: Attributes }
```

A `List` may contain a mix of `ListItem` and `TaskItem` children. `TaskItem` follows the same multiline and block-promotion rules as `ListItem` (§9.7.5): an intra-item blank line promotes children to `Block[]`; a nested list causes the preceding inline content to be wrapped in a `Paragraph`.

---

## Examples

```
Input:
  - [ ] Buy milk
  - [x] Write spec
  - plain item

AST:
  List { ordered: false, loose: false }
  ├── TaskItem { checked: false, children: [Text("Buy milk")] }
  ├── TaskItem { checked: true,  children: [Text("Write spec")] }
  └── ListItem { children: [Text("plain item")] }
```

---

## Fallback for Non-Supporting Consumers

A consumer that does not implement this extension SHOULD treat `TaskItem` nodes as regular `ListItem` nodes, ignoring the `checked` field. The inline children are preserved.

---

## Rationale

`TaskItem` is an extension (not core) because the `checked` boolean represents mutable UI state — a checkbox. A PDF renderer, static site generator, or document archiver has no meaningful use for it. Regular `ListItem` is the correct fallback. Consumers that render interactive UIs (like Cuttie) opt in via their parser profile.
