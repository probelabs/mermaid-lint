# Mixed Markdown with multiple Mermaid diagrams

Some intro text above the first diagram.

```mermaid
flowchart TD
  A[""] --> B
```

Between diagrams text.

```mermaid
sequenceDiagram
  participant A
  and Also not allowed
  A->B: hi
```

