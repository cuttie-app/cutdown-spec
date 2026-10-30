## 20. Conformance

### 20.1 Classes

This specification binds three classes of implementation. A requirement keyword (§1.1) always binds one of them.

| Class | Does | Bound by |
|---|---|---|
| **Parser** | turns Cutdown source into an AST and diagnostics | §20.2 |
| **Writer** | turns an AST into Cutdown source | §20.3 |
| **Consumer** | reads an AST: renders, indexes, resolves, transforms | §20.4 |

One program may belong to several classes; it conforms in each class separately. Other roles named in this specification are not classes:

- A **renderer** is a consumer that presents the document to a reader.
- A **producer** supplies decoded source to a parser (§10, §19). It has no obligations here.
- An **author** writes source. Every input is a document (§20.2), so no author is non-conforming; advice to authors is informative.
- A **formatter**, **generator**, or **round-trip editor** is a writer. A tool that patches source in place and keeps untouched text byte for byte is not a writer and has no obligations here.
- An **implementation** is a program of any class.

### 20.2 Parser

A conforming parser:

1. **Totality.** MUST accept every sequence of Unicode scalar values as a Cutdown document. It MUST NOT reject input, fail, or stop early; every input yields a `Document`.
2. **Output.** MUST produce exactly the AST that §1–§16 define and exactly the diagnostics, by code and level, that §17 defines for that input — no others. Node kinds and property names are those of §A. Source locations remain optional (§A).
3. **Determinism and purity.** MUST produce the same AST and diagnostics every time it parses the same input. It MUST NOT perform I/O: it resolves no path, link, injection, or variable, and every `InjectBlock` it emits has `children: []`.
4. **Streaming.** MUST satisfy the streaming conformance profile (§19).
5. **Corpus.** MUST pass every fixture of the conformance corpus ([`tests/`](../tests/)) for the language version it implements. The fixtures are normative examples. A disagreement among this text, its grammar blocks (§1.2), and a fixture is a defect in the specification, not a choice left to the parser.
6. **Version.** MUST state the language version it implements.
7. **Complexity.** MUST parse in time and memory linear in the length of the input, for every input.

Every limit this specification states is part of the output required by clause 2: a parser stops at the same point as every other and recovers the same way. §20.6 lists them. The language does not bound the size of a document; a host bounds its input before it calls the parser.

### 20.3 Writer

A conforming writer:

1. **Round-trip.** For every AST that a conforming parser can produce, MUST write source that a conforming parser parses back to the same AST. Source locations and diagnostics are not compared: a diagnostic records a recovery, which source cannot always carry. An AST that no parser can produce is outside this clause, and a writer MAY refuse it.
2. **Canonical form.** MUST write canonical form (§18). Two conforming writers given the same AST therefore write byte-identical source. A writer that keeps the author's spelling where §18 names a canonical one does not conform.
3. **Escaping.** MUST escape (§13) every character that would otherwise be read as syntax.

### 20.4 Consumer

Every consumer obligation is conditional: a consumer that never does a thing is not bound by the rule for it. A conforming consumer:

