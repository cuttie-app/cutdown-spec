## C. Rationale

*This appendix is informative. It explains the rules of §1–§21 and adds none; where it and a numbered section seem to differ, the section governs.*

### C.1 Where Cutdown sits

RFC 7764[^RFC7764] places text formats on a line from plain text to formal markup such as HTML and XML, with Markdown as *informal* markup between them. Informality is Markdown's founding premise: "there is no such thing as 'invalid' Markdown".

Cutdown keeps the informal surface — blank lines make paragraphs, no markup is required, no input is invalid — and pairs it with a formal specification: a closed syntax, a normative AST, a fixed list of diagnostics, a conformance corpus, a canonical form, and streaming and complexity clauses. It also removes the island of formal markup that Markdown carries, raw HTML. The entries below are the decisions that follow from that position.

One rule is inherited unchanged and needs no entry: plain text separated by a blank line is a paragraph (§4.1). It is Markdown's best idea, and Cutdown keeps it whole.

### C.2 Every input is a document

A parser accepts every sequence of characters and never fails (§20.2 clause 1). Unusual input yields warnings, never errors (§17.1).

A pipeline that parses Cutdown needs no error branch and no queue of rejected documents. An author is never told that a document is broken; at worst, a construct reads as plain text. Warnings keep the "probably not what you meant" signal without making the parse conditional: a build may treat any warning as a failure of its own.

**Example.** `[x][y]` → `Text("[x][y]")` and warning CDN-0036 — the input is kept, and the author is told why it did not become a link.

**Cost.** A total language cannot reject a typo. The diagnostic list is closed (§17.2), so a mistake that no code names stays silent.

**Prior art.** CommonMark is total by the same definition: "Any sequence of characters is a valid CommonMark document" (CommonMark §2.1[^COMMONMARK]), and so are GFM and MultiMarkdown; none of the three defines diagnostics. Fountain states the same principle for screenplays: "When in doubt, Fountain returns text as Action" (Fountain 1.1, Error Handling[^FOUNTAIN]). Typst, by contrast, turns an unclosed delimiter into an error node[^TYPST].

### C.3 Doubled delimiters

Every inline span opens with a doubled symbol — `**strong**`, `__emphasis__`, `~~highlight~~`, `^^spoiler^^`, ` ``code`` `, `$$math$$`. A single symbol inside a line is always text, and no flanking rule decides whether a run opens or closes (§11.4).

Ordinary prose is full of single symbols: `$50`, `~100 people`, `2*3`, `snake_case`, `don't`. If any of them can open a span, a writer must escape or rephrase, and a reader must know which surrounding characters disarm them. With doubled delimiters a reader predicts the grammar instead of memorising it: one symbol is text, two open an inline segment, three open a block. The rule also works unchanged in scripts with no spaces between words, where whitespace-based flanking has nothing to measure.

**Example.** `$50 and ~100 people, 2*3*4` → one `Text` run. `**テスト。**テスト` → `Strong([Text("テスト。")])`, `Text("テスト")`.

**Cost.** Every span costs two keystrokes more than its Markdown single form, and `*text*` written from habit stays literal. `__text__` is emphasis, not strong as in Markdown. Doubled runs still occur in code-like prose — `__init__`, `**kwargs` — and need a code span or an escape there.

**Prior art.** CommonMark decides emphasis with left- and right-flanking delimiter runs and a set of numbered rules (CommonMark §6.2[^COMMONMARK]); GFM adds strikethrough with one or two tildes (GFM §6.5[^GFM]); MultiMarkdown activates single `^`, `~`, and `$` as well (MultiMarkdown Superscripts and Subscripts, Math[^MULTIMARKDOWN]). Creole 1.0 gives Cutdown's reason in its own words: "Double symbols are generally used in Creole to avoid accidentally parsing text not meant to be parsed"[^CREOLE]. txt2tags and DokuWiki double every span as well; reStructuredText notes that its flanking rules cover about 90% of non-markup uses (Inline markup recognition rules[^RST]).

### C.4 Markup that does not resolve becomes text

