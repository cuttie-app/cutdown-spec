# Cutdown

You write structure. You write content.

**Cutdown** is a lightweight markup language with a closed, finite syntax, parsed in a single forward pass so a document renders as it arrives rather than after it ends. Two identical characters wrap inline text; three open a block. Thus, the parser resolves every construct when it is first encountered.

Cutdown derives from Markdown. The name is literal: *cut* from the wide variety *of Markdown* syntax features down to what content actually needs. It produces a structured document tree — pages, sections, paragraphs, lists, blocks — that an application interprets and renders. There is no canonical visual output. No rendering opinions baked in. Some things work the same as Markdown. Some were changed deliberately. Each change has a reason.

---

## Quick example

```
== Hello **world**
```

```json
{
  "type": "Section",
  "level": 2,
  "heading": [
    { "type": "Text", "value": "Hello " },
    { "type": "Strong", "children": [{ "type": "Text", "value": "world" }] }
  ]
}
```

---

## Why Cutdown

### **Plain text separated by a blank line is a paragraph.**

That single rule is what made Markdown worth learning. No extra syntax. No delimiters. No toolbar. Two blocks of text separated by a double Enter are structurally paragraphs — you think, you write, you press Enter twice. This is a brilliant invention, and Cutdown preserves it carefully and completely. It is the foundation everything else is built on.

### **Any plain text is already a valid document.**

The parser is a total function. There is no error state, no invalid input, no rejection path. Text that carries no markup is a document of paragraphs; text that carries markup is a document with structure; there is nothing in between and nothing outside.

For a pipeline, this is a load-bearing guarantee: parsing cannot fail, so there is no error-recovery branch to write and no malformed-document queue to drain. Every decoded Unicode text sequence in, exactly one tree out — the same tree, from every conforming implementation. This applies to every character prefix while text is arriving; unfinished ordinary markup follows its normal degradation rule. UTF-8 decoding belongs to the input boundary, not to Cutdown syntax.

### **Doubled delimiters only. Single characters are plain text.**

Cutdown uses doubled or tripled characters for all inline spans: `**bold**`, ` ``code`` `, `~~highlight~~`, `$$math$$`. A single character is always plain text — no exceptions, no flanking rules.

Consider ordinary prose: `$50,000`, `they gathered ~100,000 people`, `your salary = hours * rate`. In a language where a single `$`, `~`, or `=` could open a span, these require escaping or careful placement. In Cutdown, they do not. A doubled delimiter opens a span. A single one is text. The rule is the same everywhere, with no context sensitivity and nothing to escape in normal writing.

### **Markup that doesn't resolve becomes plain text.**

An opener with no closer does not poison the line, does not reach backward, does not get repaired by guesswork. The span from the failed opener to the end of the line is emitted as plain text — exactly the characters that were typed, in the order they were typed.

One rule covers every construct. A writer can predict the output of any line by reading it once, left to right, the same way the parser does. A developer gets determinism where markup languages are traditionally at their most creative: the handling of imperfect input.

### **What you type is what is stored.**

Cutdown performs no typographic substitution. Straight quotes `"` stay straight. `--` stays `--`. `...` stays `...`. Nothing is silently transformed. If your output needs typographic quotes, that transformation happens in the renderer — configured by locale, applied consistently. In source, your text is exactly what you typed.

This matters in practice. A content pipeline handling technical documentation, pricing, or any mix of prose and code needs predictable literal characters. Silent substitution is a class of bugs that appears only at render time, varies by parser, and is hard to trace back to source.

### **A newline inside a paragraph is nothing.**

`word\nword` concatenates to `wordword`. Cutdown inserts no character at a line break — not a space, not anything. If a word boundary is wanted, the writer owns it: `word \nword` keeps the trailing space and yields `word word`.

