## 14. Core Layer vs Extension Layer

### 14.1 Core Layer

The core layer defines structural primitives usable by any consumer, not just Cuttie.

| Construct | Section |
|-----------|---------|
| Headings / Sections | §9.1, §7 |
| Paragraphs | §9.2 |
| Thematic Break | §9.3 |
| Code Block | §9.4 |
| Meta block (Frontmatter) | §9.5 |
| QuoteBlock | §9.6 |
| Lists (unordered, ordered) | §9.7 |
| Tables | §9.8 |
| File References | §9.9 |
| Named Block | §9.10 |
| Reference Definition | §9.11 |
| Block Math Formula | §9.12 |
| Emphasis, Strong, Strikethrough | §10.2–10.4 |
| Inline Code | §10.5 |
| Text Break | §10.6 |
| Links, Inline Images | §10.7, §10.9 |
| Named Span | §10.10 |
| Inline Math Formula | §10.11 |
| Variable | §10.12 |
| Inline Quote | §10.13 |
| Universal Attributes | §5 |
| Escaping | §4 |

### 14.2 Extension Layer

The extension layer defines Cutdown nodes that are optional for consumers other than Cuttie. A parser MUST emit these nodes; a consumer MAY ignore them.

Extension parsing behavior is controlled by explicit parser profiles per `policies/parser-profile-policy.md`.

| Construct | Section | Spec | AST Node |
|-----------|---------|------|----------|
| Task Items | §9.7.4 | [`extensions/task-item/SPEC.md`](../extensions/task-item/SPEC.md) | `TaskItem` |
| User Mention | §10.8 | [`extensions/mention/SPEC.md`](../extensions/mention/SPEC.md) | `Mention` |


### 14.3 Out of Scope

The following constructs are explicitly NOT part of Cutdown:

- Raw HTML tags (`<tag>`) — treated as literal text
- Spoilers, hidden blocks, collapsible sections, alerts
- WikiLinks `[[...]]` — use `[text][page.md]` instead
- Hashtags `#tag` — consumer concern
- Colspan / rowspan in tables
- Indented code blocks
- Lazy blockquote continuation
- Setext-style headings
- ATX-style headings (`# Heading`) — `#` is the Cutdown comment marker (§8.3); a line beginning with `#` produces no AST node. Migration tools MUST convert `# H` → `= H`, `## H` → `== H`, etc.
- Single-backtick inline code (`` `code` ``) — single backtick is always literal text in Cutdown; double backtick (` ``code`` `) is required. Migration tools MUST convert single-backtick spans.

---
