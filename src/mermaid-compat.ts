/**
 * Mermaid.js-compatible API
 *
 * This module provides a drop-in replacement for Mermaid.js's render API,
 * using Maid's built-in renderer instead of the official Mermaid renderer.
 *
 * Usage:
 * ```js
 * import { createMermaidAPI } from '@probelabs/maid';
 *
 * const maid = createMermaidAPI();
 * const { svg } = await maid.render('uniqueId', diagramText);
 * ```
 */

import { renderMermaid } from './renderer/index.js';
import type { RenderOptions } from './renderer/index.js';

export interface MermaidAPI {
  /**
   * Initialize the Mermaid API (no-op for compatibility)
   * @param config Configuration object (currently ignored)
   */
  initialize(config?: any): void;

  /**
   * Render a Mermaid diagram to SVG
   * @param id Unique identifier for the diagram (required by Mermaid.js API but not used)
   * @param text Mermaid diagram source code
   * @param options Optional render options
   * @returns Promise resolving to { svg: string }
   */
  render(id: string, text: string, options?: RenderOptions): Promise<{ svg: string }>;

  /**
   * Render a Mermaid diagram synchronously
   * @param id Unique identifier for the diagram
   * @param text Mermaid diagram source code
   * @param options Optional render options
   * @returns { svg: string }
   */
  renderSync(id: string, text: string, options?: RenderOptions): { svg: string };
}

/**
 * Creates a Mermaid.js-compatible API instance
 */
export function createMermaidAPI(): MermaidAPI {
  return {
    initialize(_config?: any): void {
      // No-op - Maid renderer doesn't need initialization
    },

    async render(_id: string, text: string, options?: RenderOptions): Promise<{ svg: string }> {
      try {
        const result = renderMermaid(text, options);
        return { svg: result.svg };
      } catch (error: any) {
        throw new Error(`Maid render failed: ${error.message || 'Unknown error'}`);
      }
    },

    renderSync(_id: string, text: string, options?: RenderOptions): { svg: string } {
      try {
        const result = renderMermaid(text, options);
        return { svg: result.svg };
      } catch (error: any) {
        throw new Error(`Maid render failed: ${error.message || 'Unknown error'}`);
      }
    }
  };
}

// Export a default instance for convenience
export const maid = createMermaidAPI();
