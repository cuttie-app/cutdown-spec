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

This specification does not yet bound input size or nesting depth. The limits it does state (heading level, Mark depth, class count, query pairs, JSON size and depth, list number width) are part of the output required by clause 2.

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
