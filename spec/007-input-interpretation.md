## 7. Input Interpretation

Cutdown does not preprocess the input into a normalized copy. The parser reads the raw file and applies the following **interpretive rules** — the source text is never rewritten, so there is exactly one coordinate system: UTF-16 code-unit offsets into the raw input (see §14, Location Type).

1. **Encoding:** Input MUST be valid UTF-8. Invalid byte sequences are an error.
2. **Unicode normalization:** Identifiers (labels, references, mentions) are **compared under NFC** — two identifiers match if their NFC forms are equal. The source text itself is never rewritten to NFC (a textual normalization pass would shift `loc` offsets). Authors SHOULD store files in NFC.
3. **BOM:** A UTF-8 BOM (`U+FEFF`) at the start of the input is skipped — the first content offset is 1 instead of 0. A BOM appearing anywhere else in the document is treated as a regular Unicode character.
4. **Null bytes:** `U+0000` is not valid content. The parser MUST emit `U+FFFD` (Unicode replacement character) in its place in `Text` values and MAY emit a diagnostic. `U+0000` and `U+FFFD` are both one UTF-16 code unit, so offsets are unaffected.
5. **Line terminators:** `\r\n`, lone `\r`, and `\n` are all line terminators. This is lexer behavior, not a rewrite: in a `\r\n` file the `\r` is simply part of the terminator, and line content ends before it. If the input does not end with a line terminator, the lexer treats end-of-input as a virtual terminator; no text is appended.
6. **Document-edge blank lines:** Leading and trailing **blank lines** (lines containing only whitespace characters per §10.1) are skipped by the block phase — they produce no blocks and no diagnostic. A document consisting entirely of blank lines produces an empty AST. The skipped text remains part of the raw input for offset purposes.
7. **Tabs:** A tab character (`\t`) outside fenced blocks is **treated as** a single space (`U+0020`) for all structural and inline purposes. Tab and space are both one UTF-16 code unit, so offsets are unaffected. No diagnostic is emitted.
   - Leading tab on a block line → treated as one leading space, then disregarded by block classification
   - Tab inside inline content → treated as a single space (participates in whitespace collapsing)
   - Tab inside code/meta/math fences → preserved literally in the emitted `raw` value
8. **HTML entities:** HTML character references (`&amp;`, `&lt;`, `&#160;`, `&nbsp;`, etc.) are **not decoded**. They are emitted as literal `Text` segments. The parser has no HTML entity table. Consumers rendering to HTML are responsible for deciding whether to re-encode or pass through.
9. **BiDi Control Characters:** Unicode bidirectional control characters (e.g., `U+200E` LRM, `U+200F` RLM, `U+2066`–`U+2069` Isolates) MUST be preserved literally in `Text` segments. The parser performs no special BiDi-aware reordering; it operates strictly on logical character order.

---
