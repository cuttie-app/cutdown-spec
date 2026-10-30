## 1. Preliminaries

This section defines the words and notation the rest of the specification uses. It states no parsing rule of its own: each term points to the section that holds the rule.

### 1.1 Requirement keywords

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this specification are to be interpreted as described in BCP 14 ([RFC2119], [RFC8174]) when, and only when, they appear in all capitals, as shown here. Each one binds a conformance class (§20): a parser, a writer, or a consumer.

Every sequence of characters (§1.3) is a Cutdown document (§20.2). The rules of this specification say what each input means; none of them makes an input invalid.

### 1.2 Notation

**Grammar.** Grammar productions use the EBNF notation of [XML] §6: `NAME ::= expression`, with `#xN` for a code point, `[a-z]` and `[^…]` for character classes, `A - B` for "A but not B", `"…"` for a literal that matches case-sensitively, and `?`, `*`, `+`, `( )` as usual. Production names are written in UPPER_SNAKE case and in code font, and each name is defined in exactly one block. Productions stand in ```` ```ebnf ```` blocks next to the rule they formalise. The blocks, collected in the order they appear, are published for each version at `https://cutdownspec.org/<version>/cutdown.ebnf`. A grammar covers the lexical layer only — characters, identifiers, markers. Rules that depend on context, such as matching a fence closer to its opener, nesting, and inline precedence, are stated in prose.

A production defines what is **recognized**, not what is valid. Input that does not match a production is still a document (§20.2): the rule that uses the production says what it becomes instead — paragraph text, a degraded opener (§12.1.4.1), or literal attribute text (§6.1.3). Prose names a production rather than listing its characters again. Grammar blocks, prose, and the conformance corpus are all normative and equal; a disagreement among them is a defect in this specification. Appendix C (Rationale) is informative: it explains the rules and adds none.

**Examples.** A full example — Cutdown source together with its AST — is not written out in the text. It stands as a pointer to the fixture of the conformance corpus that holds it:

> **Example 5-1** · [`emphasis-basic`](../tests/005-inline-segments/emphasis-basic.yaml)

Examples are numbered per chapter, in order, as *chapter*-*n*. The number is for readers; the fixture id is the stable name. The fixture's `input` is the source, and its `ast`, `pages`, and `diagnostics` are the result (`tests/README.md`), so an example and its test cannot disagree. A rendering of this specification may show the fixture in place of the pointer.

**The arrow symbol (`→`)** separates a construct or condition from what it produces. Where prose illustrates a rule in one line, the left side is Cutdown source and the right side is the AST notation defined in §A.

**Naming characters.** A character used as a **noun** is named on first use in a numbered section, symbol first and name in parentheses — "a single `#` (octothorpe)", "the `^` (caret)" — and thereafter by symbol alone. One naming per section per character; do not repeat it. Multi-character markers (`##`, `~~~`, `:::`) are constructs, not characters, and are named by construct name. §B is the register of names. This convention applies to the numbered sections only; `SYNTAX.md` and `README.md` are exempt.

### 1.3 Characters and units

A **character** is a Unicode scalar value [UNICODE]: a code point other than a surrogate code point. Cutdown source is a sequence of characters. How the characters were encoded is outside Cutdown: they are decoded before parsing, from UTF-8 or any other encoding (§1.7, §10).

```ebnf
CHAR    ::= [#x0-#xD7FF] | [#xE000-#x10FFFF]
CONTROL ::= [#x0-#x1F] | #x7F | [#x80-#x9F]
```

A **control character** is a `CONTROL`.

**Units.** Every length and limit in this specification is counted in characters. Source locations are the one exception: `loc` offsets count UTF-16 code units (§A). A **column** is the number of characters from the start of a line, a tab counting as one.

