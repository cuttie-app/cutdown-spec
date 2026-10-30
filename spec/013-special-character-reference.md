## 13. Special Character Reference

This is the register of every character with a role in Cutdown syntax: its name (§0.2), what it does at the start of a line and at an inline position, and where it may be escaped. A run of N identical characters is written out where the length matters; the general rules behind the runs are in §10.4. Escape rules: §8 (general), §8.2 (block-opener escapes), §8.3 (opaque-block closer escapes).

"Line start" means the first non-whitespace content of a block candidate, after container-indent stripping (§10.2). A character with no line-start role reads there as it does inline.

| Char | Name | Line start | Inline | Escapable |
|---|---|---|---|---|
| `=` | equals | `=` to `=========` + whitespace or line end: heading level 1–9 (§4.2); ten or more: level 9, the surplus begins the heading, CDN-0012 | literal; `key=value` in `{…}` (§6.1.1); query pair in a path (§9.2) | Yes |
| `#` | octothorpe | `##`: standalone comment line (§2.2); `###` or more: CommentBlock fence (§4.16) | `#` literal; `##` line comment to end of line, so `###` is `##` + `#` in the payload (§2.2); `{#id}` (§6.1.1); id link sigil `(#id)` (§5.5); fragment in a path (§9.2) | Yes |
| `*` | asterisk | — | `*` literal · `**` Strong (§5.3) · `***` = `**` + literal `*` · `****` empty `Strong` · `*****` empty `Strong` + `*` | Yes |
| `_` | underscore | — | `_` literal · `__` Emphasis (§5.2) · `___` = `__` + `_` · `____` empty `Emphasis` · `_____` empty `Emphasis` + `_` | Yes |
| `~` | tilde | `~~~` or more: Meta fence (§4.3) | `~` literal · `~~` Highlight (§5.4) · `~~~` = `~~` + `~` · `~~~~` empty `Highlight`; tag link sigil `(~tag)` (§5.5) | Yes |
| `` ` `` | backtick | ```` ``` ```` or more: CodeBlock fence (§4.4) | `` ` `` literal · ```` `` ```` CodeInline (§5.6) · ```` ``` ```` = ```` `` ```` + `` ` `` inside · four: empty `CodeInline` · five: `` CodeInline("`") ``; `` \` `` escapes inside CodeInline | Yes |
| `$` | dollar sign | `$$$` or more: MathBlock fence (§4.5) | `$` literal · `$$` MathInline (§5.7) · `$$$` = `$$` + `$` · `$$$$` empty `MathInline` · five: `MathInline("$")` | Yes |
| `^` | caret | `^ `: caption line (§6.2); `^^^` or more: SpoilerBlock fence (§4.15); `[^`: RefDefinition (§4.14) | `^` literal · `^^` Spoiler (§5.12) · `^^^` = `^^` + `^` · `^^^^` empty `Spoiler`; ref link sigil `(^ref)` (§5.5) | Yes |
| `:` | colon | `:::` or more: NamedBlock fence (§4.13) | `::name … ::` Mark (§5.10); alignment mark in a header separator cell, `:--` `--:` `:-:` (§4.8); ends a URI scheme in a link target, so `\:` makes the target a page path (§5.5) | Yes |
| `"` | double quote | — | `"` literal · `""` QuoteInline, double (§5.8) · `"""` = `""` + `"` · `""""` empty `QuoteInline`; quotes an attribute value (§6.1.1) | Yes |
| `'` | single quote | — | `'` literal · `''` QuoteInline, single (§5.8) · `'''` = `''` + `'` · `''''` empty `QuoteInline` | Yes |
| `-` | hyphen | `-` + whitespace or line end: list marker (§4.7); `---` or more: PageBreaker at top level, tail dropped with CDN-0016 (§4.10) | literal; separator cell symbol (§4.8) | Yes |
| `>` | greater-than sign | `>` + whitespace or line end: QuoteBlock marker; the count of markers is the depth (§4.6) | literal | Yes |
| `\|` | pipe | table row (§4.8) | cell separator inside a row | Yes |
| `/` | slash | FileBlock or InjectBlock (§4.11, §4.17) | folder separator in a path (§9.2); level separator in a tag (§5.5) | Yes |
| `\` | backslash | — | escape (§8); `LineBreak` at line end (§5.13) | Yes |
| `[` | left bracket | `[^`: RefDefinition (§4.14) | link and image opener; nests inside a path (§9.2.1) | Yes |
| `]` | right bracket | — | closer of link text and image alt | Yes |
| `(` | left parenthesis | — | opener of a link target or image source; nests inside it (§9.2.1) | Yes |
| `)` | right parenthesis | — | the first unbalanced `)` ends a link target or image source | Yes |
| `!` | exclamation mark | — | image prefix `![` (§5.9) | Yes |
| `{` | left brace | `{…}` attribute-continuation line (§6.1) | attribute opener (§6.1); `{{` Variable (§5.11) and interpolation token (§5.11.1) | Yes |
| `}` | right brace | — | attribute and variable closer | Yes |
| `0`–`9` | digits | one to five digits + `.` + whitespace or line end: ordered list marker (§4.7) | literal | Only as a block-opener escape (§8.2) |
| `.` | full stop | ends an ordered list marker (§4.7) | `.name` class token in `{…}` (§6.1.1); decimal alignment cell `--.` (§4.8) | Only as a block-opener escape (§8.2) |
| `,` | comma | — | comma alignment cell `--,` (§4.8) | No |
| `+` | plus sign | `- [+] `: checked task marker (§4.7.2) | literal | No |
| `?` | question mark | — | query in a path (§9.2) | In paths |
| `&` | ampersand | — | query pair separator in a path (§9.2) | In paths |
| `@` | commercial at | — | cite link sigil `(@key)` (§5.5) | In link targets |

`https://` at the start of a line opens an `EmbedBlock` (§4.9). It is a fixed prefix, not a repeated character, and is escaped as `\https://`.

---
