## 16. Derived Structure

Parsing (Phases 1–4) produces a **flat block sequence** — one for the document root, and one for the child list of every block container (`ListItem`, `TaskItem`, `QuoteBlock`, `NamedBlock`, `SpoilerBlock`). `Section` nesting and the `Page[]` division are not parsed; they are **derived** from these flat sequences by two deterministic folds: the sectionization fold (§16.1) and the pagination fold (§16.2).

**Implementation neutrality.** The folds define the resulting tree, not an implementation strategy. A parser MAY interleave fold logic with block classification, run the folds as separate post-passes, or use any other strategy — it conforms as long as it produces the same tree.

### 16.1 Sectionization fold

The sectionization fold applies independently to every flat block sequence (root and each container child list).

**A `Section` spans from its heading to the next heading of level ≤ its own within the same sequence, or to the sequence's end.** Equivalently, walking the sequence in document order:

1. On a heading of level `n`: close all open Sections of level ≥ `n` within this sequence, then open a new `Section(level=n)`.
2. All subsequent non-heading blocks belong to the innermost open Section.
3. All open Sections close at the end of the sequence. Section scope never crosses a container boundary.

**Skipped levels.** A heading whose level is deeper than the innermost open Section by more than one (e.g. `=` followed directly by `===`) nests under the nearest shallower open Section. The written level is preserved in the `Section` node; no intermediate Sections are synthesized; no diagnostic is emitted. The written level is the source of truth — tree depth is incidental, and consumers that need a normalized depth derive it themselves.

**Section attributes** are those at the end of the heading only. Rule B (§6) never assigns a scope-chain slot to a Section.

### 16.2 Pagination fold

The pagination fold applies **only to the root sequence** — blocks inside containers never affect pagination regardless of their type. Two items drive the fold: `Meta` blocks and PageBreakers (§16.3).

1. The document begins with `Page[0]`, initially empty (`meta: null`, `reflections: []`, `children: []`).
2. A **PageBreaker** unconditionally closes the current Page — as a Ghost Page if it is empty — and opens a new empty Page. A PageBreaker also closes all open root-level Sections. Every PageBreaker produces a page boundary: a leading `---` at document start yields a leading Ghost Page; consecutive separators yield Ghost Pages.
3. A **`Meta` block** whose current Page has `meta: null` fills that slot. No new Page is created, whatever content the Page already holds: a `Meta` after paragraphs, comments, or any other block still fills the Page those blocks are on, and a `Meta` after a PageBreaker fills the Page the PageBreaker opened.
4. A **`Meta` block** whose current Page already has a `meta` closes that Page and opens a new Page carrying itself as `meta`.
5. All other root blocks are appended to the current Page's `children`, and every segment comment the fold reaches — at root level or inside a root block — is appended to the current Page's `reflections` (§7.3).
6. Ghost Pages (`meta: null`, `reflections: []`, `children: []`) are valid and emitted as-is. Consumers decide how to handle them.

Steps 3 and 4 depend only on the current Page's `meta` slot, never on where the `Meta` stands among other blocks. Content before a `Meta` therefore never creates a Page boundary; only a PageBreaker or a second `Meta` does.

### 16.3 PageBreaker

A **PageBreaker** is the pagination signal consumed by the fold in §16.2. It produces no AST node. The construct — its syntax, its diagnostics, and its behaviour inside block containers — is defined in §4.10.

---
