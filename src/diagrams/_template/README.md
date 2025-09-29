This is a scaffold for adding a new Mermaid diagram validator.

Wire it as follows:

1) Implement a Chevrotain lexer and parser in `lexer.ts` and `parser.ts`.
2) Provide a minimal semantics visitor (optional) in `semantics.ts`.
3) Use the shared pipeline in `validate.ts`:

   - `tokenize(text)` → `{ tokens, errors }`
   - `parse(tokens)` → `{ cst, errors }`
   - `analyze(cst, tokens)` → `ValidationError[]`
   - `mapParserError(err, text)` → `ValidationError` (diagram‑specific mapping)
   - Optional hooks: `postLex`, `postParse`

4) Register header detection + router entry in `src/core/router.ts`.

