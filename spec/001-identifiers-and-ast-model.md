## 1. Identifiers and AST Model

This section defines the identifier character sets and the shape of the AST. The words and notation it uses are defined in §0.

### 1.1 Identifier Character Set

`ID_CHAR` is one character of an identifier, and `ID_NAME` is an identifier:

```ebnf
ID_CHAR ::= [a-zA-Z0-9._-]
ID_NAME ::= ID_CHAR+
```

`ID_NAME` is used for all identifier-like tokens: block names, mark names, code language words, reference definition ids, and variable keys. It is ASCII-only. Matching against it is case-sensitive everywhere in this specification.

`TAG_LEVEL` is one level of a tag link target (§5.5):

```ebnf
TAG_CHAR  ::= CHAR - ("/" | CONTROL | BIDI_CONTROL)
TAG_LEVEL ::= TAG_CHAR+
```

A tag target is `~` (tilde) followed by one or more `TAG_LEVEL`s separated by `/` (slash). Unlike `ID_NAME`, a level admits spaces and non-ASCII letters. It is scanned as a path is (§9.2.1): parentheses inside it are balanced, and a backslash escapes the next character. A level may not be `.` or `..`, and a tag is never normalized as a path is.

`ID_VALUE` is the value of an `id` attribute (§6.1.1) and the target of an id link (§5.5). One rule serves both, so every id an author can write, a link can reach:

```ebnf
ID_VALUE ::= (CHAR - (UNICODE_WHITESPACE | "#" | ")" | "}" | CONTROL | BIDI_CONTROL))+
```

Unlike `ID_NAME`, it admits non-ASCII letters: `install-linux` and `道具一式` are both ids. The parser converts every id value to Unicode Normalization Form C (NFC), wherever it is written, so the same letters always give the same id; no other change is made, and matching is case-sensitive.

Paths are not identifiers. They are parsed as a `PathResourceLocator` (§9.2).

### 1.2 Segment

A **segment** is any node in the Cutdown AST — Block or Inline. This term is used throughout the spec when no distinction between block and inline is needed.

Every segment names its kind in the `_type` property. Property names that begin with `_` (underscore) are reserved for structural properties defined by this specification; content properties (`src`, `name`, `children`, `attributes`, …) never begin with `_`. The prefix keeps the discriminator from colliding with a property of the same name in consumer data.

### 1.3 Block Type

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
    | FileGroup
    | EmbedBlock
    | InjectBlock
    | NamedBlock
    | SpoilerBlock
    | RefDefinition
```

Container blocks carry a `children` array — `Block[]` for block containers (`Section`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`, `InjectBlock`), `Inline[]` for blocks whose content is inline (`Paragraph`, `RefDefinition`), and `FileBlock[]` for `FileGroup`. A `FileBlock` is not a member of `Block`: it only ever appears inside a `FileGroup`. Leaf blocks carry no children. Most blocks carry `attributes: Attribute[]`.

### 1.4 Inline Type

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
    | EmbedImageInline
    | Mark
    | LineBreak
    | Variable
```

Container inlines carry `children: Inline[]`. Leaf inlines carry no children. Most inline nodes carry `attributes: Attribute[]`.

Wherever an AST node carries `Inline[]`, the content was produced by the inline parsing rules (§5). All inline contexts are explicitly marked "parsed by inline rules."

### 1.5 Block Scope

A **block scope** is one flat sequence of sibling blocks. A document has one block scope at its root, and one inside the child list of every block container (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`).

A rule described as resolved *within the current block scope* looks only at that sequence and never past its container boundary. This applies to comment attachment (§2.2), caption binding (§6.2), and the sectionization fold (§9.3.1).

`InjectBlock.children` is a block scope as well, though the parser always emits it empty: a consumer fills it (§17).

---
