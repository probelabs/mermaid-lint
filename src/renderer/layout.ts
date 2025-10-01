import dagre from 'dagre';
import type { Graph, Layout, LayoutNode, LayoutEdge, Direction } from './types.js';

/**
 * Calculates node and edge positions using dagre layout algorithm
 */
export class LayoutEngine {
  private nodeWidth = 120;
  private nodeHeight = 50;
  private rankSep = 50;     // Vertical spacing between ranks
  private nodeSep = 50;     // Horizontal spacing between nodes
  private edgeSep = 10;     // Spacing between edges

  layout(graph: Graph): Layout {
    // Create dagre graph
    const g = new dagre.graphlib.Graph();

    // Configure graph
    g.setGraph({
      rankdir: this.mapDirection(graph.direction),
      ranksep: this.rankSep,
      nodesep: this.nodeSep,
      edgesep: this.edgeSep,
      marginx: 20,
      marginy: 20
    });

    // Default edge label (needed for dagre)
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes
    for (const node of graph.nodes) {
      const dimensions = this.calculateNodeDimensions(node.label, node.shape);
      g.setNode(node.id, {
        width: dimensions.width,
        height: dimensions.height,
        label: node.label,
        shape: node.shape
      });
    }

    // Add edges
    for (const edge of graph.edges) {
      g.setEdge(edge.source, edge.target, {
        label: edge.label,
        width: edge.label ? edge.label.length * 8 : 0,
        height: edge.label ? 20 : 0
      });
    }

    // Handle subgraphs as compound nodes (if any)
    if (graph.subgraphs && graph.subgraphs.length > 0) {
      g.setGraph({ ...g.graph(), compound: true });

      for (const subgraph of graph.subgraphs) {
        // Add subgraph as a parent node
        g.setNode(subgraph.id, {
          label: subgraph.label || subgraph.id,
          clusterLabelPos: 'top'
        });

        // Set parent relationships
        for (const nodeId of subgraph.nodes) {
          if (g.hasNode(nodeId)) {
            g.setParent(nodeId, subgraph.id);
          }
        }

        // Set subgraph's parent if nested
        if (subgraph.parent && g.hasNode(subgraph.parent)) {
          g.setParent(subgraph.id, subgraph.parent);
        }
      }
    }

    // Run layout
    dagre.layout(g);

    // Extract layout information
    const graphInfo = g.graph();
    const layoutNodes: LayoutNode[] = [];
    const layoutEdges: LayoutEdge[] = [];

    // Process nodes
    for (const node of graph.nodes) {
      const nodeLayout = g.node(node.id);
      if (nodeLayout) {
        layoutNodes.push({
          ...node,
          x: nodeLayout.x - nodeLayout.width / 2,
          y: nodeLayout.y - nodeLayout.height / 2,
          width: nodeLayout.width,
          height: nodeLayout.height
        });
      }
    }

    // Process edges
    for (const edge of graph.edges) {
      const edgeLayout = g.edge(edge.source, edge.target);
      if (edgeLayout && edgeLayout.points) {
        layoutEdges.push({
          ...edge,
          points: edgeLayout.points
        });
      }
    }

    return {
      nodes: layoutNodes,
      edges: layoutEdges,
      width: graphInfo.width || 800,
      height: graphInfo.height || 600
    };
  }

  private mapDirection(direction: Direction): string {
    switch (direction) {
      case 'TB':
      case 'TD':
        return 'TB';
      case 'BT':
        return 'BT';
      case 'LR':
        return 'LR';
      case 'RL':
        return 'RL';
      default:
        return 'TB';
    }
  }

  private calculateNodeDimensions(label: string, shape: string): { width: number; height: number } {
    // Base dimensions on label length
    const charWidth = 8;
    const padding = 20;
    const minWidth = 80;
    const minHeight = 40;

    let width = Math.max(label.length * charWidth + padding * 2, minWidth);
    let height = minHeight;

    // Adjust based on shape
    switch (shape) {
      case 'circle':
        // Make it square for circles
        const size = Math.max(width, height);
        width = size;
        height = size;
        break;

      case 'diamond':
      case 'hexagon':
        // These shapes need more width
        width *= 1.3;
        height *= 1.2;
        break;

      case 'stadium':
        // Stadium needs to be wider
        width *= 1.2;
        break;

      case 'cylinder':
        // Cylinder needs more height for the curved tops
        height *= 1.3;
        break;

      case 'subroutine':
      case 'double':
        // These need extra space for borders
        width += 10;
        height += 10;
        break;

      case 'parallelogram':
      case 'trapezoid':
        // These need extra width for the slanted sides
        width *= 1.3;
        break;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }
}