1. **Interpolation.** If it substitutes interpolation tokens, MUST resolve templates as §5.11.1 defines, MUST apply clauses 7, 8, and 10 to the substituted value rather than to the token, and MUST NOT parse a substituted value as Cutdown.
2. **Injection.** If it fills an `InjectBlock`, MUST build `children` as §9 defines, MUST stop on a cycle — an `InjectBlock` that names a document it is already filling stays unresolved, with `children: []` — and MUST bound the total expansion. The bound and how reaching it is reported are its own (§9.6).
3. **Streaming.** If it renders while source is still arriving, MUST NOT change the AST or diagnostics required for any input snapshot (§19.4).
4. **Unknown properties.** MUST ignore an AST property it does not recognize, and MUST NOT fail on one.
5. **Unknown node kinds.** MUST NOT fail on a node whose `_type` it does not recognize. If the node has a `children` array, the consumer SHOULD process those children in the node's place; otherwise it skips the node.
6. **Hidden content.** A renderer SHOULD omit `LineReflection` and `SegmentReflection` entries unless its user asks for them (§7.5). A tool that serves authors — a formatter, an IDE preview, a comment thread — MAY show them. A consumer that sends the AST or the source to a reader SHOULD first clear every `reflections` field, unless the author asked to keep them.
7. **Link schemes.** If it renders to a medium where a link can run code — HTML, a WebView — MUST check every `Link.href` against a scheme allowlist before emitting it, and MUST render a link that fails the check as its text alone.
8. **Attribute keys.** If it maps attributes onto a medium where they can run code or load resources, MUST map each key through an allowlist and drop keys not on it; it MUST NOT copy a key through unchanged. It SHOULD give `id` values a prefix of its own, so that they cannot collide with names in the host page.
9. **JSON values.** If it merges a JSON attribute value into its own objects, MUST NOT let an object name — `__proto__`, `constructor`, `prototype` — change the structure of those objects.
10. **Paths.** If it maps a `path` to storage, MUST treat it as `/`-separated segments under its root, MUST NOT decode or reinterpret any character as a separator, and MUST confirm that the resolved resource lies inside the root after the storage's own resolution, links and case folding included.
11. **Meta.** If it parses a `Meta` body, MUST read `yaml` as YAML 1.2 [YAML] with the core schema and no custom tags, `json` as I-JSON [RFC7493], and `toml` as TOML 1.0.0 [TOML].
12. **Fetching.** If it fetches an author-supplied URL from its own network, SHOULD refuse destinations that resolve to non-public addresses — loopback, link-local, private, unique-local — checked on the resolved address of every connection, redirects included. If it makes a reader's client fetch one, SHOULD let the reader or the host control that.
13. **Displayed targets.** If it shows a link target, id, tag, or path to a reader, SHOULD show it in a way that exposes mixed scripts and confusable characters [UTS39].

Clauses 4 and 5 exist because a minor release may add properties and node kinds ([versioning policy](../policies/versioning-policy.md)). A new node kind that holds text keeps it in `children`, so that an older consumer still shows it.

Clauses 6–13 exist because a document is input from its author, and §21 explains each risk. Everything else this specification leaves to the consumer — following links, fetching embeds, the meaning of `loose`, the rendering of a `Spoiler` — is free, within those clauses.

### 20.5 Claims and the name

A conformance claim names the class and the language version: "a conforming Cutdown 0.11 parser". A consumer's claim also lists the conditional clauses of §20.4 that apply to it, by name: interpolation, injection, streaming, link schemes, and so on. The evidence a claim needs is governed by the [compliance claims policy](../policies/compliance-claims-policy.md).

An implementation that does not conform MUST NOT be called a Cutdown parser, writer, or consumer without a qualifier that says so, such as "Cutdown-derived" or "Cutdown-compatible". A modified or extended version of this specification is named the same way.

### 20.6 Limits

This table indexes every limit in the specification. Each rule is defined in the section named; where the two disagree, that is a defect (§1.2).

**Fixed limits** — every parser stops at the same point:

| Limit | Value | Past the limit | Diagnostic | Defined in |
|---|---|---|---|---|
| Block depth (`QuoteBlock`, `ListItem`, `TaskItem`, `NamedBlock`, `SpoilerBlock`) | 32 | the opener is text in the depth-32 container | CDN-0040 | §11.7 |
| `Mark` depth | 8 | the opener is literal text | CDN-0031 | §5.10 |
| Heading level | 9 | ten or more `=` give level 9; the rest is heading text | CDN-0012 | §4.2 |
| Entries per attribute group | 32 | later entries are dropped | CDN-0041 | §6.1.1 |
| Classes per attribute group | 32 | later classes are dropped | CDN-0034 | §6.1.1 |
| JSON attribute value | 4096 characters, depth 8 | the group is literal text | none | §6.1.1 |
| Query pairs per locator | 32 | later pairs are dropped | CDN-0042 | §8.3 |
| Path, URL, or `href` length | 2048 characters | kept in full | CDN-0035 | §8.5 |
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