An opener with no closer degrades to the characters that were typed (§12.1.4.1). A doubled opener becomes text and parsing continues; a bracket-like opener turns the rest of its line into one literal run. The parser never backtracks.

An author can predict any line by reading it once, as the parser does. What an opener becomes never depends on text further down the document, which is also what makes streaming possible (C.15). Degradation is silent and visible at once: the reader sees exactly what was typed.

**Example.** `**open and done` → `Text("**open and done")`. `[a __b__ c` → `Text("[a __b__ c")`.

**Cost.** A bracket-like opener with no closer also hides the valid spans after it on its line, as `__b__` above. Auto-closing an unfinished span while the author types is ruled out.

**Prior art.** CommonMark leaves unclosed delimiters literal too, but settles them after scanning the inline content, and a reference link waits for a definition that may come at the end of the document (CommonMark §3.1, Appendix A[^COMMONMARK]). Djot settles them in the same forward direction as Cutdown: "the first opener that gets closed takes precedence"[^DJOT]. Carve forbids backtracking by definition[^CARVE].

### C.5 A soft break is nothing

A line terminator inside a paragraph adds no character (§15.1). A word boundary across lines is written as whitespace at the start of the continuation line.

Japanese, Chinese, Thai, and other scripts put no space between words. A rule that turns a line break into a space breaks a word whenever a writer wraps a line inside it. With no character inserted, wrapping is safe in every script, with no locale table and no heuristic. Trailing spaces, which editors strip, carry no meaning.

**Example.** `よう⏎こそ` → `Text("ようこそ")`. `word⏎ word` → `Text("word word")`.

**Cost.** Hard-wrapped English pasted from Markdown joins words unless each continuation line starts with a space. Canonical form writes each inline context on one line (§18.1 row 19), so line-based diffs of long paragraphs are coarser.

**Prior art.** CommonMark lets a soft break render "either as a line ending or as a space" (CommonMark §6.8[^COMMONMARK]), and GFM follows it (GFM §6.13[^GFM]); either way a browser shows a space. Pandoc offers `east_asian_line_breaks` and `ignore_line_breaks` as opt-in extensions for the same problem[^PANDOC]. Outside markup, joining lines with nothing between them is old practice, though behind an explicit marker: bash removes a backslash–newline pair, which "is removed from the input stream and effectively ignored"[^BASH], and C deletes one in translation phase 2, "splicing physical source lines to form logical source lines"[^C17]. Cutdown makes the join the default and marks the space instead.

### C.6 What is typed is what is stored

Cutdown performs no typographic substitution: straight quotes, `--`, and `...` stay as typed. Character references such as `&amp;` are text (§10).

Technical prose mixes language and code — `--flag`, `...args`, `5'10"`. Substitution in the parser turns these into other characters, varies by tool and locale, and shows up only after rendering. Typography is a rendering choice, made once per locale by the consumer. And an author who wants the typographic character can type it: modern systems put the common ones on the keyboard — `—`, `«»`, `©`, `®`, `…` — through Option on macOS, the symbol panel (Win + .) on Windows, and the Compose key on Linux. Where a quote is meaningful, `""…""` and `''…''` say so in the tree (§5.8).

**Example.** `"a" -- b...` → `Text("\"a\" -- b...")`.

**Cost.** A consumer that wants curly quotes and dashes implements locale-aware typography, or the author types the Unicode characters.

**Prior art.** The CommonMark and GFM specifications define no substitution, though implementations offer it as an option. MultiMarkdown enables smart typography by default, with quote styles chosen by metadata (MultiMarkdown Smart Typography[^MULTIMARKDOWN]); Pandoc and Djot convert straight quotes by default. Gemtext leaves "typographical niceties" to the client, as Cutdown does[^GEMTEXT].

### C.7 No raw HTML; the output is a tree

Angle brackets match no rule, so they are always text (§5.1), and character references are not decoded (§10 item 8). A parser produces an AST (§A), not HTML, and conformance compares ASTs (§20.2).