**Comparison.** Two strings are **equal**, or match **case-sensitively**, when they are the same sequence of characters. Unicode Normalization Form C (NFC, [UNICODE] UAX #15) is applied only where a rule says so: ids (§2.1), page-link fragments (§5.5), and paths (§8.4).

### 1.4 Lines and whitespace

```ebnf
LINE_TERMINATOR ::= #xD #xA | #xD | #xA
WHITESPACE      ::= #x20 | #x9
```

A **line terminator** is a `LINE_TERMINATOR`: `\r\n`, a lone `\r`, or `\n` (§10). A **line** is the characters between two line terminators, or between a line terminator and the start or end of input. **Line content** is a line without its terminator. **End of input** acts as a virtual line terminator after the last character; no text is added (§10).

**Whitespace** is a `WHITESPACE` character: the space U+0020 or the tab U+0009, which reads as a space (§10). Every rule in this specification that speaks of whitespace — blank lines, leading and trailing spaces, collapsing runs, splitting class values — means this set.

**Unicode whitespace** is a character with the Unicode White_Space property [UNICODE]. A rule uses it only where it names it; today that is `ID_VALUE` (§2.1).

```ebnf
UNICODE_WHITESPACE ::= [#x9-#xD] | #x20 | #x85 | #xA0 | #x1680 | [#x2000-#x200A]
                     | #x2028 | #x2029 | #x202F | #x205F | #x3000
```

The production lists the White_Space property as the Unicode Standard defines it; where they differ, the property wins.

A **bidi control** is a character with the Unicode `Bidi_Control` property ([UNICODE] UAX #9): the nine explicit directional formatting characters and the three implicit marks ALM, LRM, and RLM. In text it is an ordinary character. Ids (§2.1), tag levels (§2.1), and paths (§8.5) exclude it, because it changes how a name is displayed without changing what the name is.

```ebnf
BIDI_CONTROL ::= #x061C | #x200E | #x200F | [#x202A-#x202E] | [#x2066-#x2069]
```

Every other character is ordinary text, including the space-like ones: U+00A0 (no-break space), U+3000 (ideographic space), U+2028 (line separator), U+2029 (paragraph separator), U+0085 (next line), U+000B (line tabulation), and U+000C (form feed). None of them ends a line, makes a line blank, or collapses.

A **blank line** is a line whose content is only whitespace, or empty.

### 1.5 Structural terms

- **Container prefix** — the leading `>` markers, or the indentation, that a container removes from a line before the line is classified (§11.2).
- **Block candidate** — a run of non-blank lines between blank lines, or the edges of the document, classified by its first line (§12.1).
- **Inline context** — one run of text parsed by the inline rules and bounded by its owner: the text of a paragraph, heading, list item, or task item; a table cell; a caption; link text; image `alt`; Mark content. No inline construct crosses its edge.
- **Soft break** — the line terminator between two lines of one inline context. It adds no character to the AST, but no token crosses it (§15.1).
- **Base column** — the column against which the leading whitespace of a continuation line is measured (§15.1).
- **Opaque content** — text captured verbatim, with no block or inline parsing and no escapes beyond the narrow ones its construct defines (§13.3, §6.1.1): the bodies of `CodeBlock`, `MathBlock`, and `Meta`, and of a CommentBlock; `CodeInline` and `MathInline` content; quoted attribute values.
- **Input snapshot** — the complete decoded Cutdown source available to a parser at one instant. A parser MUST treat every input snapshot as an ordinary Cutdown document, including a snapshot that ends within unfinished markup (§19).
- **End of block** — a boundary inferred by the ordinary Cutdown grammar: a completed block boundary, a closing fence, or end of input. It is not a token or event in Cutdown source.

### 1.6 References

#### 1.6.1 Normative references

- **[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119. <https://www.rfc-editor.org/rfc/rfc2119>
- **[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174. <https://www.rfc-editor.org/rfc/rfc8174>
- **[UNICODE]** The Unicode Consortium, "The Unicode Standard", latest version, including UAX #15 "Unicode Normalization Forms". <https://www.unicode.org/versions/latest/> Cutdown uses only the White_Space property, NFC, and the explicit directional formatting characters of UAX #9 "Unicode Bidirectional Algorithm", which the Unicode stability policies keep stable across versions.
- **[RFC3629]** Yergeau, F., "UTF-8, a transformation format of ISO 10646", RFC 3629. <https://www.rfc-editor.org/rfc/rfc3629>
- **[RFC6838]** Freed, N., Klensin, J., and T. Hansen, "Media Type Specifications and Registration Procedures", BCP 13, RFC 6838. <https://www.rfc-editor.org/rfc/rfc6838>
- **[RFC8259]** Bray, T., "The JavaScript Object Notation (JSON) Data Interchange Format", RFC 8259. <https://www.rfc-editor.org/rfc/rfc8259>
- **[RFC7493]** Bray, T., "The I-JSON Message Format", RFC 7493. <https://www.rfc-editor.org/rfc/rfc7493>
- **[XML]** W3C, "Extensible Markup Language (XML) 1.0 (Fifth Edition)", §6 "Notation". <https://www.w3.org/TR/xml/#sec-notation>
- **[YAML]** "YAML Ain't Markup Language, version 1.2". <https://yaml.org/spec/1.2.2/>
- **[TOML]** "TOML v1.0.0". <https://toml.io/en/v1.0.0>

#### 1.6.2 Informative references

- **[UTS39]** The Unicode Consortium, "Unicode Security Mechanisms", Unicode Technical Standard #39. <https://www.unicode.org/reports/tr39/>
- **[COMMONMARK]** "CommonMark Spec". <https://spec.commonmark.org/>
- **[GFM]** GitHub, "GitHub Flavored Markdown Spec". <https://github.github.com/gfm/>
- **[MULTIMARKDOWN]** Penney, F., "MultiMarkdown User's Guide". <https://fletcher.github.io/MultiMarkdown-6/>
- **[DJOT]** "Djot". <https://djot.net/>
- **[CARVE]** "Carve". <https://markup-carve.github.io/carve/>
- **[LSP]** Microsoft, "Language Server Protocol Specification". <https://microsoft.github.io/language-server-protocol/>
- **[KATEX]** "KaTeX". <https://katex.org/>
- **[OEMBED]** "oEmbed". <https://oembed.com/>
- **[RFC6648]** Saint-Andre, P., Crocker, D., and M. Nottingham, "Deprecating the \"X-\" Prefix and Similar Constructs in Application Protocols", BCP 178, RFC 6648. <https://www.rfc-editor.org/rfc/rfc6648>
- **[RFC7763]** Leonard, S., "The text/markdown Media Type", RFC 7763. <https://www.rfc-editor.org/rfc/rfc7763>
- **[RFC7764]** Leonard, S., "Guidance on Markdown: Design Philosophies, Stability Strategies, and Select Registrations", RFC 7764. <https://www.rfc-editor.org/rfc/rfc7764>

### 1.7 Media type and file extension

**Media type.** A Cutdown document is labelled `text/x-cutdown`. A reader SHOULD also accept `text/cutdown`. Neither name is registered with IANA; the `x-` prefix marks that, against the advice of [RFC6648], until a registration in the standards tree ([RFC6838]) is possible.

**Charset.** The optional `charset` parameter names the encoding of the bytes, as for any `text/*` type. Without it the encoding is UTF-8 [RFC3629]. A writer SHOULD store and send UTF-8. A reader decodes the bytes with the named charset before parsing (§10); a reader that does not support that charset MUST NOT guess one, and what it does instead is its own choice. The charset never changes the AST: the same characters give the same tree, whatever bytes carried them.

**File extension.** A Cutdown file has the extension `.cutdown`. There is no shorter form. A writer SHOULD spell it in lowercase.

A path **has the Cutdown extension** when its last segment ends with `.cutdown`, compared ASCII case-insensitively: `intro.cutdown`, `intro.Cutdown`, and `intro.CUTDOWN` all have it. This is the one test the specification uses — for an `InjectBlock` (§4.17), for a page link (§5.5), and for the files of an injected folder (§9.5). The path itself is never case-folded: `/intro.cutdown` and `/intro.CUTDOWN` still name two resources (§8.4).

---
