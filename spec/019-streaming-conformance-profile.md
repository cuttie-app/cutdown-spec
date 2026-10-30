## 19. Streaming Conformance Profile

### 19.1 Scope

The streaming profile is mandatory semantic conformance for every Cutdown parser. It does **not** require a streaming parser API, a renderer, or a transport protocol.

A producer may expose source one Unicode scalar value at a time. After each value, the source available so far is an **input snapshot** (§1.5) and MUST parse according to the ordinary Cutdown grammar. Parsing that snapshot incrementally MUST produce exactly the AST and diagnostics produced by parsing it afresh.

### 19.2 Input boundary

The profile begins after UTF-8 decoding (§10). A decoder buffers an incomplete multi-byte sequence until it can emit a Unicode scalar value; malformed transport bytes are not Cutdown input. The scalar boundary does not change `loc`: source locations remain UTF-16 code-unit offsets.

A producer MAY batch scalar values for transport, storage, or implementation. Batching does not change the result required at any scalar prefix.

### 19.3 Snapshot and EOF semantics

Every snapshot is an ordinary valid Cutdown document. End of input is the virtual line terminator described in §10. It may mean a saved file, the source currently available from an open producer, cancellation, or normal completion.

At end of input, existing rules apply without repair:

- unresolved inline openers degrade according to §12.1.4.1;
- an unclosed fence or container consumes its current body and emits its existing diagnostic;
- no closer, marker, whitespace, normalization, or other **source** is synthesized. This constrains source text only; synthesising AST nodes where the rules require them — a padded table `Cell` (§4.8) — is not source synthesis and is unaffected.

A later scalar may complete an unresolved construct and therefore reinterpret its unresolved suffix. It may also close an open block/container or alter derived section, page, and reference-resolution structure. This is ordinary reparsing of a later snapshot, not a mutation encoded in Cutdown source.

### 19.4 Consumers and end of block

Cutdown has no canonical rendering. A consumer that has the complete source snapshot MAY render it immediately. A streaming consumer MAY defer semantic rendering of incomplete content until an **end of block** inferred from ordinary syntax: a completed block boundary, a closing fence, or end of input.

An end of block is not a source token, a chunk boundary, or an external stream event. Deferred rendering MUST NOT change the AST or diagnostics required for any input snapshot.

A table is a worked example. Its column count is fixed by the first content row (§4.8, *Table shape*), so `Table.columns` is settled once a line terminator ends that row, and is never revised as later rows arrive — it is **monotonic**. Before that, the row is the last line of the snapshot: end of input closes it only for that snapshot, and a later scalar may still add cells. A consumer may therefore commit to a column count early. Under a `max()` rule it could not: a later wider row would retroactively change `columns`, so consecutive snapshots could legitimately disagree.

### 19.5 Exclusions

This profile defines no chunk envelope, completion event, retry, ordering, replacement, deletion, collaboration, CRDT identity, synchronization state, producer identity, or persistent provenance. Those concerns belong to the producer and consumer integration.

### 19.6 Evidence

A **prefix** of a fixture's `input` is its first *n* characters (§1.3), for every *n* from 0 — the empty prefix — up to the full length of `input`.

For each fixture in `tests/019-streaming-conformance-profile/`, a conforming implementation MUST parse every prefix, and for every prefix:

1. parsing MUST terminate and return an ordinary `Document`;
2. parsing the same prefix again MUST return the same AST and the same diagnostics;
3. where the fixture lists a checkpoint at *n*, the AST (or pages) and the diagnostics for that prefix MUST match the checkpoint.

An implementation conforms to the profile when all three hold for every prefix of every fixture. The fixture schema is defined in `tests/README.md`.

---
