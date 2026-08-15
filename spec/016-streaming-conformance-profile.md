## 16. Streaming Conformance Profile

### 16.1 Scope

The streaming profile is mandatory semantic conformance for every Cutdown parser. It does **not** require a streaming parser API, a renderer, or a transport protocol.

A producer may expose source one Unicode scalar value at a time. After each value, the source available so far is an **input snapshot** (§1) and MUST parse according to the ordinary Cutdown grammar. Parsing that snapshot incrementally MUST produce exactly the AST and diagnostics produced by parsing it afresh.

### 16.2 Input boundary

The profile begins after UTF-8 decoding (§7). A decoder buffers an incomplete multi-byte sequence until it can emit a Unicode scalar value; malformed transport bytes are not Cutdown input. The scalar boundary does not change `loc`: source locations remain UTF-16 code-unit offsets.

A producer MAY batch scalar values for transport, storage, or implementation. Batching does not change the result required at any scalar prefix.

### 16.3 Snapshot and EOF semantics

Every snapshot is an ordinary valid Cutdown document. End of input is the virtual line terminator described in §7. It may mean a saved file, the source currently available from an open producer, cancellation, or normal completion.

At end of input, existing rules apply without repair:

- unresolved inline openers degrade according to §9.4.1;
- an unclosed fence or container consumes its current body and emits its existing diagnostic;
- no closer, marker, whitespace, normalization, or other source is synthesized.

A later scalar may complete an unresolved construct and therefore reinterpret its unresolved suffix. It may also close an open block/container or alter derived section, page, and reference-resolution structure. This is ordinary reparsing of a later snapshot, not a mutation encoded in Cutdown source.

### 16.4 Consumers and end of block

Cutdown has no canonical rendering. A consumer that has the complete source snapshot MAY render it immediately. A streaming consumer MAY defer semantic rendering of incomplete content until an **end of block** inferred from ordinary syntax: a completed block boundary, a closing fence, or end of input.

An end of block is not a source token, a chunk boundary, or an external stream event. Deferred rendering MUST NOT change the AST or diagnostics required for any input snapshot.

### 16.5 Exclusions

This profile defines no chunk envelope, completion event, retry, ordering, replacement, deletion, collaboration, CRDT identity, synchronization state, producer identity, or persistent provenance. Those concerns belong to the producer and consumer integration.

### 16.6 Evidence

A conforming implementation MUST run every Unicode-scalar prefix of each fixture in `tests/016-streaming-conformance-profile/`, including the empty and full prefixes. For every prefix it MUST demonstrate:

1. parsing terminates with an ordinary `Document` result;
2. repeated parsing is deterministic in AST and diagnostics; and
3. every listed checkpoint matches the fixture’s expected AST/pages and diagnostics.

The fixture schema is defined in `tests/README.md`.