This makes line wrapping safe in every script. `よう\nこそ` renders as `ようこそ` — *welcome!* — wrapped mid-word and still intact, with no corrupting space injected between characters that carry their own spacing. Western prose keeps its boundaries, because words end in spaces. One rule, uniform inside inline spans and plain paragraph text alike, with no locale table and no heuristic.

### **Angle brackets are plain text.**

`<em>` in a Cutdown document is exactly four characters of content — not a tag, not an escape hatch, not a passthrough. Angle brackets carry no meaning anywhere in the language.

The consequence for anyone rendering user-written content: there is nothing to sanitize, because there is no channel through which markup can smuggle executable output. The injection surface does not exist — not narrowed, not filtered: absent by construction.

### **Documents have pages.**

A `---` line cuts a page. A Meta block fills the current page or opens the next one. Sections nest inside pages, and all of it is in the tree: `Document → Page[] → Section → …`. Nothing is inferred by the renderer; pagination and outline are parser output, not post-processing.

Slide decks, paginated articles, per-page metadata — structures that other formats reconstruct downstream with heuristics are first-class nodes here. If your application doesn't need pages, a document is simply one page; the model costs nothing when unused.

A Meta block is legal anywhere, and multiple Meta blocks are valid in one document — a comment or a license notice above frontmatter is ordinary content, not a violation.

### **`##` for author comments, `###` for block comments.**

Finally, markup has a legal way to place a comment — a part of the source that is hidden from rendering by default. It is not something you reach for in every document. But when you need it, you discover how useful it is: annotations, draft notes, TODO markers, editorial reminders that belong to the source and nowhere else.

`## comment` is a single-line comment (line-start or mid-line; runs to end of line). `### ... ###` brackets a block. The syntax is family-aligned with C++/JS `//`, Python `#`, and YAML `#` — a familiar shape from any keyboard. Comments are first-class AST nodes (`Block.reflection`, `CommentBlock`) so that formatters, IDE folding, and comment-thread tools can round-trip them; the default render policy is hidden.

### **`=` instead of `#` for headings.**

`=` is reachable as a single keypress on effectively every keyboard layout, carries no meaning in prose or code, and has precedent: AsciiDoc and Typst use the same convention. Depth is the count — `=` is level one, `==` is level two. Consistent everywhere.

And a heading here is not a styled line. It opens a **Section** — a real container in the tree, spanning until the next heading of the same or higher level. The outline you see is the AST you get.

---

If your team is already familiar with Markdown and evaluating whether Cutdown fits an existing content workflow, the changes above address specific, documented problems in Markdown-based pipelines: parser inconsistency across implementations, HTML injection surface, typographic substitution producing unexpected characters in technical content, and the absence of structured output for programmatic processing. The specification is defined by prose rules and an executable conformance corpus; a compliant parser produces identical output regardless of implementation language. AST output means your application controls rendering completely — no HTML string manipulation, no post-processing sanitizers.

