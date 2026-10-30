## 9. Injection

An `InjectBlock` (§4.17) names another Cutdown document, or a folder of them, to be placed at its position. The parser cannot place it: parsing is a pure function from text to AST and reads no files. The parser emits the `InjectBlock` with `children: []`, and a **consumer** that has access to the files resolves it.

This section fixes what a resolved `InjectBlock` contains, so that two consumers given the same files build the same tree (§20.4). It does not govern how files are found, whether they exist, or what a consumer does when they cannot be read.

### 9.1 Filling `children`

A consumer resolves an `InjectBlock` by parsing the named document with the ordinary Cutdown parser and filling `children`:

1. `children` receives the `children` of every Page of the injected document, concatenated in Page order.
2. The injected document's `meta` values and Page `reflections` are dropped. They never reach the host document: a `before` path names a place in the injected Page, which no longer exists. The `LineReflection` entries on injected blocks stay with their blocks.
3. Page boundaries in the injected document do not split the host Page. The whole injection lives inside the one host Page that holds the `InjectBlock`.

The `InjectBlock` itself stays in the tree. Its `src`, `attributes`, and `reflections` are unchanged.

### 9.2 Section boundary

Sections never cross the edge of `InjectBlock.children`. The sectionization fold (§16.1) runs inside `children` on its own, as it does inside any block container:

- an injected heading opens a Section inside `children`, at the level it was written; levels are not shifted;
- an injected level-1 heading does not close the host's open Sections;
- a host heading after the `InjectBlock` is not affected by Sections inside it.

### 9.3 Scope

Every identifier stays inside the document that defines it. A reference link, a citation, or an `id` written in the injected document is resolved against the injected document only, and one written in the host is resolved against the host only. Two documents may therefore use the same `id` without conflict.

This follows from parsing each document on its own: a `RefDefinition` that exists only in the injected file is invisible to the host, and the reverse.

### 9.4 Fragment and query

The locator's fragment and query carry meaning for an `InjectBlock`:

- **`#id`** — only the Section whose `id` is `id`, with its whole subtree, is placed in `children`. `/guide.cutdown#setup` injects the `setup` Section of `guide.cutdown`.
- **`?key=value`** — each pair binds a variable for the injected document. Inside it, a `Variable` node whose `key` matches, and every interpolation token with that key (§5.11.1), take the bound value. A binding does not pass further down: a document injected by the injected document sees only the bindings on its own `InjectBlock`.

### 9.5 Folders

A `src` whose `path` ends with `/` names a folder. One `InjectBlock` stands for the whole folder:

- the folder's files whose names end with `.cutdown` are injected; subfolders are not entered;
- they are taken in ascending order of file name, compared by Unicode code point;
- each file is filled as §9.1 describes, and the results are concatenated into the one `children` array;
- §9.2 and §9.3 apply to each file as a separate document.

How many blocks a folder yields is known only once it is resolved, so the shape of a resolved tree depends on the consumer's files.

### 9.6 Outside this specification

An `InjectBlock` that a consumer cannot or does not resolve stays in the AST with `children: []`. Everything about resolution itself is the consumer's: locating the root, reading files, refusing paths, and reporting failures. Two duties are fixed: a consumer stops on a cycle and bounds the total expansion (§20.4 clause 2, §21.11); how it detects them, where it sets the bound, and how it reports reaching it are its own. Cutdown defines no diagnostic for any of these.

---
