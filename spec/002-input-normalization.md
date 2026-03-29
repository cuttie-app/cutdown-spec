## 2. Input Normalization

Before any parsing begins, the following transformations are applied in order:

1. **Encoding:** Input MUST be valid UTF-8. Invalid byte sequences are an error.
2. **Line endings:** All `\r\n` sequences are normalized to `\n`. Lone `\r` is normalized to `\n`. \
   After normalization, the input is a sequence of Unicode characters with `\n` line endings.
3. **Tabs:** Tab characters (`\t`) outside fenced blocks are normalized to a single space (`U+0020`) before block classification. Tabs inside fenced blocks (code blocks, Meta blocks, math blocks) are preserved literally. No warning is emitted.
  - Leading tab on a block line → treated as one leading space, then stripped by block classification
  - Tab inside inline content → treated as a single space (participates in whitespace collapsing)
  - Tab inside code/meta/math fences → preserved literally (no change)

---
