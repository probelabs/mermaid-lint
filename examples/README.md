# Maid Renderer Examples

This directory contains examples demonstrating Maid's pluggable renderer architecture.

## Examples

### custom-renderer.ts

Demonstrates how to:
- Use the default SVG renderer
- Use the built-in DOT renderer (Graphviz format)
- Implement a custom JSON renderer
- Implement a custom grid layout engine
- Combine custom layout engines with custom renderers

## Running Examples

These examples are TypeScript files for documentation purposes. To use similar patterns in your code:

1. Import the necessary types and implementations:
```typescript
import {
  renderMermaid,
  type ILayoutEngine,
  type IRenderer,
  DagreLayoutEngine,
  SVGRenderer,
  DotRenderer
} from '@probelabs/maid';
```

2. Implement your custom renderer or layout engine:
```typescript
class MyRenderer implements IRenderer {
  render(layout: Layout): string {
    // Your rendering logic
  }
}
```

3. Use it with the render function:
```typescript
const result = renderMermaid(diagramText, {
  renderer: new MyRenderer()
});
```

## Core Concepts

### ILayoutEngine
Responsible for calculating positions of nodes and edges from a graph model.
- Input: `Graph` (nodes, edges, direction)
- Output: `Layout` (positioned nodes with x/y/width/height, edges with point arrays)

### IRenderer
Responsible for generating output from a positioned layout.
- Input: `Layout` (positioned nodes and edges)
- Output: `string` (SVG, DOT, JSON, or any format you want)

### Separation of Concerns

The architecture separates three concerns:
1. **Parsing**: Mermaid text → Graph model (handled by GraphBuilder)
2. **Layout**: Graph model → Positioned layout (pluggable via ILayoutEngine)
3. **Rendering**: Positioned layout → Output format (pluggable via IRenderer)

This design allows you to:
- Use different layout algorithms (hierarchical, force-directed, circular, etc.)
- Generate different output formats (SVG, Canvas, DOT, JSON, etc.)
- Mix and match layouts and renderers as needed

## Use Cases

### Alternative Layout Engines
- Graphviz DOT engine for complex graphs
- D3 force-directed layout for network diagrams
- Circular layout for cycle diagrams
- Custom constraint-based layouts

### Alternative Renderers
- Canvas renderer for better performance
- ASCII art renderer for terminal output
- Graphviz DOT format for further processing
- JSON export for data interchange
- Interactive SVG with event handlers
