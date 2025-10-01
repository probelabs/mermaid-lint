import { tokenize } from '../diagrams/flowchart/lexer.js';
import { parserInstance } from '../diagrams/flowchart/parser.js';
import { GraphBuilder } from './graph-builder.js';
import { LayoutEngine } from './layout.js';
import { SVGGenerator } from './svg-generator.js';
import type { Graph } from './types.js';
import type { ValidationError } from '../core/types.js';

export interface RenderOptions {
  /** Include validation errors as overlays on the diagram */
  showErrors?: boolean;
  /** Custom width for the SVG */
  width?: number;
  /** Custom height for the SVG */
  height?: number;
}

export interface RenderResult {
  svg: string;
  graph: Graph;
  errors: ValidationError[];
}

/**
 * Main renderer class that orchestrates the rendering pipeline
 */
export class MermaidRenderer {
  private graphBuilder: GraphBuilder;
  private layoutEngine: LayoutEngine;
  private svgGenerator: SVGGenerator;

  constructor() {
    this.graphBuilder = new GraphBuilder();
    this.layoutEngine = new LayoutEngine();
    this.svgGenerator = new SVGGenerator();
  }

  /**
   * Renders a Mermaid flowchart diagram to SVG
   */
  render(text: string, options: RenderOptions = {}): RenderResult {
    const errors: ValidationError[] = [];

    try {
      // Step 1: Tokenize
      const lexResult = tokenize(text);

      // Check for lexer errors
      if (lexResult.errors && lexResult.errors.length > 0) {
        for (const error of lexResult.errors) {
          errors.push({
            line: error.line || 1,
            column: error.column || 1,
            message: error.message,
            severity: 'error',
            code: 'LEXER_ERROR'
          });
        }
      }

      // Step 2: Parse
      parserInstance.reset(); // Clear any previous state
      parserInstance.input = lexResult.tokens;
      const cst = parserInstance.diagram();

      // Check for parser errors
      if (parserInstance.errors && parserInstance.errors.length > 0) {
        for (const error of parserInstance.errors) {
          const token = error.token;
          errors.push({
            line: token?.startLine || 1,
            column: token?.startColumn || 1,
            message: error.message,
            severity: 'error',
            code: 'PARSER_ERROR'
          });
        }
      }

      // Step 3: Build graph model
      const graph = this.graphBuilder.build(cst);

      // Step 4: Calculate layout
      let layout;
      try {
        layout = this.layoutEngine.layout(graph);
      } catch (layoutError: any) {
        // Layout failed - likely due to subgraph issues
        errors.push({
          line: 1,
          column: 1,
          message: layoutError.message || 'Layout calculation failed',
          severity: 'error',
          code: 'LAYOUT_ERROR'
        });

        // Return empty SVG with error
        return {
          svg: this.generateErrorSvg(layoutError.message || 'Layout calculation failed'),
          graph,
          errors
        };
      }

      // Step 5: Generate SVG
      let svg = this.svgGenerator.generate(layout);

      // Add error overlays if requested
      if (options.showErrors && errors.length > 0) {
        svg = this.addErrorOverlays(svg, errors);
      }

      return {
        svg,
        graph,
        errors
      };
    } catch (error: any) {
      // Fallback error SVG
      const errorSvg = this.generateErrorSvg(error.message || 'Unknown error occurred');

      errors.push({
        line: 1,
        column: 1,
        message: error.message || 'Unknown error occurred',
        severity: 'error',
        code: 'RENDER_ERROR'
      });

      return {
        svg: errorSvg,
        graph: { nodes: [], edges: [], direction: 'TD' },
        errors
      };
    }
  }

  /**
   * Renders only supported diagram types (for now just flowchart)
   */
  renderAny(text: string, options: RenderOptions = {}): RenderResult {
    // Detect diagram type
    const firstLine = text.trim().split('\n')[0];

    if (firstLine.match(/^(flowchart|graph)\s+/i)) {
      return this.render(text, options);
    }

    // Unsupported diagram type
    const errorSvg = this.generateErrorSvg('Unsupported diagram type. Currently only flowchart diagrams are supported for rendering.');

    return {
      svg: errorSvg,
      graph: { nodes: [], edges: [], direction: 'TD' },
      errors: [{
        line: 1,
        column: 1,
        message: 'Unsupported diagram type',
        severity: 'error',
        code: 'UNSUPPORTED_TYPE'
      }]
    };
  }

  private addErrorOverlays(svg: string, errors: ValidationError[]): string {
    // Simple error indicator - add a red border and error count
    const errorStyle = `
    <style>
      .error-indicator {
        fill: #ff0000;
        opacity: 0.8;
      }
      .error-text {
        fill: white;
        font-family: Arial, sans-serif;
        font-size: 12px;
        font-weight: bold;
      }
    </style>`;

    const errorIndicator = `
    <g id="errors">
      <rect x="5" y="5" width="100" height="25" rx="3" class="error-indicator" />
      <text x="55" y="20" text-anchor="middle" class="error-text">${errors.length} error${errors.length !== 1 ? 's' : ''}</text>
    </g>`;

    // Insert before closing </svg> tag
    return svg.replace('</svg>', `${errorStyle}${errorIndicator}</svg>`);
  }

  private generateErrorSvg(message: string): string {
    const width = 400;
    const height = 200;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#fee" stroke="#c00" stroke-width="2" />
  <text x="${width/2}" y="${height/2 - 20}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#c00">
    Render Error
  </text>
  <text x="${width/2}" y="${height/2 + 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">
    ${this.wrapText(message, 40).map((line, i) =>
      `<tspan x="${width/2}" dy="${i === 0 ? 0 : 15}">${this.escapeXml(line)}</tspan>`
    ).join('')}
  </text>
</svg>`;
  }

  private wrapText(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 3); // Limit to 3 lines
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Export main render function for convenience
export function renderMermaid(text: string, options: RenderOptions = {}): RenderResult {
  const renderer = new MermaidRenderer();
  return renderer.renderAny(text, options);
}