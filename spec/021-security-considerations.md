## 21. Security Considerations

This section is informative. It names the risks a Cutdown document carries into the programs that read it, says what the parser guarantees about each, and points to the rule that binds the consumer. The rules themselves stand in §20 and in the sections named; this section adds none.

**What Cutdown removes.** Cutdown has no raw-HTML channel: `<` has no role in the language (§B lists every character that has one), so `<script>` in a document is eight characters of text, and markup cannot carry a tag, a script, or a style into the output. The parser is total, deterministic, and linear in its input, and it performs no I/O (§20.2): parsing a hostile document can neither fail nor reach outside the string it was given.

**What remains.** A document still carries data that a consumer may turn into something active: link targets, attribute keys and values, paths, URLs, metadata, and the documents it injects. Each is listed below with the guarantee the parser gives and the check the consumer owes. The list is closed: a consumer that applies the clauses named here has handled every channel the language defines.

### 21.1 Link schemes

`Link.href` keeps any scheme as written (§5.5): `javascript:`, `data:`, `vbscript:`, `file:`. The parser cannot judge a scheme — `javascript:` runs in an HTML page and is ink in a printed book — so it filters none.

A consumer that renders to a medium where a link can run code checks every `href` against a scheme allowlist and renders a link that fails as its text alone (§20.4 clause 7). An allowlist, not a denylist: new dangerous schemes appear, and a denylist does not learn them. A starting list for HTML is `https`, `http`, `mailto`, and `tel`; Cutdown does not mandate it.

Only literal `https://` opens an `EmbedBlock` (§4.9) or an `EmbedImageInline` (§5.9.1). That is a recognition rule, not a safety guarantee: the host behind the URL may still be hostile, track the reader, or be an internal address (§21.7).

### 21.2 Attribute keys and ids

Any `ATTR_KEY` is accepted (§6.1.1): `{onclick="…"}`, `{style="…"}`, `{srcdoc=…}`, `{href=…}`, `{formaction=…}`. Attributes are hints, not HTML (§6.1.1); a renderer that copies them into HTML unchanged hands the author every event handler and every URL-bearing attribute.

A consumer that maps attributes onto an active medium maps each key through an allowlist and drops the rest (§20.4 clause 8). The families above — `on*` handlers, `style`, keys that hold a URL, `srcdoc` — are examples of what an allowlist leaves out, not a list to block.

An id becomes a name in the host page. `{#location}` or `{#cookie}` written as HTML `id`s can shadow `window.location` or `document.cookie` in scripts that read named elements (DOM clobbering). A consumer SHOULD give ids a prefix of its own, as `user-content-` does in common renderers (§20.4 clause 8).

### 21.3 JSON attribute values

A JSON value reaches the AST parsed (§6.1.1), and it is I-JSON [RFC7493], so every parser reads the same names, numbers, and strings. Object names are data: `__proto__`, `constructor`, and `prototype` are ordinary keys, and a parser that builds the value with `obj[key] = value` in JavaScript loses the `__proto__` key and fails the corpus.

The risk moves to the consumer that merges a value into its own objects. A deep merge in JavaScript that follows `__proto__` changes `Object.prototype` for the whole program (prototype pollution). §20.4 clause 9 forbids letting a name change object structure: use maps with no prototype, or skip those names.

### 21.4 Bidi controls and look-alike characters

The bidi controls (§1.4) — U+202A–U+202E, U+2066–U+2069, and the marks U+061C, U+200E, U+200F — change the order in which text is displayed without changing the text (CVE-2021-42574, "Trojan Source"). Inside a name they make one target look like another. Ids, tag levels, and paths therefore exclude them (§1.4, §2.1, §8.5): a target that holds one is invalid, keeps the text as written, and resolves to nothing. In prose they remain ordinary characters, because mixed-direction text needs them.

Look-alike letters cannot be excluded by grammar: the Cyrillic `а` and the Latin `a` are both letters, and both are valid in an id or a path. A consumer that shows a target to a reader — a status bar, a link preview, a file name — SHOULD show it in a way that exposes mixed scripts and confusable characters ([UTS39], §20.4 clause 13).

### 21.5 Paths handed to storage

The parser guarantees a lexically safe `path` (§8.4, §8.5): normalized, `.` and `..` resolved, never above the root, no empty segment, no control or bidi character, NFC, and `/` as its only separator. It cannot know how a consumer maps that string to storage, and every classic traversal bypass lives in the mapping:

