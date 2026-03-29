# Cutdown

Most markup languages are designed for HTML. Cutdown is designed for apps — it produces a structured AST that your application interprets and renders.

No HTML output. No rendering opinions. Just a clean, predictable tree.

---

## Quick example

```
= Hello **world**
```

```json
{
  "type": "Section",
  "level": 1,
  "heading": [
    { "type": "Text", "value": "Hello " },
    { "type": "Emphasis", "children": [{ "type": "Text", "value": "world" }] }
  ]
}
```

---

## Why Cutdown

- **AST-only** — your app owns the rendering. No canonical HTML output exists.
- **Unambiguous parsing** — exactly one valid parse for any input. No context-sensitive rules, no surprise behavior.
- **Content before presentation** — Cutdown encodes structure. Style is your app's concern at render time.
- **Semantic attributes** — `{banner}` is a hint to your app, not an HTML attribute. You decide what it means.

## What Cutdown doesn't do

- **No typography substitution** — straight quotes, dashes, and ellipses are never silently altered.
- **No raw HTML** — `<tag>` is literal `Text("<tag>")`. No HTML leaks into the AST.
- **No kitchen sink** — bare minimum features to structure content. Not a Markdown replacement.

---

## Syntax

[Quick reference → `SYNTAX.md`](SYNTAX.md) · [Full spec → `spec/TOC.md`](spec/TOC.md)

```
= Hello **world**

Some paragraph with ~~struck~~ text and a [link](https://example.com).

:::callout {.warning}
Watch out.
:::
```

---

## Repository layout

| Path | Contents |
|---|---|
| [`spec/`](spec/) | Language specification §1–§17 |
| [`grammar/`](grammar/) | Formal PEG grammar and semantic pass rules |
| [`tests/`](tests/) | Conformance corpus — golden YAML tests |
| [`extensions/`](extensions/) | Extension specs (task-item, mention) |
| [`policies/`](policies/) | Governance and conformance policies |
| [`SYNTAX.md`](SYNTAX.md) | Condensed syntax reference for tooling and AI agents |

---

## Spec status

**Version:** 0.2.0 · **Status:** Draft

The spec is under active development. Breaking changes may occur before 1.0.0.

---

## Implementations

No parser implementations exist yet.

The formal grammar ([`grammar/GRAMMAR.peg`](grammar/GRAMMAR.peg)) and semantic rules ([`grammar/SEMANTICS.md`](grammar/SEMANTICS.md)) are the starting point for building one. The conformance corpus ([`tests/`](tests/)) provides 87 golden tests covering all spec sections and all diagnostic codes.

## Tooling

No official tooling yet. If you build something — an editor plugin, linter, or renderer — open a PR to list it here.

---

## File extension

`.cutdown` is the recommended extension for Cutdown documents.

## MIME type

There is no official MIME type. `text/x-cutdown` may be used informally.

---

## For implementors

| Resource | Description |
|---|---|
| [`grammar/GRAMMAR.peg`](grammar/GRAMMAR.peg) | Formal PEG recognition grammar |
| [`grammar/SEMANTICS.md`](grammar/SEMANTICS.md) | CST → AST transformation passes |
| [`tests/`](tests/) | 87 conformance tests (golden YAML, all CDN codes) |
| [`SYNTAX.md`](SYNTAX.md) | Condensed syntax reference |

---

## License

[CC BY 4.0](LICENSE) — Anton Huz, Cuttie App
