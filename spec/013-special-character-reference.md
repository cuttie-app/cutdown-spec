## 13. Special Character Reference

Escape rules: §8 (general), §8.2 (block-opener escapes), §8.3 (opaque-block closer escapes).

| Character | Name | Role                                                                                           | Escapable |
|-----------|------|------------------------------------------------------------------------------------------------|-----------|
| `=` | equals | Heading marker (line start)                                                                    | Yes |
| `#` | octothorpe | `##` line comment → Reflection entry (anywhere) / CommentBlock (`###`, line start) / fragment in a path (§9.2) / id link sigil (§5.5) | Yes |
| `*` | asterisk | Strong delimiter (`**`)                                                                        | Yes |
| `_` | underscore | Emphasis delimiter (`__`)                                                                      | Yes |
| `~` | tilde | Highlight (`~~`) / MetaBlock fence (`~~~`) / tag link sigil (§5.5)                            | Yes |
| \`  | backtick | Inline code (\`\`) / CodeBlock fence (\`\`\`) — escapable inside CodeInline as `` \` ``        | Yes |
| `[` | left bracket | Link/image opener; nests inside a path (§9.2.1)                                               | Yes |
| `]` | right bracket | Closer of link text and image alt                                                              | Yes |
| `(` | left parenthesis | Opener of a link target or image source; nests inside it (§9.2.1)                             | Yes |
| `)` | right parenthesis | The first unbalanced `)` ends a link target or image source                                    | Yes |
| `!` | exclamation mark | Image prefix                                                                                   | Yes |
| `{` | left brace | Attribute/variable opener / interpolation token `{{` in string properties (§5.11.1)            | Yes |
| `}` | right brace | Attribute/variable closer                                                                      | Yes |
| `:` | colon | Mark delimiter (`::`) / NamedBlock (`:::`)                                                     | Yes |
| `-` | hyphen | List marker / PageBreaker (`---`, top level)                                                     | Yes |
| `>` | greater-than sign | QuoteBlock marker                                                                              | Yes |
| `/` | slash | FileBlock / InjectBlock (line start) / folder separator in a path (§9.2)                       | Yes |
| `\` | backslash | Escape character / `LineBreak` at line end (§5.13) — also processes `` \` `` inside CodeInline | Yes |
| \|  | pipe | Table cell separator (pipe row) / header separator row                                         | Yes |
| `^` | caret | Ref link sigil and definition marker (§5.5, §4.14) / Spoiler delimiter (`^^`, `^^^`)          | Yes |
| `$` | dollar sign | Inline math (`$$`) / block math (`$$$`)                                                        | Yes |
| `"` | double quote | Inline quote delimiter (`""`)                                                                  | Yes |
| `'` | single quote | Inline quote delimiter (`''`)                                                                  | Yes |
| `?` | question mark | Query in a path (§9.2) — escapable only inside a path                                           | In paths |
| `&` | ampersand | Query pair separator in a path (§9.2) — escapable only inside a path                            | In paths |
| `@` | commercial at | Cite link sigil (§5.5) — escapable only inside a link target                                    | In link targets |

---