Without raw HTML, a document can carry into its consumer only what §21 lists, and an application that renders the tree needs no HTML sanitizer. `<` in prose — `List<String>`, `a<b`, `<3` — stays text. A tree serves every consumer the same way: a browser, a native view, a search index, a speech engine. Conformance by tree also avoids comparing details that carry no structure, such as attribute order or entity spelling.

**Example.** `<em>x</em>` → `Text("<em>x</em>")`.

**Cost.** No escape hatch: what Cutdown cannot express needs a NamedBlock that the consumer interprets. Every consumer writes or adopts a renderer, and two renderers may differ in look while agreeing in structure.

**Prior art.** CommonMark defines seven kinds of HTML block and inline raw HTML (CommonMark §4.6, §6.6[^COMMONMARK]); it specifies HTML output while noting that "it would have made sense to use an abstract representation of the syntax tree instead" (CommonMark §1.3[^COMMONMARK]). GFM filters nine tags when rendering (GFM §6.11[^GFM]). MultiMarkdown passes HTML through and adds raw-output spans for any target (MultiMarkdown Raw Source[^MULTIMARKDOWN]). Markua removes raw HTML entirely (Markua §1.4[^MARKUA]); AsciiDoc and MyST define their output as a tree, as Cutdown does.

### C.8 `=` for headings

A heading line starts with one to nine `=` (§4.2) and opens a `Section` that runs to the next heading of the same or a higher level (§16.1).

`=` is one keypress on effectively every keyboard layout and rarely starts a line of prose. `#` does — issue numbers, hashtags, shell prompts — and Cutdown spends it on comments (C.9). A heading that opens a section makes the outline a fact of the tree, not something each consumer rebuilds.

**Example.** `== Setup` → `Section(level: 2, heading: [Text("Setup")])`.

**Cost.** Every Markdown heading must be rewritten. Nine levels exceed HTML's six, so a renderer maps levels 7–9.

**Prior art.** CommonMark has `#` headings and setext underlines, where a line of `=` or `-` turns the line above into a heading (CommonMark §4.2, §4.3[^COMMONMARK]); GFM and MultiMarkdown follow it, MultiMarkdown adding a label for cross-references (MultiMarkdown Cross-References[^MULTIMARKDOWN]). AsciiDoc counts `=` signs for the section level, and its sections are containers; Typst and Creole also use `=`.

### C.9 Comments

`## text` is a line comment, at line start or mid-line, and `###` fences a block comment (§7). Both are kept in the AST and hidden by default.

Draft notes, TODOs, and editorial reminders belong to the source and nowhere else. Keeping them in the tree lets formatters, editors, and review tools round-trip them and attach them to the block they annotate. Yet they stay out of the content: a comment is never a child node but sits in the `reflections` of its block or Page, so a consumer that walks `children` never meets one, and one that wants them reads them there. The shape is the one programmers already know from `#` and `//`.

**Example.** `foo bar ## trailing comment` → `Paragraph([Text("foo bar")])`, with `trailing comment` in the paragraph's `reflections`.

**Cost.** `## Heading` written from Markdown habit becomes a hidden comment. A literal `##` in prose needs `\##`.

**Prior art.** CommonMark, GFM, and MultiMarkdown have no comment syntax; the common practice is an HTML comment, which is raw HTML (CommonMark §4.6[^COMMONMARK]). MultiMarkdown adds CriticMarkup annotations for editorial review (MultiMarkdown CriticMarkup[^MULTIMARKDOWN]). txt2tags, AsciiDoc, and Typst all pair a line comment with a block comment; reStructuredText keeps comments as elements of its document tree.

### C.10 Attributes are hints

`{#id .class key=value}` follows the segment it describes (§6). Keys and values are data that the consumer interprets.

Attributes are semantic hints, not one-to-one mappings to HTML attributes. A bare `{banner}` does not mean `<div banner>`; it means "this element has the semantic role 'banner'." The consuming application decides how to expand, map, or ignore each token, and Cutdown assumes no rendering target. An id, a class, or a piece of data on a block is a common need; expressing it through HTML would tie the document to one output, while a hint serves a web page, a slide, and a print layout alike. A consumer that does map attributes onto HTML or another active medium uses an allowlist of keys (§20.4 clause 8, §21.2).

