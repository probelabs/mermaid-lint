# Maid Browser API Usage

This document describes how to use Maid in the browser, including the Mermaid.js-compatible API.

## Installation

### Via CDN (recommended for quick prototyping)

```html
<script type="module">
  import { validate, fixText, createMermaidAPI } from 'https://unpkg.com/@probelabs/maid/site/maid/maid.bundle.js';
</script>
```

### Via NPM + Bundler

```bash
npm install @probelabs/maid
```

Then in your code:

```javascript
import { validate, fixText, createMermaidAPI } from '@probelabs/maid';
```

## Mermaid.js-Compatible API (Drop-in Replacement)

Maid provides a **drop-in replacement** for Mermaid.js that uses Maid's built-in renderer instead of the official Mermaid renderer. This means:

- ✅ **No Puppeteer or browser dependencies** required
- ✅ **Smaller bundle size** (~350KB vs 1.7GB with mermaid-cli)
- ✅ **Same API** as Mermaid.js's `mermaid.render()`
- ✅ **Works offline** - no external CDN required

### Basic Usage

```javascript
import { createMermaidAPI } from '@probelabs/maid';

// Create a Mermaid-compatible API instance
const maid = createMermaidAPI();

// Use it exactly like Mermaid.js
const diagramText = `
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
`;

// Async render (compatible with mermaid.render())
const { svg } = await maid.render('diagram-id', diagramText);
document.getElementById('output').innerHTML = svg;

// Or use synchronous render
const { svg: svgSync } = maid.renderSync('diagram-id', diagramText);
```

### Switching from Mermaid.js to Maid

If you're already using Mermaid.js, you can switch to Maid with minimal changes:

**Before (with Mermaid.js):**
```javascript
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'default' });

const { svg } = await mermaid.render('uniqueId', diagramText);
document.getElementById('output').innerHTML = svg;
```

**After (with Maid):**
```javascript
import { createMermaidAPI } from '@probelabs/maid';

const maid = createMermaidAPI();
// No need for initialize() - it's a no-op in Maid

const { svg } = await maid.render('uniqueId', diagramText);
document.getElementById('output').innerHTML = svg;
```

### Toggle Between Renderers

You can dynamically switch between Mermaid.js and Maid's renderer:

```javascript
import { createMermaidAPI } from '@probelabs/maid';
import mermaid from 'mermaid';

const maidRenderer = createMermaidAPI();
mermaid.initialize({ startOnLoad: false });

// Choose renderer based on user preference or feature flags
const useMaidRenderer = true; // or read from checkbox/config
const renderer = useMaidRenderer ? maidRenderer : mermaid;

const { svg } = await renderer.render('id', diagramText);
```

## Validation and Auto-fix

Maid's primary purpose is validation and auto-fixing. Here's how to use these features:

### Validation

```javascript
import { validate } from '@probelabs/maid';

const result = validate(diagramText);

if (result.errors.length === 0) {
  console.log('✅ Valid diagram!');
} else {
  console.log('❌ Found errors:');
  result.errors.forEach(error => {
    console.log(`  Line ${error.line}:${error.column} - ${error.message}`);
  });
}
```

### Auto-fix

```javascript
import { fixText } from '@probelabs/maid';

const { fixed, errors } = fixText(diagramText, { level: 'safe' });

if (errors.length === 0) {
  console.log('✨ All errors fixed!');
  console.log(fixed);
} else {
  console.log('⚠️ Some errors remain:', errors);
}
```

### Validation + Rendering

Combine validation and rendering for a complete workflow:

```javascript
import { validate, fixText, createMermaidAPI } from '@probelabs/maid';

const maid = createMermaidAPI();

// 1. Validate
const validationResult = validate(diagramText);

// 2. Auto-fix if needed
let textToRender = diagramText;
if (validationResult.errors.length > 0) {
  const { fixed, errors } = fixText(diagramText, { level: 'all' });
  textToRender = fixed;

  if (errors.length === 0) {
    console.log('✨ Auto-fixed all issues!');
  }
}

// 3. Render
try {
  const { svg } = await maid.render('diagram', textToRender);
  document.getElementById('output').innerHTML = svg;
} catch (error) {
  console.error('Render failed:', error);
}
```

