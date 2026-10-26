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

A **Unicode scalar value** is a Unicode code point other than a surrogate code point. It is the character unit used by the streaming conformance profile (§15). This does not change source locations: `loc` offsets remain UTF-16 code-unit offsets.

An **input snapshot** is the complete decoded Cutdown source available to a parser at one instant. A parser MUST treat every input snapshot as an ordinary Cutdown document, including a snapshot that ends within unfinished markup.

An **end of block** is a boundary inferred by the ordinary Cutdown grammar: a completed block boundary, a closing fence, or end of input. It is not a token or event in Cutdown source.

### 1.2 Identifier Character Set

Throughout this spec, `ID_LITERAL` refers to the following ASCII character class:

```
ID_LITERAL = [a-zA-Z0-9._-]
```

This charset is used for all identifier-like tokens: block names, mark names, code language tags, reference definition IDs, and variable keys. It is ASCII-only. Matching against `ID_LITERAL` is case-sensitive everywhere in this specification.

`TAG_LITERAL` is the character class of one tag level in a tag link target (§5.5):

```
TAG_LITERAL = any Unicode scalar value except # (octothorpe), / (slash), ] (right bracket), and the line terminator
```

A tag target is `#` followed by one or more `TAG_LITERAL` runs separated by `/`. Unlike `ID_LITERAL`, it admits spaces and non-ASCII letters.

Paths are not identifiers. They are parsed as a `PathResourceLocator` (§1.7).

### 1.3 Segment

A **segment** is any node in the Cutdown AST — Block or Inline. This term is used throughout the spec when no distinction between block and inline is needed.

Every segment names its kind in the `_type` property. Property names that begin with `_` (low line) are reserved for structural properties defined by this specification; content properties (`src`, `name`, `children`, `attributes`, …) never begin with `_`. The prefix keeps the discriminator from colliding with a property of the same name in consumer data.

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
    | FileGroup
    | EmbedBlock
    | InjectBlock
    | NamedBlock
    | SpoilerBlock
    | CommentBlock
    | RefDefinition
```

Container blocks carry a `children` array — `Block[]` for block containers (`Section`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`, `InjectBlock`), `Inline[]` for blocks whose content is inline (`Paragraph`, `RefDefinition`), and `FileBlock[]` for `FileGroup`. A `FileBlock` is not a member of `Block`: it only ever appears inside a `FileGroup`. Leaf blocks carry no children. Most blocks carry `attributes: Attribute[]`.

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
    | LineBreak
    | Variable
```

Container inlines carry `children: Inline[]`. Leaf inlines carry no children. Most inline nodes carry `attributes: Attribute[]`.

Wherever an AST node carries `Inline[]`, the content was produced by the inline parsing rules (§5). All inline contexts are explicitly marked "parsed by inline rules."

### 1.6 Block Scope

A **block scope** is one flat sequence of sibling blocks. A document has one block scope at its root, and one inside the child list of every block container (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`).

A rule described as resolved *within the current block scope* looks only at that sequence and never past its container boundary. This applies to reflection attachment (§2.2), caption binding (§6.2), and the sectionization fold (§9.5.1).

`InjectBlock.children` is a block scope as well, though the parser always emits it empty: a consumer fills it (§17).

### 1.7 PathResourceLocator

A **PathResourceLocator** is the parsed form of a path written in source. Four properties carry one: `FileBlock.src` (§4.11), `InjectBlock.src` (§4.17), `ImageInline.src` (§5.9), and `Link.path` (§5.5). This section is the only definition of how a path is parsed; those sections state only where their path ends.

```typescript
interface PathResourceLocator {
  raw: string                // the path as written, escapes resolved (§1.7.2)
  path: string               // raw up to the first unescaped ? or #
  query: QueryParam[]        // pairs after ?, up to the first unescaped #
  fragment: string           // everything after the first unescaped #
}

interface QueryParam {
  key: string
  value: string
}
```

Cutdown reads three characters as structure inside a path: `/` (slash) separates folders, `?` (question mark) opens the query, and `#` (octothorpe) opens the fragment. Within the query, `&` (ampersand) separates pairs and the first `=` (equals sign) of a pair separates key from value.

