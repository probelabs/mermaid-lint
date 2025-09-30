# Maid Browser Demo

This directory contains a browser-based demo of Maid's validation and auto-fixing capabilities.

## Files

- `demo.html` - Interactive browser demo with live validation, auto-fixing, and diagram rendering
- `index.html` - Marketing landing page
- `maid.bundle.js` - Browser-compatible bundle of Maid (generated)

## Building

To rebuild the browser bundle:

```bash
npm run build:browser
```

## Running Locally

Serve the files with any static HTTP server:

```bash
# Using Python
cd site/maid
python3 -m http.server 8080

# Using Node.js
npx serve

# Using PHP
php -S localhost:8080
```

Then open `http://localhost:8080/demo.html` in your browser.

## Features

The demo page uses a 2x2 grid layout:

**Top Row:**
- **Left**: Input textarea for your Mermaid diagram
- **Right**: Rendered diagram (with Maid fixes applied)

**Bottom Row:**
- **Left**: Standard Mermaid.js output (cryptic errors, no validation)
- **Right**: Maid ✨ validation results (detailed errors, auto-fixed)

### Key Features:
- **Auto-Validation & Auto-Fix**: Validates and fixes as you type (1 second debounce)
  - Automatically updates the textarea with fixed code
  - Shows before/after comparison in real-time
- **Visual Rendering**: Top-right panel always shows the rendered diagram with Maid's fixes
- **Clear Comparison**: See Standard Mermaid.js errors vs Maid's detailed validation side-by-side
- **Example Diagrams**: 8 realistic error cases from test fixtures:
  - Flowchart: Invalid arrows, mismatched/unclosed brackets, unquoted labels with quotes
  - Sequence: Missing colons, unmatched end blocks
  - Pie: Missing colons, unclosed quotes
- **Zero Configuration**: No buttons, no toggles - just type and see the comparison

## How It Works

The demo uses:
1. **Maid Bundle** (`maid.bundle.js`) - Bundled with esbuild for browser use
2. **Mermaid.js** (CDN) - For rendering validated/fixed diagrams
3. **Pure ESM** - All modern JavaScript, no build step needed for the HTML
