## 1. Conventions

The keywords **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **MAY** are used as defined in [RFC 2119].

**Examples** are shown as:

```
Input:
  <cutdown source>

AST:
  <segment representation>
```

A `→` symbol means "produces AST node."

### Identifier Character Set

Throughout this spec, `ID_LITERAL` refers to the following ASCII character class:

```
ID_LITERAL = [a-zA-Z0-9._-]
```

This charset is used for all identifier-like tokens: block names, span names, code language tags, reference definition IDs, and variable keys. It is ASCII-only and case-sensitive. Matching against `ID_LITERAL` is always case-sensitive unless explicitly stated otherwise.

`PATH_LITERAL` extends `ID_LITERAL` with the forward-slash character:

```
PATH_LITERAL = [a-zA-Z0-9._/-]
```

`PATH_LITERAL` is used for path-like values: page link targets, tag link targets, and file reference paths.

### Segment

A **segment** is any node in the Cutdown AST — Block or Inline. This term is used throughout the spec when no distinction between block and inline is needed.

### Block Type

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
    | ThematicBreak
    | FileRef
    | FileRefGroup
    | NamedBlock
    | RefDefinition
```

Container blocks carry `children: (Block | Inline)[]`. Leaf blocks carry no children. Most blocks carry `attributes: Attribute[]`.

### Inline Type

An **Inline** segment is any node parsed within inline content.

```
Inline =
    | Text
    | Emphasis
    | Strong
    | Strikethrough
    | Link
    | CodeInline
    | MathInline
    | QuoteInline
    | ImageInline
    | Span
    | TextBreak
```

Container inlines carry `children: Inline[]`. Leaf inlines carry no children. Most inline nodes carry `attributes: Attribute[]`.

Wherever an AST node carries `Inline[]`, the content was produced by the inline parsing rules (§5). All inline contexts are explicitly marked "parsed by inline rules."

---
