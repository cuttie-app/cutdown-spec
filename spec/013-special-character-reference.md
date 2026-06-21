## 13. Special Character Reference

Escape rules: §8 (general), §8.2 (block-opener escapes), §8.3 (opaque-block closer escapes).

| Character | Role | Escapable |
|-----------|------|-----------|
| `=` | Heading marker (line start) | Yes |
| `#` | `##` line comment → Reflection entry (anywhere) / CommentBlock (`###`, line start) | Yes |
| `*` | Emphasis delimiter (`**`) | Yes |
| `_` | Strong delimiter (`__`) | Yes |
| `~` | Strikethrough (`~~`) / metadata fence (`~~~`) | Yes |
| \`  | Inline code (\`\`) / code fence (\`\`\`) — escapable inside CodeInline as `` \` `` | Yes |
| `[` | Link/image opener | Yes |
| `]` | Link/image closer | Yes |
| `(` | Link URL opener | Yes |
| `)` | Link URL closer | Yes |
| `!` | Image prefix | Yes |
| `{` | Attribute/variable opener | Yes |
| `}` | Attribute/variable closer | Yes |
| `:` | Named span prefix (`::`) / named block (`:::`) | Yes |
| `-` | List marker / thematic break | Yes |
| `>` | QuoteBlock marker | Yes |
| `/` | File reference (line start) | Yes |
| `\` | Escape character / hard break — also processes `` \` `` inside CodeInline | Yes |
| \|  | Table cell separator | Yes |
| `^` | Reference link/definition marker / Spoiler delimiter (`^^`, `^^^`) | Yes |
| `$` | Inline math (`$$`) / block math (`$$$`) | Yes |
| `"` | Inline quote delimiter (`""`) | Yes |
| `'` | Inline quote delimiter (`''`) | Yes |

---
