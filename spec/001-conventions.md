## 1. Conventions

The keywords **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **MAY** are used as defined in [RFC 2119].

**Examples** are shown as:

```
Input:
  <cutdown source>

AST:
  <segment representation>
```

**The arrow symbol (`→`)** separates a construct or condition from what it produces. In examples, the left side is Cutdown source and the right side is the AST notation defined in §14.

**Naming characters.** A character used as a **noun** is named on first use in a numbered section, symbol first and name in parentheses — "a single `#` (octothorpe)", "the `^` (caret)" — and thereafter by symbol alone. One naming per section per character; do not repeat it. Multi-character markers (`##`, `~~~`, `:::`) are constructs, not characters, and are named by construct name. §13 is the register of names. This convention applies to the numbered sections only; `SYNTAX.md` and `README.md` are exempt.

### 1.1 Streaming terms

A **Unicode scalar value** is a Unicode code point other than a surrogate code point. It is the character unit used by the streaming conformance profile (§16). This does not change source locations: `loc` offsets remain UTF-16 code-unit offsets.

An **input snapshot** is the complete decoded Cutdown source available to a parser at one instant. A parser MUST treat every input snapshot as an ordinary Cutdown document, including a snapshot that ends within unfinished markup.

An **end of block** is a boundary inferred by the ordinary Cutdown grammar: a completed block boundary, a closing fence, or end of input. It is not a token or event in Cutdown source.

### 1.2 Identifier Character Set

Throughout this spec, `ID_LITERAL` refers to the following ASCII character class:

```
ID_LITERAL = [a-zA-Z0-9._-]
```

This charset is used for all identifier-like tokens: block names, mark names, code language tags, reference definition IDs, and variable keys. It is ASCII-only. Matching against `ID_LITERAL` is case-sensitive everywhere in this specification.

`PATH_LITERAL` extends `ID_LITERAL` with the forward-slash character:

```
PATH_LITERAL = [a-zA-Z0-9._/-]
```

`PATH_LITERAL` is used for path-like values: page link targets, tag link targets, and file reference paths.

### 1.3 Segment

A **segment** is any node in the Cutdown AST — Block or Inline. This term is used throughout the spec when no distinction between block and inline is needed.

### 1.4 Block Type

A **Block** segment is any node that occupies a full line-level slot in the document.

```
Block =
    | Paragraph
    | Section
    | CodeBlock
    | MathBlock
    | QuoteBlock
    | List
    | Table
    | ImageBlock
    | FileRef
    | FileRefGroup
    | NamedBlock
    | SpoilerBlock
    | CommentBlock
    | RefDefinition
```

Container blocks carry a `children` array — `Block[]` for block containers (`Section`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`), `Inline[]` for blocks whose content is inline (`Paragraph`, `RefDefinition`). Leaf blocks carry no children. Most blocks carry `attributes: Attribute[]`.

### 1.5 Inline Type

An **Inline** segment is any node parsed within inline content.

```
Inline =
    | Text
    | Emphasis
    | Strong
    | Highlight
    | Spoiler
    | Link
    | CodeInline
    | MathInline
    | QuoteInline
    | ImageInline
    | Mark
    | TextBreak
    | Variable
```

Container inlines carry `children: Inline[]`. Leaf inlines carry no children. Most inline nodes carry `attributes: Attribute[]`.

Wherever an AST node carries `Inline[]`, the content was produced by the inline parsing rules (§5). All inline contexts are explicitly marked "parsed by inline rules."

### 1.6 Block Scope

A **block scope** is one flat sequence of sibling blocks. A document has one block scope at its root, and one inside the child list of every block container (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`).

A rule described as resolved *within the current block scope* looks only at that sequence and never past its container boundary. This applies to reflection attachment (§2.2), caption binding (§6.2), and the sectionization fold (§9.5.1).

---
