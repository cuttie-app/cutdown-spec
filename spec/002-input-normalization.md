## 2. Input Normalization

Before any parsing begins, the following transformations are applied in order:

1. **Encoding:** Input MUST be valid UTF-8. Invalid byte sequences are an error.
2. **BOM:** A UTF-8 BOM (`U+FEFF`) at the start of the input is silently stripped before any other processing. A BOM appearing anywhere else in the document is treated as a regular Unicode character.
3. **Null bytes:** `U+0000` is not valid content. Any occurrence of `U+0000` in the input is an error; the parser MUST replace it with `U+FFFD` (Unicode replacement character) and MAY emit a diagnostic.
4. **Line endings:** All `\r\n` sequences are normalized to `\n`. Lone `\r` is normalized to `\n`. \
   After normalization, the input is a sequence of Unicode characters with `\n` line endings.
5. **Tabs:** Tab characters (`\t`) outside fenced blocks are normalized to a single space (`U+0020`) before block classification. Tabs inside fenced blocks (code blocks, Meta blocks, math blocks) are preserved literally. No warning is emitted.
  - Leading tab on a block line → treated as one leading space, then stripped by block classification
  - Tab inside inline content → treated as a single space (participates in whitespace collapsing)
  - Tab inside code/meta/math fences → preserved literally (no change)
6. **HTML entities:** HTML character references (`&amp;`, `&lt;`, `&#160;`, `&nbsp;`, etc.) are **not decoded**. They are emitted as literal `Text` nodes. The parser has no HTML entity table. Consumers rendering to HTML are responsible for deciding whether to re-encode or pass through.

---