#### 1.7.1 Extent

The construct that owns the path decides where it ends:

| Owner | The path runs from | to |
|---|---|---|
| `FileBlock`, `InjectBlock` (a line beginning `/`) | the leading `/` | the end of the line, after removing one trailing attribute sequence — whitespace followed by one or more `{…}` groups that close the line — and then trailing whitespace |
| `ImageInline` `(…)` | the character after `(` | the first unbalanced `)` |
| `Link` page target `[…]` | the character after `[` | the first unbalanced `]` |

Brackets nest inside every path. A `(` or `[` opens a pair, and the closer that matches it is path content, not the end of the path: `![](/shots/run (2).png)` has the path `/shots/run (2).png`. Parentheses and square brackets are counted separately. Escaped brackets are not counted.

A `{…}` group belongs to the attribute sequence only when the sequence is preceded by whitespace and closes the line. `/a {draft}.png` and `/a/{draft}` are paths without attributes.

#### 1.7.2 Characters and escapes

A path may contain any Unicode scalar value, the space included. A backslash escapes the next character:

| Written | `raw` holds | Effect |
|---|---|---|
| `\\` | `\` | a literal backslash |
| `\(` `\)` `\[` `\]` | the bracket | not counted for nesting, never ends the path |
| `\?` `\#` `\&` `\=` | the character | no query, fragment, or pair boundary |
| `\{{` | `\{{`, unchanged | an escaped interpolation token, resolved by the consumer (§5.11) |
| `\` before any other character | both characters | none |

#### 1.7.3 Decomposition

1. `raw` is the extent with escapes resolved. In a `FileBlock` or `InjectBlock` line, leading and trailing whitespace is removed first.
2. `path` is `raw` up to the first unescaped `?` or `#`, or all of `raw` if neither occurs.
3. If an unescaped `?` comes first, the query text runs from after it to the first unescaped `#` or the end. It is split on `&`; each part is split at its first `=` into `key` and `value`. A part with no `=` has `value: ''`. Empty parts (`a&&b`) produce no pair. Pairs keep source order, and repeated keys are all kept. Nothing is percent-decoded: `%20` stays `%20`. At most 32 pairs are kept; any further pairs are dropped without a diagnostic.
4. `fragment` is everything after the first unescaped `#`. A `?` after the `#` is fragment content.

Absent parts are empty: `query: []`, `fragment: ''`.

```
/My Docs/Q3 report.pdf         → { raw: "/My Docs/Q3 report.pdf", path: "/My Docs/Q3 report.pdf", query: [], fragment: "" }
/data.csv?sheet=2&range=A1:D9  → { path: "/data.csv", query: [{key:"sheet",value:"2"}, {key:"range",value:"A1:D9"}], fragment: "" }
/video.mp4#t=30,45             → { path: "/video.mp4", query: [], fragment: "t=30,45" }
/card.cutdown?name=Ann&flag    → { path: "/card.cutdown", query: [{key:"name",value:"Ann"}, {key:"flag",value:""}], fragment: "" }
```

#### 1.7.4 Base

A path whose `raw` begins with `/` is **root-relative**: the root is supplied by the consumer. Any other path is relative to the document that contains it. Cutdown resolves no path; it only fixes how a path is read.

A path whose `raw` begins with `https://` is a **URL**. It is decomposed by the same steps, but the base rule above and the validity rules below do not apply to it.

#### 1.7.5 Validity

A path is **invalid** when any of these holds:

- `raw` contains a control character: U+0000–U+001F, U+007F, or U+0080–U+009F;
- `raw` is longer than 1024 Unicode scalar values;
- `path` contains an empty segment (`a//b`);
- `path` is root-relative and a `..` segment climbs above the root (`/../x`);
- `path` ends with `/`, except in an `InjectBlock`, where a trailing `/` names a folder (§4.17).

An invalid path does not change the parse. The owning node is emitted as usual, its locator keeps `raw` and has `path: ''`, `query: []`, `fragment: ''`, and warning CDN-0032 is emitted.

An empty path is valid. `[text][]` produces `{ raw: "", path: "", query: [], fragment: "" }`; what it refers to is the consumer's decision.

---