What Cutdown cannot yet promise: the spec is pre-1.0 and breaking changes may occur. A reference [TypeScript parser](https://github.com/cuttie-app/cutdown-ts) exists and tracks the spec; production hardening is ongoing. If your workflow needs a settled standard today, the honest answer is that Cutdown is not there yet. If you are building a new content pipeline and want to start on a better foundation, the spec and conformance corpus are complete enough to build from.

---

## What Cutdown doesn't do

**No kitchen sink.**

Cutdown has headings, paragraphs, lists, tables, quotes, code, links, emphasis, spoilers, images, file references, and named blocks. Nothing else. Every construct earned its place because content needs it, not because it was possible to add. A smaller syntax is a more learnable syntax, a more implementable parser, and a more consistent authoring experience across tools.

The syntax is closed. Application-specific vocabulary lives in named blocks, spans, and attributes — the set of *names* grows with your application; the set of *rules* does not.

---

## If you know Markdown

Cutdown is not a Markdown dialect. Most of it will feel familiar, but these differ — and they differ **silently**, producing a valid document rather than an error:

| You write | CommonMark/GFM gives you | Cutdown gives you |
|---|---|---|
| `# Title` | Heading | **Comment** — headings are `= Title` |
| `__text__` | Strong | **Emphasis** — `**text**` is Strong |
| `~~text~~` | Strikethrough | **Highlight** — no deletion semantics |
| `---` | Thematic break (`<hr>`) | **PageBreak** — a document structure boundary |
| `*text*`, `_text_` | Emphasis | **Literal text** — single symbols are never delimiters |
| four-space indent | Code block | **Nothing** — indented code blocks are not supported |

`__text__` is the one to watch: it produces Emphasis where you meant Strong, with no diagnostic and nothing visibly wrong in the source.

Cutdown also has constructs absent from CommonMark and GFM, though several will be familiar from the wider Markdown family — Pandoc and Djot both have fenced divs and attribute syntax, and Djot is credited below as an inspiration:

| Cutdown | Closest prior art |
|---|---|
| `{#id .class key=value}` attributes on anything | Pandoc attribute blocks; Djot attributes; kramdown / PHP Markdown Extra attribute lists |
| `:::name` named blocks | Pandoc and Djot fenced divs |
| `::name` spans | Pandoc bracketed spans; Djot inline spans |
| `^ caption` lines | Pandoc image captions (narrower — Cutdown captions bind to any captionable block) |
| `^^spoilers^^` | no common equivalent |

What is unusual is not the individual constructs but that they are **built into one closed syntax** rather than supplied by extensions that vary per implementation.

The reason single symbols are literal is the doubling rule — see [**Doubled delimiters only**](#doubled-delimiters-only-single-characters-are-plain-text) above. It is why `snake_case`, `2*3`, and apostrophes need no escaping.

---

## Syntax

[Quick reference → `SYNTAX.md`](SYNTAX.md) · [Full spec → `spec/TOC.md`](spec/TOC.md)

```
= Hello **world**

Some paragraph with ~~highlighted~~ text and a [link](https://example.com).

:::callout {.warning}
  Watch out.
:::
```

---

## Repository layout

| Path | Contents |
|---|---|
| [`spec/`](spec/) | Language specification §1–§16 |
| [`tests/`](tests/) | Conformance corpus — golden YAML tests |
| [`policies/`](policies/) | Governance and conformance policies |
| [`SYNTAX.md`](SYNTAX.md) | Condensed syntax reference for tooling and AI agents |

---

## Spec status

**Version:** 0.9.0 · **Status:** Draft

The spec is under active development. Breaking changes may occur before 1.0.0.

---

## Implementations

- **cutdown-ts** — TypeScript parser and AST generator. [GitHub](https://github.com/cuttie-app/cutdown-ts), [npm](https://www.npmjs.com/package/cutdown-parser), [npmx.dev](https://npmx.dev/package/cutdown-parser)

The spec ([`spec/`](spec/)) and conformance corpus ([`tests/`](tests/)) are the starting point for building one. The corpus provides golden YAML tests covering all spec sections and all diagnostic codes.

## Tooling

No official tooling yet. If you build something — an editor plugin, linter, or renderer — open a PR to list it here.

---

## File extension

`.cutdown` is the recommended extension for Cutdown documents.

## MIME type

The media type is `text/cutdown`. It is not yet registered with IANA; registration is intended. 

---

## For implementors

| Resource | Description |
|---|---|
| [`spec/`](spec/) | Language specification §1–§16 |
| [`tests/`](tests/) | Conformance tests (golden YAML, all CDN codes) |
| [`SYNTAX.md`](SYNTAX.md) | Condensed syntax reference |

---

## For Contributors

[See `CONTRIBUTION.md`](CONTRIBUTION.md)

---

## Acknowledgements

*Inspired by [CommonMark](https://commonmark.org), [Djot](https://djot.net), Carve.*

---

## License

[CC BY 4.0](LICENSE) — Anton Huz, Cuttie App
