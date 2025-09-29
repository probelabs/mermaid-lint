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
  - Message: "Escaped quotes (\") in node labels are not supported by Mermaid. Use &quot; instead."
  - Hint: "Prefer \"He said &quot;Hi&quot;\"."
  - Example (fixed):
    ```mermaid
    flowchart LR
      A["He said &quot;Hi&quot;"] --> B
    ```

- FL-LABEL-DOUBLE-IN-SINGLE
  - When: A single-quoted label contains an unescaped double quote.
  - Message: "Double quotes inside a single-quoted label are not supported by Mermaid. Replace inner \" with &quot; or use a double-quoted label with &quot;."
  - Hint: "Change to \"She said &quot;Hello&quot;\" or replace inner \" with &quot;."
  - Example (fixed):
    ```mermaid
    flowchart LR
      A["She said &quot;Hello&quot;"] --> B
    ```

- FL-DIR-MISSING
  - When: Diagram header lacks a direction after `flowchart`/`graph`.
  - Message: "Missing direction after diagram header. Use TD, TB, BT, RL, or LR."
  - Hint: "Example: 'flowchart TD' for top-down layout."

- FL-DIR-INVALID
  - When: Invalid direction token (e.g., `flowchart XY`).
  - Message: "Invalid direction 'XY'. Use one of: TD, TB, BT, RL, LR."
  - Hint: "Try 'TD' (top-down) or 'LR' (left-to-right)."

- FL-LINK-MISSING
  - When: Two nodes appear on the same line without a connecting arrow.
  - Message: "Two nodes on one line must be connected with an arrow before 'X'."
  - Hint: "Insert --> between nodes, e.g., A --> B."

- FL-NODE-UNCLOSED-BRACKET
  - When: A node shape opens but is not properly closed (e.g., `[`, `(`, `{`, `[[`, `((`).
  - Message: Clarifies which bracket is unclosed and what to add.
  - Hint: Example-specific (e.g., `A[Label] --> B`).

- FL-NODE-MIXED-BRACKETS
  - When: Opening and closing brackets don't match (e.g., `(text]`).
  - Message: "Mismatched brackets: opened '(' but closed with ']'."
  - Hint: "Close with ')' or change the opening bracket to '['."

- FL-CLASS-MALFORMED
  - When: `class` statement is missing node ids or the class name.
  - Message: "Invalid class statement. Provide node id(s) then a class name."
  - Hint: "Example: class A,B important"

- FL-SUBGRAPH-MISSING-HEADER
  - When: `subgraph` keyword is not followed by an ID or `[Title]`.
  - Message: "Subgraph header is missing. Add an ID or a [Title] after the keyword."
  - Hint: "Example: subgraph API [API Layer]"

- FL-END-WITHOUT-SUBGRAPH
  - When: `end` appears without a matching `subgraph`.
  - Message: "'end' without a matching 'subgraph'."
  - Hint: "Remove this end or add a subgraph above."

## Pie (PI-*)

- PI-LABEL-REQUIRES-QUOTES
  - When: Slice label is missing quotes (single or double).
  - Message: "Slice labels must be quoted (single or double quotes)."
  - Hint: "Example: \"Dogs\" : 10"

- PI-MISSING-COLON
  - When: Missing colon between slice label and number.
  - Message: "Missing colon between slice label and value."
  - Hint: "Use: \"Label\" : 10"

- PI-MISSING-NUMBER
  - When: No numeric value after the colon.
  - Message: "Missing numeric value after colon."
  - Hint: "Use a number like 10 or 42.5"

- PI-QUOTE-UNCLOSED
  - When: A slice label starts with a quote but is not closed.
  - Message: "Unclosed quote in slice label."
  - Hint: "Close the quote: \"Dogs\" : 10"

## General (GEN-*)

- GEN-HEADER-INVALID
  - When: The file does not start with a known Mermaid diagram header.
  - Message: "Diagram must start with \"graph\", \"flowchart\", or \"pie\""
  - Hint: "Start your diagram with e.g. \"flowchart TD\" or \"pie\"."

## Notes

- Codes are stable and intended for CI tooling and editor integrations.
- Hints suggest the most typical fix while preserving Mermaid compatibility.
- Some best-practice advisories (style-only) may be added as warnings under opt-in rule sets in the future.
