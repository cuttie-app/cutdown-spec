## 11. Precedence Rules

When multiple constructs compete for the same input, the following priority applies (highest first):

| Priority | Construct                                                                       | Notes |
|----------|---------------------------------------------------------------------------------|-------|
| 1 | CodeBlock fence ` ``` `                                                         | Content always literal |
| 2 | MetaBlock fence `~~~`                                                           | Content always literal |
| 3 | MathBlock `$$$`                                                                 | Content always literal |
| 4 | CommentBlock `###`                                                              | Content always literal (opaque). See §2.3, §4.16 |
| 5 | Inline code \`\` `CodeInline`                                                   | Content literal |
| 6 | Line comment `##`                                                               | No closer; runs to EOL. Payload stored as `Reflection` entry on enclosing block. Acts as the terminator for any open inline constructs, which degrade per their class (§9.4.1) — Class 2 openers emit the verbatim slice up to the `##` cut. Not recognized inside CodeInline / MathInline / quoted attribute values. See §2.2 |
| 7 | Escape `\x`                                                                     | Resolved before delimiter matching |
| 8 | Links and images `[...](...)`                                                   | Matched before emphasis runs |
| 9 | Inline math `$$`                                                                | Matched before emphasis; content is literal |
| 10 | Strong `**`, Emphasis `__`, Highlight `~~`, Spoiler `^^`, QuoteInline `""` `''` | Source order, greedy |
| 11 | Named span `::name`                                                             | Matched after emphasis |
| 12 | Variable `{{key}}` / Attributes `{...}`                                         | Longest opener wins (`{{` before `{`), then source order |

Note: MathInline content is always literal (no inline parsing). MathBlock content is always literal.

---
