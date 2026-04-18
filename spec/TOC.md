# Cutdown Markup Language Specification

- **Status:** Draft
- **Version:** 0.3.3
- **Date:** 2026-04-04
- **Inspired by:** Djot, CommonMark
- **Versioning policy:** [`policies/versioning-policy.md`](policies/versioning-policy.md)
- **Change publication policy:** [`policies/change-publication-policy.md`](policies/change-publication-policy.md)
- **Conformance policy:** [`policies/conformance-policy.md`](policies/conformance-policy.md)
- **Parser profile policy:** [`policies/parser-profile-policy.md`](policies/parser-profile-policy.md)
- **Diagnostics policy:** [`policies/diagnostics-policy.md`](policies/diagnostics-policy.md)
- **Diagnostic code registry policy:** [`policies/diagnostic-code-registry-policy.md`](policies/diagnostic-code-registry-policy.md)
- **Diagnostic code registry:** [`policies/diagnostic-code-registry.md`](policies/diagnostic-code-registry.md)
- **Capability policy:** [`policies/capability-policy.md`](policies/capability-policy.md)
- **Canonical serialization policy:** [`policies/canonical-serialization-policy.md`](policies/canonical-serialization-policy.md)
- **Compatibility fallback policy:** [`policies/compatibility-fallback-policy.md`](policies/compatibility-fallback-policy.md)
- **Conformance corpus governance:** [`policies/conformance-corpus-governance.md`](policies/conformance-corpus-governance.md)
- **Decision authority policy:** [`policies/decision-authority-policy.md`](policies/decision-authority-policy.md)
- **Profile source policy:** [`policies/profile-source-policy.md`](policies/profile-source-policy.md)
- **Compliance levels policy:** [`policies/compliance-levels-policy.md`](policies/compliance-levels-policy.md)
- **Compliance evidence freshness policy:** [`policies/compliance-evidence-freshness-policy.md`](policies/compliance-evidence-freshness-policy.md)
- **Compliance failure response policy:** [`policies/compliance-failure-response-policy.md`](policies/compliance-failure-response-policy.md)
- **Cross-implementation validation policy:** [`policies/cross-implementation-validation-policy.md`](policies/cross-implementation-validation-policy.md)
- **Reference parser status policy:** [`policies/reference-parser-status-policy.md`](policies/reference-parser-status-policy.md)
- **Governance review policy:** [`policies/governance-review-policy.md`](policies/governance-review-policy.md)

---

## Abstract

Cutdown is a lightweight markup language designed to produce a structured AST (Abstract Syntax Tree). It has no canonical HTML output — consuming applications interpret and render the AST. The reference consumer is the Cuttie application.

Cutdown prioritizes **unambiguous parsing**, **consistency**, and **implementability**. Every syntactic construct is locally deterministic. The parser never backtracks.

Cutdown is a simple markup language with the bare minimum features to structure content. It does not have a goal to satisfy all varieties of representing content in ASCII.

---

## Table of Contents

1. [Conventions](001-conventions.md) — Identifier charset, Segment, Block type, Inline type
2. [Comments](002-comments.md)
3. [Document Model](003-document-model.md) — Document, Page
4. [Block Segments](004-block-segments.md) — Paragraph, Section, Meta, CodeBlock, MathBlock, QuoteBlock, List, ListItem, TaskItem, Table, ImageBlock, ThematicBreak, FileRef, FileRefGroup, NamedBlock, RefDefinition
5. [Inline Segments](005-inline-segments.md) — Text, Emphasis, Strong, Strikethrough, CodeInline, TextBreak, Link, ImageInline, Span, MathInline, Variable, QuoteInline
6. [Universal Attributes](006-universal-attributes.md)
7. [Input Normalization](007-input-normalization.md)
8. [Escaping](008-escaping.md)
9. [Parsing Algorithm](009-parsing-algorithm.md)
10. [Block Structure and Block Boundaries](010-block-structure.md)
11. [Precedence Rules](011-precedence-rules.md)
12. [Whitespace Rules](012-whitespace-rules.md)
13. [Special Character Reference](013-special-character-reference.md)
14. [AST Node Reference](014-ast-node-reference.md)
15. [Name and Compliance](015-name-and-compliance.md)

---
