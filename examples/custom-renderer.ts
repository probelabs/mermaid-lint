/**
 * Example demonstrating the pluggable renderer architecture
 *
 * This file shows how to:
 * 1. Use the built-in renderers with custom options
 * 2. Implement a custom renderer (DOT format)
 * 3. Implement a custom layout engine
 */

import { renderMermaid, DotRenderer, type ILayoutEngine, type IRenderer } from '../src/renderer/index.js';
import type { Graph, Layout } from '../src/renderer/types.js';

// Example diagram
const diagram = `
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do Something]
    B -->|No| D[Do Something Else]
    C --> E[End]
    D --> E
`;

// ============================================================================
// Example 1: Using default SVG renderer
// ============================================================================
console.log('Example 1: Default SVG renderer');
console.log('='.repeat(50));

const svgResult = renderMermaid(diagram);
if (svgResult.errors.length === 0) {
  console.log('✓ SVG generated successfully');
  console.log(`  Output length: ${svgResult.svg.length} bytes`);
} else {
  console.error('✗ Errors:', svgResult.errors);
}
console.log();

// ============================================================================
// Example 2: Using DOT renderer
// ============================================================================
console.log('Example 2: DOT renderer (Graphviz)');
console.log('='.repeat(50));

const dotResult = renderMermaid(diagram, {
  renderer: new DotRenderer()
});

if (dotResult.errors.length === 0) {
  console.log('✓ DOT format generated successfully');
  console.log('Output:');
  console.log(dotResult.svg); // Note: 'svg' field contains DOT format when using DotRenderer
} else {
  console.error('✗ Errors:', dotResult.errors);
}
console.log();

// ============================================================================
// Example 3: Custom JSON renderer
// ============================================================================
console.log('Example 3: Custom JSON renderer');
console.log('='.repeat(50));

class JsonRenderer implements IRenderer {
  render(layout: Layout): string {
    return JSON.stringify({
      dimensions: {
        width: layout.width,
        height: layout.height
      },
      nodes: layout.nodes.map(n => ({
        id: n.id,
        label: n.label,
        shape: n.shape,
        position: { x: n.x, y: n.y },
        size: { width: n.width, height: n.height }
      })),
      edges: layout.edges.map(e => ({
        from: e.source,
        to: e.target,
        label: e.label,
        type: e.type,
        path: e.points
      }))
    }, null, 2);
  }
}

const jsonResult = renderMermaid(diagram, {
  renderer: new JsonRenderer()
});

if (jsonResult.errors.length === 0) {
  console.log('✓ JSON generated successfully');
  console.log('Output:');
  console.log(jsonResult.svg); // Note: 'svg' field contains JSON when using JsonRenderer
} else {
  console.error('✗ Errors:', jsonResult.errors);
}
console.log();

// ============================================================================
// Example 4: Custom layout engine with fixed positioning
// ============================================================================
console.log('Example 4: Custom layout engine (grid layout)');
console.log('='.repeat(50));

class GridLayoutEngine implements ILayoutEngine {
  layout(graph: Graph): Layout {
    const nodeWidth = 150;
    const nodeHeight = 60;
    const cellWidth = 200;
    const cellHeight = 100;

    // Simple grid layout - arrange nodes in a grid
    const layoutNodes = graph.nodes.map((node, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);

      return {
        ...node,
        x: col * cellWidth + 20,
        y: row * cellHeight + 20,
        width: nodeWidth,
        height: nodeHeight
      };
    });

    // Simple straight-line edges
    const layoutEdges = graph.edges.map(edge => {
      const sourceNode = layoutNodes.find(n => n.id === edge.source)!;
      const targetNode = layoutNodes.find(n => n.id === edge.target)!;

      return {
        ...edge,
        points: [
          {
            x: sourceNode.x + sourceNode.width / 2,
            y: sourceNode.y + sourceNode.height
          },
          {
            x: targetNode.x + targetNode.width / 2,
            y: targetNode.y
          }
        ]
      };
    });

    const maxX = Math.max(...layoutNodes.map(n => n.x + n.width));
    const maxY = Math.max(...layoutNodes.map(n => n.y + n.height));

    return {
      nodes: layoutNodes,
      edges: layoutEdges,
      width: maxX + 40,
      height: maxY + 40
    };
  }
}

const gridResult = renderMermaid(diagram, {
  layoutEngine: new GridLayoutEngine()
});

if (gridResult.errors.length === 0) {
  console.log('✓ Grid layout SVG generated successfully');
  console.log(`  Output length: ${gridResult.svg.length} bytes`);
  console.log(`  Graph has ${gridResult.graph.nodes.length} nodes and ${gridResult.graph.edges.length} edges`);
} else {
  console.error('✗ Errors:', gridResult.errors);
}
console.log();

// ============================================================================
// Example 5: Combining custom layout + custom renderer
// ============================================================================
console.log('Example 5: Custom layout + JSON renderer');
console.log('='.repeat(50));

const customResult = renderMermaid(diagram, {
  layoutEngine: new GridLayoutEngine(),
  renderer: new JsonRenderer()
});

if (customResult.errors.length === 0) {
  console.log('✓ Custom layout + JSON generated successfully');
  const parsed = JSON.parse(customResult.svg);
  console.log(`  Dimensions: ${parsed.dimensions.width}x${parsed.dimensions.height}`);
  console.log(`  Nodes: ${parsed.nodes.length}`);
  console.log(`  Edges: ${parsed.edges.length}`);
} else {
  console.error('✗ Errors:', customResult.errors);
}
console.log();

console.log('='.repeat(50));
console.log('All examples completed!');
