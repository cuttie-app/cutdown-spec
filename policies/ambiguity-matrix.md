---
title: Cutdown Ambiguity Matrix
status: Active
scope: Canonical ambiguity cases for inline parsing
policy: Mandatory for every new inline token/change
---

# Cutdown Ambiguity Matrix

## Rules Under Test

- Escapes resolve before token matching.
- Brace-family tie-break uses same priority + longest opener (`{{` before `{`) + left-to-right.
- In `[text][...]` target slot, leading `@` means citation-link classification; mention parser does not run there.
- Invalid openers are emitted as literal text unless a rule says otherwise.

## Canonical Cases

### 1) Escape precedence

Input:

```text
\{{name}}
```

Expected AST:

```text
Paragraph
└── Text("{{name}}")
```

Input:

```text
\@alice
```

Expected AST:

```text
Paragraph
└── Text("@alice")
```

Input:

```text
\[a][@c1]
```

Expected AST:

```text
Paragraph
└── Text("[a][@c1]")
```

### 2) Variable vs attributes

Input:

```text
{{customer}}{.v}
```

Expected AST:

```text
Paragraph
└── Variable(key="customer", attributes={class:["v"]})
```

Input:

```text
{{}}
```

Expected AST:

```text
Paragraph
└── Text("{{}}")
```

Input:

```text
{{name}
```

Expected AST:

```text
Paragraph
└── Text("{{name}")
```

### 3) Citation-link context vs mention

Input:

```text
[paper][@smith2025]
```

Expected AST:

```text
Paragraph
└── Link(kind="cite", text=[Text("paper")], target="@smith2025")
```

Input:

```text
[][@a.b-c_d]
```

Expected AST:

```text
Paragraph
└── Link(kind="cite", text=[], target="@a.b-c_d")
```

Input:

```text
[@smith2025]
```

Expected AST:

```text
Paragraph
└── Text("[@smith2025]")
```

### 4) Mention behavior in normal inline context

Input:

```text
Hey @alice.
```

Expected AST:

```text
Paragraph
├── Text("Hey ")
├── UserLink("alice")
└── Text(".")
```

Input:

```text
email@domain.com
```

Expected AST:

```text
Paragraph
└── Text("email@domain.com")
```

## Change Checklist

For every new inline token:

1. Add at least one escape case.
2. Add at least one opener conflict case.
3. Add at least one malformed/unclosed case.
4. Add one interaction case with each neighboring precedence tier.
5. Add expected AST snapshots.