**Example.** `== Intro {#intro .lead}` → `Section` with `attributes: [{key: "id", value: "intro"}, {key: "class", value: ["lead"]}]`.

**Cost.** `{` in prose starts an attribute scan, and a group that does not parse becomes literal text with everything inside it (§6.1.3). The trailing-group scope chain is the most involved rule a writer learns.

**Prior art.** CommonMark and GFM have no attributes; heading anchors come from each host's slug rules. MultiMarkdown allows HTML attributes on link and image definitions, such as `width=40px` (MultiMarkdown Link and Image Attributes[^MULTIMARKDOWN]). Pandoc, Djot, PHP Markdown Extra, and kramdown use the same `{#id .class key=val}` shape; AsciiDoc's roles are semantic names that a converter maps, as Cutdown's hints are.

### C.11 One link declaration

Every link is `[text](target)`, and the first character of the target chooses the kind (§5.5): a `scheme:` for an external link, `#` for an id, `^` for a reference, `~` for a tag, `@` for a citation, an empty target for a wiki link, anything else for a page.

One form means one thing to learn and one thing to parse. The kind is visible in the link itself, so neither the reader nor the parser looks elsewhere in the document to know what `[text](…)` is, and the AST records the kind for the consumer. Wiki links, tags, and citations need no extension with its own bracket shape.

**Example.** `[Setup](#setup)` → `Link(kind: "id")`. `[Getting started]()` → `Link(kind: "page", path: "/Getting started.cutdown")`. `[Rust](~lang/rust)` → `Link(kind: "tag")`.

**Cost.** No reference-style links: a long or repeated URL is written in place, and Markdown's `[text][label]` becomes text with CDN-0036. A page path that starts with a sigil, or looks like a scheme, needs a backslash.

**Prior art.** CommonMark has inline links, three forms of reference link, and autolinks (CommonMark §6.3, §6.5[^COMMONMARK]); GFM adds autolinks without delimiters (GFM §6.9[^GFM]). MultiMarkdown gives each kind of reference its own bracket form — cross-references, footnotes, citations, glossary entries, abbreviations (MultiMarkdown Cross-References, Citations, Glossaries[^MULTIMARKDOWN]). Org mode is the closest precedent: one `[[…]]` form in which the shape of the target selects the link type (Org Syntax, Regular links[^ORG]). MediaWiki and DokuWiki route internal and external links through one bracket form.

### C.12 Pages

A `---` line closes the current Page, and a second Meta block opens a new one (§16.2). The tree is `Document → Page[] → Section → …`.

Slide decks, paginated articles, and per-page metadata are structures that other formats reconstruct with conventions outside the syntax. As parser output they are portable. A document that does not need pages is one Page, and the model costs nothing.

**Example.** `Before⏎⏎---⏎⏎After` → two Pages, holding `Before` and `After`.

**Cost.** There is no horizontal rule: a `---` used as a divider becomes a page boundary. YAML front matter between `---` lines does not carry over; Meta uses `~~~` (§4.3).

**Prior art.** CommonMark, GFM, and MultiMarkdown have no pages; `---` is a thematic break, or a setext underline under a paragraph line (CommonMark §4.1, §4.3[^COMMONMARK]). Fountain marks page breaks with `===`; MyST, Markua, and Quarkdown each have a page or block break.

### C.13 The `[+]` task marker

A checked task is written `[+]` in canonical form; `[x]` and `[X]` remain valid input (§4.7.2, §18.1 row 3).

The letter `x` is a strong left-to-right character, so `[x]` opens a directional run inside the brackets and renders incorrectly in right-to-left source — Hebrew, Arabic, Persian. `[+]` inherits the surrounding direction and is intact in any script. `[x]` and `[X]` stay valid input because they are what a Markdown document pasted into Cutdown carries.

**Example.** `‏- [+] משימה` → `TaskItem(checked: true)`.

**Cost.** `[+]` is unfamiliar, and tools that read GFM do not treat it as checked. A writer that canonicalizes a GFM-derived file rewrites every `[x]`.