- **Decoding after the check.** Cutdown decodes nothing, so `%2e%2e` is four characters of a name. A resolver that percent-decodes it reopens `..`.
- **Other separators.** `a\\b` holds a literal `\`, a separator on Windows; `C:` and `file.txt:stream` name a drive and a stream there; `CON` and `NUL` are devices.
- **Links.** A symbolic link inside the root may point outside it.
- **Case folding.** On a case-insensitive file system two Cutdown paths name one file, although Cutdown counts them as two (§8.4).

A consumer that maps a path to storage treats it as `/`-separated segments under its root, reinterprets no character as a separator, and confirms that the resolved resource lies inside the root after the storage's own resolution (§20.4 clause 10). The same holds for every path the consumer meets: `FileBlock`, `InjectBlock`, `ImageInline`, and page and wiki links.

### 21.6 Resource exhaustion

Every structure that could grow without bound in a way that costs more than its input has a fixed limit, and every parser stops at the same point (§20.6): block depth 32, `Mark` depth 8, 32 entries and 32 classes per attribute group, 32 query pairs, JSON 4096 characters and depth 8. Inline depth is bounded by the grammar at 28. A conforming parser runs in time and memory linear in its input (§20.2 clause 7), so quadratic inputs — long runs of unclosed openers, deep brackets, many `##` cuts — cost no more than any other text.

The language does not bound document size: that is a policy each host sets. A host SHOULD bound its input before it calls the parser. Rows, columns, cells, blocks, and comments grow with the document and are bounded through it.

### 21.7 Fetching on render

An `EmbedBlock`, an `EmbedImageInline`, and an `ImageInline` name something a consumer may fetch. Fetching has two costs:

- **Reader privacy.** When the reader's client fetches an author-chosen URL, the author's server learns the reader's address, the time, and the referring page — the tracking pixel of e-mail. A consumer that makes a reader's client fetch SHOULD let the reader or the host control it: click to load, or a proxy (§20.4 clause 12).
- **Server-side request forgery.** A renderer that fetches on its own network — an oEmbed lookup, a thumbnail, a link preview — can be pointed at `https://169.254.169.254/…`, `https://localhost/…`, or `https://10.0.0.5/`. Requiring `https://` does not help: internal hosts serve TLS, and a public name can resolve to a private address. Such a consumer SHOULD refuse destinations that resolve to non-public addresses, checked on the resolved address of every connection, redirects included (§20.4 clause 12).

### 21.8 Hidden is not removed

`##` comments, CommentBlocks (§7), and spoilers (§5.12, §4.15) are hidden by presentation only. Comments are in the AST, in `reflections`, and in the source; spoiler text is in the AST and in any HTML a renderer emits. None of them is access control:

- publishing a `.cutdown` file publishes its comments;
- an application that sends the AST to a browser and hides comments in its interface still sends them;
- `^^password^^` is a spoiler, not a secret.

A consumer that sends the AST or the source to a reader SHOULD first clear every `reflections` field, unless the author asked to keep them (§20.4 clause 6). Clearing them gives exactly the AST of the same document without comments (§7.3). Content that must not reach a reader must not be in the document.

### 21.9 Meta payloads

The parser keeps a `Meta` body as a raw string (§4.3) and never parses it. The consumer's loader is the attack surface:

- **Object construction.** YAML tags such as `!!python/object/apply` build arbitrary objects in loaders that allow them, which is code execution.
- **Alias expansion.** YAML anchors and aliases can expand a few lines into gigabytes ("billion laughs").
- **Schema drift.** YAML 1.1 reads `no` as `false` and `010` as octal; YAML 1.2 reads them as a string and `10`. Two consumers read different metadata from one document.

§20.4 clause 11 fixes the reading: YAML 1.2 with the core schema and no custom tags, I-JSON, TOML 1.0.0. A loader that follows it builds plain data only. A YAML loader SHOULD still bound alias expansion.

### 21.10 Interpolation

`{{key}}` stays verbatim in `href`, paths, URLs, and attribute strings (§5.11.1), and the consumer substitutes it. The order of substitution and checking decides whether the checks above mean anything:

- `[x]({{next}})` with `next` set to `javascript:alert(1)` passes a scheme check made before substitution;
- `/img/{{name}}.png` with `name` set to `../../secret` reopens the traversal that the parser's path rules closed.

A consumer that substitutes runs its scheme, key, and path checks on the substituted value, and never parses a substituted value as Cutdown (§20.4 clause 1). A host page that injects a document with `?key=value` (§9.4) supplies values to another author's document: the injected document should treat them as untrusted input.

### 21.11 Injection

The parser never reads a file: every `InjectBlock` it emits has `children: []` (§20.2). A consumer that fills them takes on three risks:

- **Cycles.** `a` injects `b` and `b` injects `a`; expansion never ends.
- **Amplification.** Ten files that each inject the same folder twice grow to thousands of documents within three levels — the alias bomb again, with files.
- **Reading outside the root.** The path rules of §21.5 apply to every `InjectBlock.src`.

A consumer that fills `InjectBlock`s stops on a cycle — the repeated `InjectBlock` stays unresolved, with `children: []` — and bounds the total expansion (§20.4 clause 2). The numbers are its own, as is how it reports reaching them (§9.6).
