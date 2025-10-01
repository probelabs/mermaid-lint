import type { Graph, Layout } from './types.js';

/**
 * Interface for layout engines that calculate node and edge positions
 */
export interface ILayoutEngine {
  /**
   * Calculate layout positions for a graph
   * @param graph The graph to layout
   * @returns Layout with positioned nodes and edges
   */
  layout(graph: Graph): Layout;
}

/**
 * Interface for renderers that generate output from a laid-out graph
 */
export interface IRenderer {
  /**
   * Generate output from a laid-out graph
   * @param layout The positioned graph layout
   * @returns String representation (SVG, DOT, etc.)
   */
  render(layout: Layout): string;
}
