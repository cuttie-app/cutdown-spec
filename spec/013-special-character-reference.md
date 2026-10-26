## 13. Special Character Reference

Escape rules: §8 (general), §8.2 (block-opener escapes), §8.3 (opaque-block closer escapes).

| Character | Name | Role                                                                                           | Escapable |
|-----------|------|------------------------------------------------------------------------------------------------|-----------|
| `=` | equals | Heading marker (line start)                                                                    | Yes |
| `#` | octothorpe | `##` line comment → Reflection entry (anywhere) / CommentBlock (`###`, line start) / fragment in a path (§1.7) / tag sigil (§5.5) | Yes |
| `*` | asterisk | Strong delimiter (`**`)                                                                        | Yes |
| `_` | underscore | Emphasis delimiter (`__`)                                                                      | Yes |
| `~` | tilde | Highlight (`~~`) / MetaBlock fence (`~~~`)                                                     | Yes |
| \`  | backtick | Inline code (\`\`) / CodeBlock fence (\`\`\`) — escapable inside CodeInline as `` \` ``        | Yes |
| `[` | left bracket | Link/image opener; nests inside a path (§1.7.1)                                               | Yes |
| `]` | right bracket | Link/image closer; the first unbalanced `]` ends a page path                                   | Yes |
| `(` | left parenthesis | Link URL opener; nests inside a path (§1.7.1)                                                 | Yes |
| `)` | right parenthesis | Link URL closer; the first unbalanced `)` ends an image path                                   | Yes |
| `!` | exclamation mark | Image prefix                                                                                   | Yes |
| `{` | left brace | Attribute/variable opener / interpolation token `{{` in string properties (§5.11.1)            | Yes |
| `}` | right brace | Attribute/variable closer                                                                      | Yes |
| `:` | colon | Mark delimiter (`::`) / NamedBlock (`:::`)                                                     | Yes |
| `-` | hyphen | List marker / PageBreaker (`---`, top level)                                                     | Yes |
| `>` | greater-than sign | QuoteBlock marker                                                                              | Yes |
| `/` | slash | FileBlock / InjectBlock (line start) / folder separator in a path (§1.7)                       | Yes |
| `\` | backslash | Escape character / `LineBreak` at line end (§5.13) — also processes `` \` `` inside CodeInline | Yes |
| \|  | pipe | Table cell separator (pipe row) / header separator row                                         | Yes |
| `^` | caret | Reference link/definition marker / Spoiler delimiter (`^^`, `^^^`)                             | Yes |
| `$` | dollar sign | Inline math (`$$`) / block math (`$$$`)                                                        | Yes |
| `"` | double quote | Inline quote delimiter (`""`)                                                                  | Yes |
| `'` | single quote | Inline quote delimiter (`''`)                                                                  | Yes |
| `?` | question mark | Query in a path (§1.7) — escapable only inside a path                                           | In paths |
| `&` | ampersand | Query pair separator in a path (§1.7) — escapable only inside a path                            | In paths |

---
