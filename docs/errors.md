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
  - When: Node shape has empty content, e.g., `[]`, `('')`, `(" ")`.
  - Message: "Empty label inside a shape."
  - Hint: "Write non-empty text inside the brackets, e.g., A[\"Start\"] or A[Start]. If you want no label, omit the brackets and just use A."
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

- FL-LABEL-QUOTE-IN-UNQUOTED
  - When: A double quote appears inside an unquoted label (e.g., within `[...]`).
  - Message: "Double quotes inside an unquoted label are not allowed. Wrap the entire label in quotes or use &quot;."
  - Hint: "Example: A[\"Calls logger.debug(&quot;message&quot;, data)\"]"
  - Example (fixed):
    ```mermaid
    flowchart TD
      A["Calls logger.debug(&quot;message&quot;, data)"] --> B
    ```

Tip: quoting inside labels
- When you need double quotes inside a double‑quoted label, use the HTML entity `&quot;` instead of a backslash.
  - Correct: `A["He said &quot;Hi&quot;"]`
  - Avoid: `A["He said \"Hi\""]` (Mermaid does not support `\"`)

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
- FL-STRICT-LABEL-QUOTES-REQUIRED
  - When: Strict mode is enabled and a node label is not quoted.
  - Message: "Strict mode: Node label must be quoted (use double quotes and &quot; inside)."
  - Hint: "Example: A[\"Label with &quot;quotes&quot; and (parens)\"]"

## Sequence (SE-*)

- SE-HEADER-MISSING
  - When: File does not start with `sequenceDiagram`.
  - Message: "Missing 'sequenceDiagram' header."
  - Hint: "Start with: sequenceDiagram"

- SE-MSG-COLON-MISSING
  - When: A message line lacks a `:` before the message text.
  - Message: "Missing colon after target actor in message."
  - Hint: "Use: A->>B: Message text"

- SE-ARROW-INVALID
  - When: Unknown or malformed arrow token in a message.
  - Message: "Invalid sequence arrow near 'X'."
  - Hint: "Use ->, -->, ->>, -->>, -x, --x, -), --), <<->>, or <<-->>"

- SE-NOTE-MALFORMED
  - When: A note statement is incomplete or missing the colon.
  - Message: "Malformed note: missing colon before the note text." (or generic malformed note)
  - Hint: "Examples: Note right of Alice: Hi | Note over A,B: Hello"

- SE-QUOTE-UNCLOSED
  - When: A participant/actor name or alias starts a quote but does not close it.
  - Message: "Unclosed quote in participant/actor name."
  - Hint: "Close the quote: participant \"Bob\"  or  participant Alice as \"Alias\""

- SE-ELSE-OUTSIDE-ALT
  - When: `else` appears outside an `alt` block.
  - Message: "'else' is only allowed inside 'alt' blocks."
  - Hint: "Use: alt Condition … else … end"

- SE-AND-OUTSIDE-PAR
  - When: `and` appears outside a `par` block.
  - Message: "'and' is only allowed inside 'par' blocks."
  - Hint: "Example: par … and … end (parallel branches)."

- SE-END-WITHOUT-BLOCK
  - When: `end` appears with no open block.
  - Message: "'end' without an open block (alt/opt/loop/par/rect/critical/break/box)."
  - Hint: "Remove this end or start a block above."

- SE-BLOCK-MISSING-END
  - When: A block (`alt`, `opt`, `loop`, `par`, `rect`, `critical`, `break`, or `box`) is not closed with `end`.
  - Message: "Missing 'end' to close a '<block>' block."
  - Hint: "Add 'end' on a new line after the block contents."

- SE-ELSE-IN-CRITICAL
  - When: `else` appears inside a `critical` block (invalid; use `option`).
  - Message: "'else' is not allowed inside a 'critical' block. Use 'option' or close the block with 'end'."
  - Hint: "Replace with: option <label>  Example: option Retry"

- SE-HINT-PAR-BLOCK-SUGGEST (warning)
  - When: The file contains `and` but no `par`.
  - Message: "Found 'and' but no 'par' block in the file."
  - Hint: "Start a parallel section with: par … and … end"

- SE-HINT-ALT-BLOCK-SUGGEST (warning)
  - When: The file contains `else` but no `alt`.
  - Message: "Found 'else' but no 'alt' block in the file."
  - Hint: "Use: alt Condition … else … end"

- SE-AUTONUMBER-MALFORMED
  - When: `autonumber` has an invalid form.
  - Message: "Malformed autonumber statement."
  - Hint: "Use: autonumber | autonumber off | autonumber 10 10"

- SE-AUTONUMBER-NON-NUMERIC
  - When: A non-numeric value is used for start/step (e.g., `autonumber 10 ten`).
  - Message: "Autonumber values must be numbers. Found 'X'."
  - Hint: "Use numbers: autonumber 10 or autonumber 10 10 (start and step)."

- SE-AUTONUMBER-EXTRANEOUS
  - When: Extra tokens appear after `autonumber` on the same line (e.g., a participant declaration).
  - Message: "Unexpected token after 'autonumber'. Put 'autonumber' on its own line."
  - Hint: "Example: autonumber 10 10\nparticipant A"

- SE-CREATE-MALFORMED
  - When: `create` is missing the target or has invalid syntax.
  - Message: "Malformed create statement. Use: create [participant|actor] ID"
  - Hint: "Example: create participant B"

- SE-DESTROY-MALFORMED
  - When: `destroy` is missing the target or has invalid syntax.
  - Message: "After 'destroy', specify 'participant' or 'actor' and a name."
  - Hint: "Examples: destroy participant A  |  destroy actor B"

- SE-DESTROY-MISSING-NAME
  - When: `destroy` ends without a participant/actor name.
  - Message: "Missing name after 'destroy'."
  - Hint: "Use: destroy participant A  or  destroy actor B"

- SE-CREATE-MISSING-NAME
  - When: `create` ends without a participant/actor name.
  - Message: "Missing name after 'create'."
  - Hint: "Use: create participant A  or  create actor B"
