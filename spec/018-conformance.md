## 18. Conformance

### 18.1 Classes

This specification binds three classes of implementation. A requirement keyword (§0.1) always binds one of them.

| Class | Does | Bound by |
|---|---|---|
| **Parser** | turns Cutdown source into an AST and diagnostics | §18.2 |
| **Writer** | turns an AST into Cutdown source | §18.3 |
| **Consumer** | reads an AST: renders, indexes, resolves, transforms | §18.4 |

One program may belong to several classes; it conforms in each class separately. Other roles named in this specification are not classes:

- A **renderer** is a consumer that presents the document to a reader.
- A **producer** supplies decoded source to a parser (§7, §15). It has no obligations here.
- An **author** writes source. Every input is a document (§18.2), so no author is non-conforming; advice to authors is informative.
- A **formatter**, **generator**, or **round-trip editor** is a writer. A tool that patches source in place and keeps untouched text byte for byte is not a writer and has no obligations here.
- An **implementation** is a program of any class.

### 18.2 Parser

A conforming parser:

1. **Totality.** MUST accept every sequence of Unicode scalar values as a Cutdown document. It MUST NOT reject input, fail, or stop early; every input yields a `Document`.
2. **Output.** MUST produce exactly the AST that §1–§14 define and exactly the diagnostics, by code and level, that the [diagnostic code registry](../policies/diagnostic-code-registry.md) defines for that input — no others. Node kinds and property names are those of §14. Source locations remain optional (§14).
3. **Determinism and purity.** MUST produce the same AST and diagnostics every time it parses the same input. It MUST NOT perform I/O: it resolves no path, link, injection, or variable, and every `InjectBlock` it emits has `children: []`.
4. **Streaming.** MUST satisfy the streaming conformance profile (§15).
5. **Corpus.** MUST pass every fixture of the conformance corpus ([`tests/`](../tests/)) for the language version it implements. The fixtures are normative examples. A disagreement among this text, its grammar blocks (§0.2), and a fixture is a defect in the specification, not a choice left to the parser.
6. **Version.** MUST state the language version it implements.
7. **Complexity.** MUST parse in time and memory linear in the length of the input, for every input.

Every limit this specification states is part of the output required by clause 2: a parser stops at the same point as every other and recovers the same way. §18.6 lists them. The language does not bound the size of a document; a host bounds its input before it calls the parser.

### 18.3 Writer

A conforming writer:

1. **Round-trip.** For every AST that a conforming parser can produce, MUST write source that a conforming parser parses back to the same AST. Source locations and diagnostics are not compared: a diagnostic records a recovery, which source cannot always carry. An AST that no parser can produce is outside this clause, and a writer MAY refuse it.
2. **Canonical form.** MUST write canonical form (§16). Two conforming writers given the same AST therefore write byte-identical source. A writer that keeps the author's spelling where §16 names a canonical one does not conform.
3. **Escaping.** MUST escape (§8) every character that would otherwise be read as syntax.

### 18.4 Consumer

Every consumer obligation is conditional: a consumer that never does a thing is not bound by the rule for it. A conforming consumer:

1. **Interpolation.** If it substitutes interpolation tokens, MUST resolve templates as §5.11.1 defines.
2. **Injection.** If it fills an `InjectBlock`, MUST build `children` as §17 defines.
3. **Streaming.** If it renders while source is still arriving, MUST NOT change the AST or diagnostics required for any input snapshot (§15.4).
4. **Unknown properties.** MUST ignore an AST property it does not recognize, and MUST NOT fail on one.
5. **Unknown node kinds.** MUST NOT fail on a node whose `_type` it does not recognize. If the node has a `children` array, the consumer SHOULD process those children in the node's place; otherwise it skips the node.
6. **Hidden content.** A renderer SHOULD omit `LineReflection` and `SegmentReflection` entries unless its user asks for them (§2.5). A tool that serves authors — a formatter, an IDE preview, a comment thread — MAY show them.

Clauses 4 and 5 exist because a minor release may add properties and node kinds ([versioning policy](../policies/versioning-policy.md)). A new node kind that holds text keeps it in `children`, so that an older consumer still shows it.

Everything else this specification leaves to the consumer — following links, fetching embeds, the meaning of `loose`, the rendering of a `Spoiler` — is free.

### 18.5 Claims and the name

A conformance claim names the class and the language version: "a conforming Cutdown 0.11 parser". A consumer's claim also lists the conditional clauses of §18.4 it implements: interpolation, injection, streaming. The evidence a claim needs is governed by the [compliance claims policy](../policies/compliance-claims-policy.md).

An implementation that does not conform MUST NOT be called a Cutdown parser, writer, or consumer without a qualifier that says so, such as "Cutdown-derived" or "Cutdown-compatible". A modified or extended version of this specification is named the same way.

### 18.6 Limits

This table indexes every limit in the specification. Each rule is defined in the section named; where the two disagree, that is a defect (§0.2).

**Fixed limits** — every parser stops at the same point:

| Limit | Value | Past the limit | Diagnostic | Defined in |
|---|---|---|---|---|
| Block depth (`QuoteBlock`, `ListItem`, `TaskItem`, `NamedBlock`, `SpoilerBlock`) | 32 | the opener is text in the depth-32 container | CDN-0040 | §10.7 |
| `Mark` depth | 8 | the opener is literal text | CDN-0031 | §5.10 |
| Heading level | 9 | ten or more `=` give level 9; the rest is heading text | CDN-0012 | §4.2 |
| Entries per attribute group | 32 | later entries are dropped | CDN-0041 | §6.1.1 |
| Classes per attribute group | 32 | later classes are dropped | CDN-0034 | §6.1.1 |
| JSON attribute value | 4096 characters, depth 8 | the group is literal text | none | §6.1.1 |
| Query pairs per locator | 32 | later pairs are dropped | CDN-0042 | §9.2.3 |
| Path, URL, or `href` length | 2048 characters | kept in full | CDN-0035 | §9.2.5 |
| Ordered list number | 5 digits | not recognized: a longer run is text | none | §4.7 |

**Derived bounds** — they follow from the grammar and need no counter:

| Bound | Value | Why | Defined in |
|---|---|---|---|
| Link nesting | 1 | link text holds no link | §5.5 |
| Image nesting | 1 | `alt` holds no link or image | §5.9 |
| Inline depth | 28 | at most 6 span kinds per inline context, which never repeat in it; contexts chain at most root → link text → `alt`; `Mark` depth 8 across all three | §5, §5.10 |

**Host bounds** — the language sets none:

| Quantity | Bounded by |
|---|---|
| Document size | the host, before parsing (clause 7 makes cost linear in it) |
| Rows, columns, and cells per table; blocks per document; `reflections` entries per node | the document size |
