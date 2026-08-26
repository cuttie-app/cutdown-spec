## 13. Special Character Reference

Escape rules: §8 (general), §8.2 (block-opener escapes), §8.3 (opaque-block closer escapes).

| Character | Name | Role | Escapable |
|-----------|------|------|-----------|
| `=` | equals | Heading marker (line start) | Yes |
| `#` | octothorpe | `##` line comment → Reflection entry (anywhere) / CommentBlock (`###`, line start) | Yes |
| `*` | asterisk | Strong delimiter (`**`) | Yes |
| `_` | underscore | Emphasis delimiter (`__`) | Yes |
| `~` | tilde | Highlight (`~~`) / metadata fence (`~~~`) | Yes |
| \`  | backtick | Inline code (\`\`) / code fence (\`\`\`) — escapable inside CodeInline as `` \` `` | Yes |
| `[` | left bracket | Link/image opener | Yes |
| `]` | right bracket | Link/image closer | Yes |
| `(` | left parenthesis | Link URL opener | Yes |
| `)` | right parenthesis | Link URL closer | Yes |
| `!` | exclamation mark | Image prefix | Yes |
| `{` | left brace | Attribute/variable opener | Yes |
| `}` | right brace | Attribute/variable closer | Yes |
| `:` | colon | Named span prefix (`::`) / named block (`:::`) | Yes |
| `-` | hyphen | List marker / page break (`---`, top level) | Yes |
| `>` | greater-than sign | QuoteBlock marker | Yes |
| `/` | slash | File reference (line start) | Yes |
| `\` | backslash | Escape character / hard break — also processes `` \` `` inside CodeInline | Yes |
| \|  | pipe | Table cell separator (pipe row) / header separator row | Yes |
| `+` | plus | Multiline table opener / row separator (`+-`, `+---+`) | Yes |
| `^` | caret | Reference link/definition marker / Spoiler delimiter (`^^`, `^^^`) | Yes |
| `$` | dollar sign | Inline math (`$$`) / block math (`$$$`) | Yes |
| `"` | double quote | Inline quote delimiter (`""`) | Yes |
| `'` | single quote | Inline quote delimiter (`''`) | Yes |

---
