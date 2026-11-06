# Cutdown

You write structure. You write content.

**Cutdown** is a lightweight markup language with a closed, finite syntax, parsed in a single forward pass so a document renders as it arrives rather than after it ends. Two identical characters wrap inline text; three open a block. Thus, the parser resolves every construct when it is first encountered.

Cutdown derives from Markdown. The name is literal: *cut* from the wide variety *of Markdown* syntax features down to what content actually needs. It produces a structured document tree (pages, sections, paragraphs, lists, blocks) that an application interprets and renders. There is no canonical visual output. No rendering opinions baked in. Some things work the same as Markdown. Some were changed deliberately. Each change has a reason.

---

## Markup example

```cutdown
== Hello **world**
```

```yaml
_type: Section
level: 2
heading:
  - _type: Text
    value: "Hello "
  - _type: Strong
    children:
      - _type: Text
        value: "world"
```

[Quick reference → `SYNTAX.md`](SYNTAX.md) · [Full spec → `spec/TOC.md`](spec/TOC.md)

---

## Why Cutdown

### **Plain text separated by a blank line is a paragraph.**

That single rule is what made Markdown worth learning. No extra syntax. No delimiters. Two blocks of text separated by a double Enter are structurally paragraphs. You think, you write, you press Enter twice. This is a brilliant invention, and Cutdown preserves it carefully and completely. It is the foundation everything else is built on.

### **Any plain text is already a valid document.**

The parser is a total function. There is no error state, no invalid input, no rejection path. Text that carries no markup is a document of paragraphs; text that carries markup is a document with structure; there is nothing in between and nothing outside. It still reports warnings for ambiguous input, through a separate diagnostics channel.

For a pipeline, this is a load-bearing guarantee: parsing cannot fail, so there is no error-recovery branch to write and no malformed-document queue to drain. Every decoded Unicode text sequence in, exactly one tree out — the same tree, from every conforming implementation. This applies to every character prefix while text is arriving; unfinished ordinary markup follows its normal degradation rule. UTF-8 decoding belongs to the input boundary, not to Cutdown syntax.

### **Doubled delimiters only. Single characters are plain text.**

Cutdown uses doubled or tripled characters for all inline spans: `**bold**`, `~~highlight~~`, `$$math$$`, ` ``code`` `. Within a line, a single character is always plain text.

Consider ordinary prose: `your salary = hours * rate`, `they gathered ~100,000 people`, `$50,000`. In a language where a single `*`, `~`, or `$` could open a span, these require escaping or careful placement. In Cutdown, they do not. A doubled delimiter opens a span; a single one is text, with no flanking rules to learn. Block markers are the one place a single character carries meaning, and only as the first thing on a line (e.g. `= heading`, `- item`, `> quote`, `/path`). Inside a line, there is nothing to escape in normal writing.

Another benefit: a delimiter can go anywhere — mid-word, at the edges of a phrase, or in scripts written without spaces, such as Japanese.

### **What you type is what is stored.**

Cutdown performs no typographic substitution. Straight quotes `"` stay straight. `--` stays `--`. `...` stays `...`. Nothing is silently transformed. If your output needs typographic quotes, that transformation belongs to the renderer, where it can be configured per locale and applied consistently. In source, your text is exactly what you typed.

This matters in practice. A content pipeline handling technical documentation, pricing, or any mix of prose and code needs predictable literal characters. Silent substitution is a class of bugs that appears only at render time, varies by parser, and is hard to trace back to source.

### **A newline inside a paragraph is nothing.**

`word\nword` concatenates to `wordword`. Cutdown inserts no character at a line break: not a space, not a carriage return, not anything. If a word boundary is wanted, the writer owns it, visibly, at the start of the next line: `word\n word` yields `word word`. Trailing spaces, which editors strip, carry no meaning.

This makes line wrapping safe in every script. `よう\nこそ` renders as `ようこそ` ("welcome") wrapped mid-word and still intact, with no corrupting space injected between characters that carry their own spacing. Western prose keeps its boundaries by indenting the continuation line one column past its base. One rule, uniform inside inline spans and plain paragraph text alike, with no locale table and no heuristic.

A hard break, for the rhythm of a poem, is still available: end the line with a backslash (§5.13).

### **Angle brackets are plain text.**