## API Reference

### `createMermaidAPI()`

Creates a Mermaid.js-compatible API instance.

**Returns:** `MermaidAPI`

### `MermaidAPI.render(id, text, options?)`

Renders a Mermaid diagram to SVG (async).

- `id` (string): Unique identifier (required by API but not used internally)
- `text` (string): Mermaid diagram source code
- `options?` (RenderOptions): Optional render options

**Returns:** `Promise<{ svg: string }>`

### `MermaidAPI.renderSync(id, text, options?)`

Renders a Mermaid diagram to SVG (sync).

- `id` (string): Unique identifier
- `text` (string): Mermaid diagram source code
- `options?` (RenderOptions): Optional render options

**Returns:** `{ svg: string }`

### `MermaidAPI.initialize(config?)`

No-op method for Mermaid.js API compatibility. Maid's renderer doesn't require initialization.

### `validate(text, options?)`

Validates a Mermaid diagram.

- `text` (string): Mermaid diagram source code
- `options?` (ValidateOptions): `{ strict?: boolean }`

**Returns:** `{ type: DiagramType; errors: ValidationError[] }`

### `fixText(text, options?)`

Auto-fixes a Mermaid diagram.

- `text` (string): Mermaid diagram source code
- `options?`: `{ level?: 'safe' | 'all'; strict?: boolean }`

**Returns:** `{ fixed: string; errors: ValidationError[] }`

## Supported Diagram Types

Maid's renderer currently supports:

- ✅ **Flowcharts** (`flowchart`, `graph`)
- ✅ **Pie charts** (`pie`)
- 🚧 Sequence diagrams (validation only, rendering coming soon)
- 🚧 Class diagrams (validation only)
- 🚧 State diagrams (validation only)

For unsupported diagram types, the renderer will return an error SVG with a clear message.

## Live Demo

Visit [https://probelabs.com/maid/demo.html](https://probelabs.com/maid/demo.html) to see Maid in action!

The demo includes:
- ✅ Side-by-side comparison with standard Mermaid.js
- ✅ Toggle between Maid's renderer and Mermaid.js
- ✅ Live validation and auto-fixing
- ✅ Example diagrams with common errors

## Browser Compatibility

Maid's browser bundle is compatible with modern browsers that support ES2020:

- ✅ Chrome 80+
- ✅ Firefox 72+
- ✅ Safari 13.1+
- ✅ Edge 80+

## Bundle Size

- **Maid browser bundle**: ~350KB minified
- **Mermaid.js**: ~400KB (CDN) or 1.7GB (with mermaid-cli + Puppeteer)

## FAQ

### Q: Can I use this as a complete replacement for Mermaid.js?

**A:** For flowcharts and pie charts, yes! For other diagram types, the renderer is still experimental. You can use Maid for validation/auto-fixing and fall back to Mermaid.js for rendering unsupported types.

### Q: Does this work offline?

**A:** Yes! Maid's renderer has no external dependencies and works completely offline.

### Q: Is the rendered output identical to Mermaid.js?

**A:** Not pixel-perfect, but very close. Maid's renderer aims for functional parity, not visual parity. Some styling differences may exist.

### Q: Can I customize the theme?

**A:** Yes! Maid supports Mermaid frontmatter with `themeVariables`. See the [Mermaid theming docs](https://mermaid.js.org/config/theming.html) for details.

## Learn More

- 📚 [Full Documentation](https://github.com/probelabs/maid#readme)
- 🐛 [Report Issues](https://github.com/probelabs/maid/issues)
- 💬 [Discussions](https://github.com/probelabs/maid/discussions)

---

Built with ❤️ by [Probe Labs](https://probelabs.com)
