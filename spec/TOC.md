# Cutdown Markup Language Specification

- **Status:** Draft
- **Version:** 0.11.0
- **Date:** 2026-10-25
- **Inspired by:** [COMMONMARK], [DJOT], [CARVE] (§1.6)
- **Versioning policy:** [`policies/versioning-policy.md`](../policies/versioning-policy.md)
- **Change publication policy:** [`policies/change-publication-policy.md`](../policies/change-publication-policy.md)
- **Conformance policy:** [`policies/conformance-policy.md`](../policies/conformance-policy.md)
- **Parser profile policy:** [`policies/parser-profile-policy.md`](../policies/parser-profile-policy.md)
- **Diagnostic code registry policy:** [`policies/diagnostic-code-registry-policy.md`](../policies/diagnostic-code-registry-policy.md)
- **Capability policy:** [`policies/capability-policy.md`](../policies/capability-policy.md)
- **Canonical serialization policy:** [`policies/canonical-serialization-policy.md`](../policies/canonical-serialization-policy.md)
- **Compatibility fallback policy:** [`policies/compatibility-fallback-policy.md`](../policies/compatibility-fallback-policy.md)
- **Conformance corpus governance:** [`policies/conformance-corpus-governance.md`](../policies/conformance-corpus-governance.md)
- **Decision authority policy:** [`policies/decision-authority-policy.md`](../policies/decision-authority-policy.md)
- **Profile source policy:** [`policies/profile-source-policy.md`](../policies/profile-source-policy.md)
- **Compliance claims policy:** [`policies/compliance-claims-policy.md`](../policies/compliance-claims-policy.md)
- **Compliance evidence freshness policy:** [`policies/compliance-evidence-freshness-policy.md`](../policies/compliance-evidence-freshness-policy.md)
- **Compliance failure response policy:** [`policies/compliance-failure-response-policy.md`](../policies/compliance-failure-response-policy.md)
- **Cross-implementation validation policy:** [`policies/cross-implementation-validation-policy.md`](../policies/cross-implementation-validation-policy.md)
- **Reference parser status policy:** [`policies/reference-parser-status-policy.md`](../policies/reference-parser-status-policy.md)
- **Governance review policy:** [`policies/governance-review-policy.md`](../policies/governance-review-policy.md)

---

## Abstract

**Cutdown** is a lightweight markup language with a closed, finite syntax, parsed in a single forward pass so a document renders as it arrives rather than after it ends. Two identical characters wrap inline text; three open a block. Thus, the parser resolves every construct when it is first encountered.

Cutdown prioritizes **unambiguous parsing**, **consistency**, and **implementability**. Every syntactic construct is locally deterministic. The parser never backtracks.

It has no canonical HTML output — consuming applications interpret and render the AST.

---

## Table of Contents

1. [Preliminaries](001-preliminaries.md) — requirement keywords, notation, characters, lines and whitespace, terms, references, media type and file extension
2. [Identifiers and AST Model](002-identifiers-and-ast-model.md) — Identifier charset, Segment, Block type, Inline type, Block scope
3. [Document Model](003-document-model.md) — Document, Page
4. [Block Segments](004-block-segments.md) — Paragraph, Section, Meta, CodeBlock, MathBlock, QuoteBlock, List, ListItem, TaskItem, Table, PageBreaker, FileBlock, FileGroup, EmbedBlock, InjectBlock, NamedBlock, RefDefinition, SpoilerBlock, CommentBlock
5. [Inline Segments](005-inline-segments.md) — Text, Emphasis, Strong, Highlight, Spoiler, CodeInline, LineBreak, Link, ImageInline, EmbedImageInline, Mark, MathInline, Variable, QuoteInline
6. [Universal Attributes](006-universal-attributes.md)
7. [Comments](007-comments.md) — `##` line comment (`LineReflection`), CommentBlock `###` and orphan lines (`SegmentReflection` on the Page)
8. [PathResourceLocator](008-path-resource-locator.md) — extent, escapes, decomposition, normalization, validity, equivalence
9. [Injection](009-injection.md) — what an InjectBlock means once a consumer resolves it
10. [Input Interpretation](010-input-interpretation.md)
11. [Block Structure and Block Boundaries](011-block-structure.md) — boundaries, fences, list indentation, nesting limit
12. [Parsing Algorithm](012-parsing-algorithm.md) — phases, degradation classes, incremental availability
13. [Escaping](013-escaping.md)
14. [Precedence Rules](014-precedence-rules.md)
15. [Whitespace Rules](015-whitespace-rules.md)
16. [Derived Structure](016-derived-structure.md) — sectionization and pagination folds, PageBreaker
17. [Diagnostics](017-diagnostics.md) — the diagnostic object and every CDN code with its trigger and recovery
18. [Canonical Form](018-canonical-form.md) — the one spelling a writer emits where the grammar accepts several
19. [Streaming Conformance Profile](019-streaming-conformance-profile.md) — decoded-character snapshots, end-of-block semantics, and profile evidence
20. [Conformance](020-conformance.md) — parser, writer, and consumer classes; claims and the name; limits
21. [Security Considerations](021-security-considerations.md) — what a document can carry into its consumer, and the clause that handles each risk

Appendices

- A. [AST Node (Segment) Reference](appendix-a-ast-node-reference.md)
- B. [Special Character Reference](appendix-b-special-character-reference.md)
- C. [Rationale](appendix-c-rationale.md) — informative: why each major decision was made, and what it costs
---
