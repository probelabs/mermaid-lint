# Advanced Bundle Optimization Techniques

## Current Status
- **Current size**: 294KB minified (87KB gzipped)
- **Target**: < 200KB minified (< 60KB gzipped)

## 1. Code Splitting & Lazy Loading

### Dynamic Imports for Diagram Types
```typescript
// src/browser-lazy.ts
export async function validateLazy(text: string) {
  const type = detectDiagramType(text);

  switch(type) {
    case 'flowchart':
      const { validateFlowchart } = await import('./diagrams/flowchart/validate.js');
      return validateFlowchart(text);
    case 'sequence':
      const { validateSequence } = await import('./diagrams/sequence/validate.js');
      return validateSequence(text);
    // etc...
  }
}
```

**Savings**: ~30-40KB (load only needed diagram types)

## 2. Replace Heavy Dependencies

### Custom Minimal Layout Engine
Instead of Dagre (97KB), implement a simple hierarchical layout:

```typescript
// src/renderer/simple-layout.ts
export class SimpleLayout {
  // ~500 lines for basic top-down layout
  // Handles 80% of use cases
  layout(nodes: Node[], edges: Edge[]): Layout {
    // Simple grid-based positioning
    // No advanced edge routing
  }
}
```

**Savings**: 97KB → ~10KB (87KB saved)

## 3. Terser Plugin Options

More aggressive minification than esbuild:

```json
{
  "compress": {
    "passes": 3,
    "pure_getters": true,
    "unsafe": true,
    "unsafe_math": true,
    "unsafe_methods": true,
    "unsafe_proto": true,
    "unsafe_regexp": true
  },
  "mangle": {
    "properties": {
      "regex": /^_/
    }
  }
}
```

**Savings**: Additional 5-10% reduction

## 4. Precompiled Regular Expressions

Convert regex patterns to state machines at build time:

```typescript
// Before (runtime regex compilation)
const ARROW_PATTERN = /-->/g;

// After (precompiled)
const ARROW_MATCHER = /* precompiled state machine */;
```

**Savings**: 5-10KB

## 5. String Constant Inlining

Replace repeated strings with constants:

```typescript
// build-time plugin
const stringMap = {
  'error': 0,
  'warning': 1,
  'flowchart': 2
};

// Transforms "error" → 0 throughout code
```

**Savings**: 3-5KB

## 6. Remove Chevrotain Features We Don't Use

Create custom Chevrotain build:

```typescript
// chevrotain-minimal.js
export { CstParser, createToken, Lexer } from 'chevrotain/core';
// Exclude: error recovery, visitor pattern, etc.
```

**Savings**: 30-50KB

## 7. WebAssembly for Parser

Move parsing logic to WASM:

```rust
// parser.rs
#[wasm_bindgen]
pub fn parse_flowchart(input: &str) -> Result<Ast, Error> {
  // Rust parser implementation
}
```

**Savings**: 100KB+ (entire Chevrotain removed)

## 8. Compression Techniques

### Brotli Compression
Better than gzip for static assets:
- Gzip: 87KB
- Brotli: ~75KB (15% better)

### Custom Dictionary Compression
For Mermaid-specific terms:

```javascript
const dictionary = ['flowchart', 'graph', 'node', 'edge', ...];
// Use dictionary-based compression
```

**Savings**: Additional 5-10%

## 9. Production Build Pipeline

```bash
# Full optimization pipeline
npm run build:production
```

```json
{
  "build:production": "node scripts/optimize.js"
}
```

```javascript
// scripts/optimize.js
import { build } from 'esbuild';
import { minify } from 'terser';
import { compress } from 'brotli';

// 1. Bundle with esbuild
// 2. Minify with terser
// 3. Apply custom transforms
// 4. Generate .br and .gz versions
```

## 10. Bundle Analysis & Monitoring

### Size Budget
```json
{
  "bundlesize": [
    {
      "path": "./site/maid/maid.bundle.js",
      "maxSize": "200KB"
    }
  ]
}
```

### Webpack Bundle Analyzer Alternative
```javascript
// analyze.js
import { analyzeMetafile } from 'esbuild';
const result = await analyzeMetafile(metafile);
console.log(result);
```

## 11. Advanced Techniques

### Dead Code Elimination via Pure Annotations
```typescript
/*#__PURE__*/ function sideEffectFree() { }
```

### Const Enums (TypeScript)
```typescript
const enum DiagramType {
  Flowchart = 0,
  Sequence = 1
}
// Compiles to literal numbers
```

### Inline Critical Functions
```typescript
// Mark hot paths for inlining
/*#__INLINE__*/
function criticalPath() { }
```

## 12. CDN Strategy

### External Dependencies
```html
<!-- Load dagre from CDN -->
<script src="https://unpkg.com/dagre@0.8.5/dist/dagre.min.js"></script>
<script type="module">
  import { validate } from './maid-core.js'; // 197KB without dagre
</script>
```

## 13. Compile-Time Optimizations

### Template Literal Precompilation
```typescript
// Build time: convert template literals to concatenation
`Hello ${name}` → "Hello " + name
```

### Constant Folding
```typescript
// Build time evaluation
const SIZE = 1024 * 1024; // → const SIZE = 1048576;
```

## 14. Modern JavaScript Features

### Use Native Features
- Replace lodash with native methods
- Use native `structuredClone()` instead of deep clone libraries
- Use native `crypto.randomUUID()`

## 15. Scope Hoisting

Enable module concatenation:
```javascript
// esbuild automatically does this
// webpack: new ModuleConcatenationPlugin()
```

## Implementation Priority

1. **High Impact, Low Effort** (Do First)
   - Terser minification (5-10% reduction)
   - String constant inlining (3-5KB)
   - Brotli compression (15% better than gzip)

2. **High Impact, Medium Effort**
   - Replace Dagre with simple layout (87KB savings)
   - Code splitting for diagram types (30-40KB)
   - Custom Chevrotain build (30-50KB)

3. **High Impact, High Effort**
   - WebAssembly parser (100KB+ savings)
   - Complete rewrite without Chevrotain

## Expected Final Results

With all optimizations:
- **Current**: 294KB (87KB gzipped)
- **Phase 1**: 200KB (60KB gzipped) - Replace Dagre
- **Phase 2**: 150KB (45KB gzipped) - Custom Chevrotain
- **Phase 3**: 50KB (15KB gzipped) - WASM parser

## Monitoring Bundle Size

```json
// package.json
{
  "scripts": {
    "size": "size-limit",
    "test:size": "npm run build:browser && npm run size"
  },
  "size-limit": [
    {
      "path": "site/maid/maid.bundle.js",
      "limit": "300KB"
    }
  ]
}
```