# mermaid-lint Error Codes

Clear, actionable diagnostics aligned with mermaid-cli behavior. Each error includes a stable code and an optional hint.

## Flowchart (FL-*)

- FL-ARROW-INVALID
  - When: A single arrow `->` is used in flowcharts.
  - Message: "Invalid arrow syntax: -> (use --> instead)"
  - Hint: "Replace -> with -->, or use -- text --> for inline labels."
  - Example:
    ```mermaid
    flowchart TD
      A -> B
    ```

- FL-NODE-EMPTY
  - When: Node shape has empty content, e.g. `[]`, `('')`, `(" ")`.
  - Message: "Empty node content is not allowed. Add a label inside the shape."
  - Hint: "Put some text inside [], (), {}, etc. For example: A[Start]"
  - Example:
    ```mermaid
    flowchart LR
      A[] --> B
    ```

- FL-LABEL-ESCAPED-QUOTE
  - When: Backslash-escaped quotes appear inside a node label (Mermaid does not support `\"`).
  - Message: "Escaped quotes (\") in node labels are not supported by Mermaid. Use &quot; or switch to single quotes."
  - Hint: "Prefer \"He said &quot;Hi&quot;\" or use single quotes around the label."
  - Example:
    ```mermaid
    flowchart LR
      A["He said \"Hi\""] --> B
    ```

- FL-LABEL-DOUBLE-IN-SINGLE
  - When: A single-quoted label contains an unescaped double quote.
  - Message: "Double quotes inside a single-quoted label are not supported by Mermaid. Use double-quoted label or replace \" with &quot;."
  - Hint: "Change to \"She said \\\"Hello\\\"\" or replace inner \" with &quot;."
  - Example:
    ```mermaid
    flowchart LR
      A['She said "Hello"'] --> B
    ```

## Pie (PI-*)

Currently, pie charts are validated for header and basic syntax via the parser. Mermaid is permissive (e.g., colon is optional, labels may be loosely formatted), so no pie-specific error codes are emitted yet. The infrastructure is ready to add codes if stricter or optional rules are introduced.

## Notes

- Codes are stable and intended for CI tooling and editor integrations.
- Hints suggest the most typical fix while preserving Mermaid compatibility.
- Some best-practice advisories (style-only) may be added as warnings under opt-in rule sets in the future.

