# Maid SDK Usage

Programmatic API for validating and fixing Mermaid diagrams.

Works in Node.js ≥ 18 with ES modules (recommended). CommonJS projects can use dynamic `import()`.

## Install

```bash
npm install @probelabs/maid --save-dev
```

## ESM (Node, Bun, or modern bundlers)

```js
import { validate, fixText, extractMermaidBlocks } from '@probelabs/maid';

const src = `flowchart TD\n  A[Start] --> B["End\"?"]\n`;

// Validate a single diagram string
const { type, errors } = validate(src, { strict: false });
if (errors.length) {
  // Apply safe auto-fixes until stable
  const { fixed, errors: after } = fixText(src, { level: 'safe' });
  console.log('fixed diagram:\n' + fixed);
  console.log('remaining issues:', after);
}

// Extract and validate Mermaid blocks from Markdown
const md = '```mermaid\nflowchart TD\nA->B\n```\n';
for (const block of extractMermaidBlocks(md)) {
  const res = validate(block.content);
  console.log(block.startLine, res.errors);
}
```

## CommonJS (dynamic import)

```js
(async () => {
  const { validate, fixText } = await import('@probelabs/maid');
  const res = validate('flowchart TD\nA->B');
  if (res.errors.length) {
    const { fixed } = fixText('flowchart TD\nA->B', { level: 'safe' });
    console.log(fixed);
  }
})();
```

## TypeScript

```ts
import type { ValidationError, FixLevel } from '@probelabs/maid';
import { validate, fixText, detectDiagramType } from '@probelabs/maid';

const text = 'flowchart TD\nA->B';
const { errors } = validate(text, { strict: true });
const { fixed, errors: after } = fixText(text, { level: 'all', strict: true });
console.log(detectDiagramType(fixed));
after.forEach((e: ValidationError) => console.log(e.code, e.message));
```

## Exports

- Validators
  - `validate(text, { strict? })` → `{ type, errors }`
  - `validateFlowchart|validatePie|validateSequence(text, opts)`
  - `detectDiagramType(text)` → `'flowchart' | 'pie' | 'sequence' | 'unknown'`
- Fixes
  - `fixText(text, { level?: 'safe'|'all', strict?: boolean })` → `{ fixed, errors }`
  - `computeFixes(text, errors, level?)` and `applyEdits(text, edits)`
- Markdown utilities
  - `extractMermaidBlocks(text)` and `offsetErrors(errors, startLine)`
- Types
  - `ValidationError`, `ValidateOptions`, `DiagramType`, `FixLevel`, `PositionLC`, `TextEditLC`

Notes
- ESM is the recommended module system. For CommonJS, prefer `await import()` rather than `require()`.
- `strict: true` enforces stricter label quoting rules.
- See docs/errors.md for error codes and autofix matrix.

