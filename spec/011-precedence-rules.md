## 11. Precedence Rules

When multiple constructs compete for the same input, the following priority applies (highest first):

| Priority | Construct                                                                       | Notes |
|----------|---------------------------------------------------------------------------------|-------|
| 1 | CodeBlock fence ` ``` `                                                         | Content always literal |
| 2 | MetaBlock fence `~~~`                                                           | Content always literal |
| 3 | MathBlock `$$$`                                                                 | Content always literal |
| 4 | CommentBlock `###`                                                              | Content always literal (opaque). See §4.16 |
| 5 | Escape `\x`                                                                     | Resolved before every inline construct: an escaped character is never a delimiter or a `##`. Inside opaque content only the narrow escapes of §8.3 apply. Also recognized in Phase 2, before the `##` cut (§9.1.2) |
| 6 | Inline code \`\` `CodeInline`                                                   | Content literal |
| 7 | Inline math `$$`                                                                | Matched before emphasis; content is literal |
| 8 | Line comment `##`                                                               | No closer; runs to EOL. Payload stored as `Reflection` entry on enclosing block. Acts as the terminator for any open inline constructs, which degrade per their class (§9.1.4.1) — Class 2 openers emit the verbatim slice up to the `##` cut. Not recognized inside a CodeInline or MathInline that closes (both rank above it), nor — the one exception to this order — inside a quoted attribute value. See §2.2 |
| 9 | Links and images `[...](...)`                                                   | Matched before emphasis runs |
| 10 | Strong `**`, Emphasis `__`, Highlight `~~`, Spoiler `^^`, QuoteInline `""` `''` | Source order, greedy |
| 11 | Mark `::name … ::`                                                              | Matched after emphasis. The name run is lexed before delimiter matching and is independent of this table — see *Name lexing* in §5.10 |
| 12 | Variable `{{key}}` / Attributes `{...}`                                         | Longest opener wins (`{{` before `{`), then source order |

Note: MathInline content is always literal (no inline parsing). MathBlock content is always literal.

Note: inside a path (§9.2.1) brackets nest by the path's own counting, and inside a JSON attribute value (§6.1.1) braces and brackets within JSON strings are not counted. Neither is ordered by this table.

---
