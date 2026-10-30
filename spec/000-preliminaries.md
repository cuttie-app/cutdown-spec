## 0. Preliminaries

This section defines the words and notation the rest of the specification uses. It states no parsing rule of its own: each term points to the section that holds the rule.

### 0.1 Requirement keywords

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this specification are to be interpreted as described in BCP 14 ([RFC2119], [RFC8174]) when, and only when, they appear in all capitals, as shown here. Each one binds a conformance class (§18): a parser, a writer, or a consumer.

Every sequence of characters (§0.3) is a Cutdown document (§18.2). The rules of this specification say what each input means; none of them makes an input invalid.

### 0.2 Notation

**Grammar.** Grammar productions use the EBNF notation of [XML] §6: `Name ::= expression`, with `#xN` for a code point, `[a-z]` and `[^…]` for character classes, `A - B` for "A but not B", `"…"` for a literal that matches case-sensitively, and `?`, `*`, `+`, `( )` as usual. Productions stand in ```` ```ebnf ```` blocks next to the rule they formalise; each name is defined in exactly one block. The blocks, collected in the order they appear, are published for each version at `https://cutdownspec.org/<version>/cutdown.ebnf`. A grammar covers the lexical layer only — characters, identifiers, markers. Rules that depend on context, such as matching a fence closer to its opener, nesting, and inline precedence, are stated in prose.

**Examples** are shown as:

```
Input:
  <cutdown source>

AST:
  <segment representation>
```

**The arrow symbol (`→`)** separates a construct or condition from what it produces. In examples, the left side is Cutdown source and the right side is the AST notation defined in §14.

**Naming characters.** A character used as a **noun** is named on first use in a numbered section, symbol first and name in parentheses — "a single `#` (octothorpe)", "the `^` (caret)" — and thereafter by symbol alone. One naming per section per character; do not repeat it. Multi-character markers (`##`, `~~~`, `:::`) are constructs, not characters, and are named by construct name. §13 is the register of names. This convention applies to the numbered sections only; `SYNTAX.md` and `README.md` are exempt.

### 0.3 Characters and units

A **character** is a Unicode scalar value [UNICODE]: a code point other than a surrogate code point. Cutdown source is a sequence of characters, decoded from UTF-8 [RFC3629] before parsing (§7).

```ebnf
Char    ::= [#x0-#xD7FF] | [#xE000-#x10FFFF]
Control ::= [#x0-#x1F] | #x7F | [#x80-#x9F]
```

A **control character** is a `Control`.

**Units.** Every length and limit in this specification is counted in characters. Source locations are the one exception: `loc` offsets count UTF-16 code units (§14). A **column** is the number of characters from the start of a line, a tab counting as one.

**Comparison.** Two strings are **equal**, or match **case-sensitively**, when they are the same sequence of characters. Unicode Normalization Form C (NFC, [UNICODE] UAX #15) is applied only where a rule says so: ids (§1.1), page-link fragments (§5.5), and paths (§9.2.4).

### 0.4 Lines and whitespace

```ebnf
LineTerminator ::= #xD #xA | #xD | #xA
Whitespace     ::= #x20 | #x9
```

A **line terminator** is a `LineTerminator`: `\r\n`, a lone `\r`, or `\n` (§7). A **line** is the characters between two line terminators, or between a line terminator and the start or end of input. **Line content** is a line without its terminator. **End of input** acts as a virtual line terminator after the last character; no text is added (§7).

**Whitespace** is a `Whitespace` character: the space U+0020 or the tab U+0009, which reads as a space (§7). Every rule in this specification that speaks of whitespace — blank lines, leading and trailing spaces, collapsing runs, splitting class values — means this set.

**Unicode whitespace** is a character with the Unicode White_Space property [UNICODE]. A rule uses it only where it names it; today that is `ID_VALUE` (§1.1).

```ebnf
UnicodeWhitespace ::= [#x9-#xD] | #x20 | #x85 | #xA0 | #x1680 | [#x2000-#x200A]
                    | #x2028 | #x2029 | #x202F | #x205F | #x3000
```

The production lists the White_Space property as the Unicode Standard defines it; where they differ, the property wins.

Every other character is ordinary text, including the space-like ones: U+00A0 (no-break space), U+3000 (ideographic space), U+2028 (line separator), U+2029 (paragraph separator), U+0085 (next line), U+000B (line tabulation), and U+000C (form feed). None of them ends a line, makes a line blank, or collapses.

A **blank line** is a line whose content is only whitespace, or empty.

### 0.5 Structural terms

- **Container prefix** — the leading `>` markers, or the indentation, that a container removes from a line before the line is classified (§10.2).
- **Block candidate** — a run of non-blank lines between blank lines, or the edges of the document, classified by its first line (§9.1).
- **Inline context** — one run of text parsed by the inline rules and bounded by its owner: the text of a paragraph, heading, list item, or task item; a table cell; a caption; link text; image `alt`; Mark content. No inline construct crosses its edge.
- **Soft break** — the line terminator between two lines of one inline context. It adds no character to the AST, but no token crosses it (§12.1).
- **Base column** — the column against which the leading whitespace of a continuation line is measured (§12.1).
- **Opaque content** — text captured verbatim, with no block or inline parsing and no escapes beyond the narrow ones its construct defines (§8.3, §6.1.1): the bodies of `CodeBlock`, `MathBlock`, `Meta`, and `CommentBlock`; `CodeInline` and `MathInline` content; quoted attribute values.
- **Input snapshot** — the complete decoded Cutdown source available to a parser at one instant. A parser MUST treat every input snapshot as an ordinary Cutdown document, including a snapshot that ends within unfinished markup (§15).
- **End of block** — a boundary inferred by the ordinary Cutdown grammar: a completed block boundary, a closing fence, or end of input. It is not a token or event in Cutdown source.

### 0.6 References

#### 0.6.1 Normative references

- **[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119. <https://www.rfc-editor.org/rfc/rfc2119>
- **[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174. <https://www.rfc-editor.org/rfc/rfc8174>
- **[UNICODE]** The Unicode Consortium, "The Unicode Standard", latest version, including UAX #15 "Unicode Normalization Forms". <https://www.unicode.org/versions/latest/> Cutdown uses only the White_Space property and NFC, which the Unicode stability policies keep stable across versions.
- **[RFC3629]** Yergeau, F., "UTF-8, a transformation format of ISO 10646", RFC 3629. <https://www.rfc-editor.org/rfc/rfc3629>
- **[RFC8259]** Bray, T., "The JavaScript Object Notation (JSON) Data Interchange Format", RFC 8259. <https://www.rfc-editor.org/rfc/rfc8259>
- **[XML]** W3C, "Extensible Markup Language (XML) 1.0 (Fifth Edition)", §6 "Notation". <https://www.w3.org/TR/xml/#sec-notation>

#### 0.6.2 Informative references

- **[COMMONMARK]** "CommonMark Spec". <https://spec.commonmark.org/>
- **[DJOT]** "Djot". <https://djot.net/>
- **[CARVE]** "Carve". <https://markup-carve.github.io/carve/>
- **[YAML]** "YAML Ain't Markup Language, version 1.2". <https://yaml.org/spec/1.2.2/>
- **[TOML]** "TOML v1.0.0". <https://toml.io/en/v1.0.0>
- **[LSP]** Microsoft, "Language Server Protocol Specification". <https://microsoft.github.io/language-server-protocol/>
- **[KATEX]** "KaTeX". <https://katex.org/>
- **[OEMBED]** "oEmbed". <https://oembed.com/>

---