**Prior art.** GFM defines `[x]` and `[X]` (GFM §5.3[^GFM]); CommonMark and MultiMarkdown have no task items. Org mode has `[X]` and a partial `[-]`; Obsidian accepts any character between the brackets.

### C.14 Files, embeds, and injection are lines

A line starting with `/` is a FileBlock, and consecutive ones form a FileGroup (§4.11, §4.12); a line starting with `https://` is an EmbedBlock (§4.16); a file line with the Cutdown extension or a trailing `/` is an InjectBlock, which the consumer fills (§4.17, §9). The parser does no I/O (§20.2 clause 3).

An attachment list, an embedded video, and an included chapter are structure, so they have a structural form instead of a host convention. Leaving resolution to the consumer keeps parsing a pure function of the text: the same text gives the same tree on every machine, and parsing untrusted input never reads a file.

**Example.** `/photos/a.png` → `FileGroup([FileBlock])`. `/chapters/intro.cutdown` → `InjectBlock(children: [])`.

**Cost.** Every consumer that wants injection implements it, including roots, cycles, and bounds (§21.11). A prose line that starts with `/` or `https://` needs a backslash.

**Prior art.** CommonMark and GFM have inline images only (CommonMark §6.4[^COMMONMARK]). MultiMarkdown makes an image alone in a paragraph a figure (MultiMarkdown Images[^MULTIMARKDOWN]) and inserts `{{file}}` transclusions before parsing (MultiMarkdown File Transclusion[^MULTIMARKDOWN]), so its processor reads files. AsciiDoc's include directive and reStructuredText's `include` also read files during processing; Obsidian resolves `![[note]]` embeds in the application, as Cutdown's consumer does. Gemtext gives each link a line of its own.

### C.15 Diagnostics, streaming, and canonical form

Three contracts that Markdown leaves to tools are part of the language: a fixed list of diagnostic codes (§17), the guarantee that every prefix of the input is an ordinary document (§19), and one canonical spelling for each meaning (§18).

Without a shared code list, each linter invents its own and disagrees with the parser. Text now arrives in pieces — typed, synced, or generated token by token — and a renderer should show each piece without repair heuristics or flicker; that requires a grammar in which no later line reinterprets an earlier one. A canonical form lets two writers produce byte-identical source from one tree, so formatters stop churning diffs.

**Example.** `**bold` while streaming → `Text("**bold")`, and the same input as a finished document → the same tree.

**Cost.** More conformance surface: every parser emits exactly the listed diagnostics, a code is never repurposed, and constructs that look backwards — setext headings, reference definitions — are not in the language.

**Prior art.** CommonMark, GFM, and MultiMarkdown define no diagnostics, no streaming contract, and no canonical spelling; CommonMark resolves reference links only after all blocks are parsed (CommonMark §3.1[^COMMONMARK]). Djot guarantees that "the contribution a line makes to block-level structure never depends on a future line"[^DJOT]. Comark auto-closes `**bold` while streaming, which Cutdown deliberately does not. MDC defines a canonical form compared byte for byte[^MDC].

### C.16 No syntax extensions

The syntax is closed. Cutdown has no extension mechanism: a parser accepts no plugin, flag, or option that adds or changes syntax, and every conforming parser reads a document the same way. New syntax arrives only in a new version of this specification. What an application needs beyond the built-in segments it expresses with the open constructs: attributes refine a common segment (§6), a NamedBlock declares a custom block (§4.13), and a Mark declares a custom inline (§5.10).

The set of *names* grows with each application; the set of *rules* does not. A document written for one tool parses to the same tree in every other, and a consumer that does not know a name still has the content, parsed, to show. Extensions that each tool turns on separately make a document's meaning depend on the tool that reads it, which is the divergence a specification exists to remove.

**Example.** `:::callout {.warning}⏎Mind the gap.⏎:::` → `NamedBlock(name: "callout")`. `Press ::kbd Ctrl:: to copy` → `Mark(name: "kbd")` inside the paragraph.