`<em>` in a Cutdown document is exactly four characters of content. It's not a tag, not a link, not an escape hatch, not a passthrough. Angle brackets carry no meaning anywhere in the language.

The consequence for anyone rendering user-written content: there is no raw-HTML channel. Markup cannot smuggle a tag, a script, or a style into the output. What remains is data the renderer chooses how to use — link schemes, attribute keys, paths, URLs — and the specification names each one and the check it needs ([Security Considerations](spec/021-security-considerations.md)). The attack surface is a short, closed list, not an open-ended HTML sanitizer.

### **Documents have pages.**

Each `---` line cuts a page. A Meta block fills the current page or opens the next one. Sections nest inside pages, and all of it is in the tree: `Document → Page[] → Section → …`. Nothing is inferred by the renderer; pagination and outline are parser output, not post-processing.

Slide decks, paginated articles, per-page metadata: structures that other formats reconstruct downstream with heuristics are first-class nodes here. If your application doesn't need pages, a document is simply one page; the model costs nothing when unused.

Multiple Meta blocks are valid in a single document. Even prose, a comment, or a license notice above frontmatter is ordinary content, not a violation. Meta blocks belong at page scope; inside a block container the span is ordinary text and a diagnostic is emitted.

### **`##` for author comments, `###` for block comments.**

Finally, markup has a legal way to place a comment: a part of the source that is hidden from rendering by default. It is not something you reach for in every document. But when you need it, you discover how useful it is: annotations, draft notes, TODO markers, editorial reminders that belong to the source and nowhere else.

`## comment` is a single-line comment (line-start or mid-line; runs to end of line). `### ... ###` brackets a block. The syntax is family-aligned with C++/JS `//`, Python `#`, and YAML `#` — a familiar shape from any keyboard. Comments are kept in the AST (`reflections` on each block and on each Page) so that formatters, IDE folding, and comment-thread tools can round-trip them; the default render policy is hidden.

### **`=` instead of `#` for headings.**

`=` is reachable on effectively every keyboard layout, carries no meaning in prose, and has precedent: AsciiDoc and Typst use the same convention. An `=` at the start of a line marks a heading. Depth is the count: `=` is level one, `==` is level two.

And a heading here is not a styled line. It opens a **Section**: a real container in the tree, spanning until the next heading of the same or higher level. Cutdown gives you the outline for free, from the AST.

---

## What Cutdown doesn't do

**No feature for its own sake.**

Cutdown has headings, paragraphs, lists, tables, quotes, code, links, emphasis, spoilers, images, file references, and named blocks. Nothing else. Every construct earned its place because content needs it, not because it was possible to add. A smaller syntax is a more learnable syntax, a more implementable parser, and a more consistent authoring experience across tools.

The syntax is closed. Application-specific vocabulary lives in named blocks, marks, and attributes — the set of *names* grows with your application; the set of *rules* does not.

---

## Repository layout

| Path | Contents |
|---|---|
| [`spec/`](spec/) | Language specification §1–§21 and Appendices A–C |
| [`tests/`](tests/) | Conformance corpus — golden YAML tests |
| [`policies/`](policies/) | Governance and conformance policies |
| [`SYNTAX.md`](SYNTAX.md) | Quick reference for authors: what to type and what you get |

---

## Spec status

**Version:** 0.12.0 · **Status:** Draft

The spec is under active development. Breaking changes may occur before 1.0.0.

---

## Implementations

- **[cutdown-ts](https://github.com/cuttie-app/cutdown-ts)** — TypeScript parser and AST generator. [npm](https://www.npmjs.com/package/cutdown-parser), [npmx.dev](https://npmx.dev/package/cutdown-parser)

The spec ([`spec/`](spec/)) and conformance corpus ([`tests/`](tests/)) are the starting point for building one. The corpus provides golden YAML tests covering all spec sections and all diagnostic codes.

---

## File extension and media type

Cutdown files use the extension `.cutdown` and the media type `text/x-cutdown`; readers also accept `text/cutdown`. See §1.6 of the [specification](spec/001-preliminaries.md).

---

## For Contributors

See [`CONTRIBUTION.md`](CONTRIBUTION.md)

---

## License

[CC BY 4.0](LICENSE), crafted by Anton Huz at Cuttie App