**Cost.** A feature that the open constructs cannot express waits for a version of the specification. Because a group that does not parse is literal text (§6.1.3), even an extension of the attribute grammar is a breaking change.

**Prior art.** CommonMark specifies a core and leaves everything beyond it to extensions; GFM defines itself that way: "All the features which are supported in GitHub user content and that are not specified on the original CommonMark Spec are hence known as extensions" (GFM §1.2[^GFM]). Pandoc turns extensions on and off per input format (`commonmark+footnotes`, `markdown-smart`)[^PANDOC], and MultiMarkdown registers processing options alongside its media type (RFC 7764 §3.1[^RFC7764]). Djot takes Cutdown's route: generic divs and spans with attributes stand in for new syntax[^DJOT]. reStructuredText's directives and roles are an earlier form of the same idea — a fixed shape whose names grow[^RST].

### C.17 Media type and extension

Cutdown has its own media type, `text/x-cutdown`, and its own extension, `.cutdown` (§1.7).

Cutdown is not a Markdown dialect: a Cutdown file read as Markdown turns comments into headings and page breaks into rules. A label of its own tells a receiver what it holds. The extension is matched without regard to ASCII case, as file types usually are.

**Example.** `Content-Type: text/x-cutdown; charset=utf-8`.

**Cost.** An unregistered type is unknown to editors, MIME sniffing, and file associations, which give `.md` a preview for free.

**Prior art.** CommonMark, GFM, and MultiMarkdown share `text/markdown`, told apart by a `variant` parameter (RFC 7763 §2[^RFC7763], RFC 7764 §3[^RFC7764]) that a recipient "is under no obligation" to honour. RFC 7763 itself allows a variant to be registered under another media type. Org (`text/org`) and Typst (`text/vnd.typst`) have media types of their own.

[^COMMONMARK]: "CommonMark Spec", version 0.31.2. <https://spec.commonmark.org/0.31.2/>
[^GFM]: GitHub, "GitHub Flavored Markdown Spec", version 0.29-gfm. <https://github.github.com/gfm/>
[^MULTIMARKDOWN]: Penney, F., "MultiMarkdown User's Guide", version 6.6.0. <https://fletcher.github.io/MultiMarkdown-6/>
[^RFC7763]: Leonard, S., "The text/markdown Media Type", RFC 7763. <https://www.rfc-editor.org/rfc/rfc7763>
[^RFC7764]: Leonard, S., "Guidance on Markdown: Design Philosophies, Stability Strategies, and Select Registrations", RFC 7764. <https://www.rfc-editor.org/rfc/rfc7764>
[^FOUNTAIN]: "Fountain Syntax", version 1.1. <https://fountain.io/syntax>
[^TYPST]: "Typst Syntax Reference", version 0.15.1. <https://typst.app/docs/reference/syntax/>
[^CREOLE]: "Creole 1.0". <http://www.wikicreole.org/wiki/Creole1.0>
[^RST]: Docutils, "reStructuredText Markup Specification". <https://docutils.sourceforge.io/docs/ref/rst/restructuredtext.html>
[^DJOT]: "Djot" syntax reference. <https://djot.net/>
[^CARVE]: "Carve", technical rationale. <https://markup-carve.github.io/carve/>
[^PANDOC]: "Pandoc User's Guide", version 3.13. <https://pandoc.org/MANUAL.html>
[^BASH]: GNU, "Bash Reference Manual", §3.1.2.1 Escape Character. <https://www.gnu.org/software/bash/manual/bash.html#Escape-Character>
[^C17]: ISO/IEC 9899:2018, "Programming languages — C", §5.1.1.2 Translation phases.
[^GEMTEXT]: "Gemtext specification", version 0.24.1. <https://geminiprotocol.net/docs/gemtext-specification.gmi>
[^MARKUA]: "Markua Spec", version 0.31.50. <https://markua.com/>
[^ORG]: "Org Syntax". <https://orgmode.org/worg/org-syntax.html>
[^MDC]: "MDC Specification", version 0.1. <https://mdcspec.dev/spec/v0.1>
