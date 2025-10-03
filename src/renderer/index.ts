import { tokenize } from '../diagrams/flowchart/lexer.js';
import { parserInstance } from '../diagrams/flowchart/parser.js';
import { GraphBuilder } from './graph-builder.js';
import { DagreLayoutEngine } from './layout.js';
import { SVGRenderer } from './svg-generator.js';
import type { Graph } from './types.js';
import type { ValidationError } from '../core/types.js';
import type { ILayoutEngine, IRenderer } from './interfaces.js';
import { buildPieModel } from './pie-builder.js';
import { renderPie } from './pie-renderer.js';
import { parseFrontmatter } from '../core/frontmatter.js';

export interface RenderOptions {
  /** Include validation errors as overlays on the diagram */
  showErrors?: boolean;
  /** Custom width for the SVG */
  width?: number;
  /** Custom height for the SVG */
  height?: number;
  /** Custom layout engine (defaults to DagreLayoutEngine) */
  layoutEngine?: ILayoutEngine;
  /** Custom renderer (defaults to SVGRenderer) */
  renderer?: IRenderer;
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
  private layoutEngine: ILayoutEngine;
  private renderer: IRenderer;

  constructor(layoutEngine?: ILayoutEngine, renderer?: IRenderer) {
    this.graphBuilder = new GraphBuilder();
    this.layoutEngine = layoutEngine || new DagreLayoutEngine();
    this.renderer = renderer || new SVGRenderer();
  }

  /**
   * Renders a Mermaid flowchart diagram
   */
  render(text: string, options: RenderOptions = {}): RenderResult {
    const errors: ValidationError[] = [];

    // Use custom engines if provided in options
    const layoutEngine = options.layoutEngine || this.layoutEngine;
    const renderer = options.renderer || this.renderer;

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
        layout = layoutEngine.layout(graph);
      } catch (layoutError: any) {
        // Layout failed - likely due to subgraph issues
        errors.push({
          line: 1,
          column: 1,
          message: layoutError.message || 'Layout calculation failed',
          severity: 'error',
          code: 'LAYOUT_ERROR'
        });

        // Return empty output with error
        return {
          svg: this.generateErrorSvg(layoutError.message || 'Layout calculation failed'),
          graph,
          errors
        };
      }

      // Step 5: Generate output
      let svg = renderer.render(layout);

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
   * Renders supported diagram types (flowchart + pie for now)
   */
  renderAny(text: string, options: RenderOptions = {}): RenderResult {
    // Detect diagram type
    const firstLine = text.trim().split('\n')[0];

    if (firstLine.match(/^(flowchart|graph)\s+/i)) {
      return this.render(text, options);
    }
    if (firstLine.match(/^pie\b/i) || text.trimStart().startsWith('---')) {
      // Render a pie chart via dedicated pipeline (no Dagre layout)
      // Support Mermaid frontmatter (--- ... ---) possibly preceding the pie header
      let body = text;
      let theme: Record<string, string> | undefined;
      let cfg: any | undefined;
      const fm = parseFrontmatter(text);
      if (fm) {
        body = fm.body;
        theme = fm.themeVariables || (fm.config && fm.config.themeVariables) || undefined;
        cfg = fm.config && fm.config.pie ? fm.config.pie : undefined;
      }

      // If after stripping frontmatter the first line is not pie, bail as unsupported
      const bodyFirst = body.trim().split('\n')[0];
      if (!/^pie\b/i.test(bodyFirst)) {
        const errorSvg = this.generateErrorSvg('Unsupported diagram type. Rendering supports flowchart and pie for now.');
        return {
          svg: errorSvg,
          graph: { nodes: [], edges: [], direction: 'TD' },
          errors: [{ line: 1, column: 1, message: 'Unsupported diagram type', severity: 'error', code: 'UNSUPPORTED_TYPE' }]
        };
      }

      const { model, errors } = buildPieModel(body);
      try {
        const svg = renderPie(model, {
          width: options.width,
          height: options.height,
          rimStroke: theme?.pieStrokeColor,
          rimStrokeWidth: theme?.pieOuterStrokeWidth,
        });
        // Inject simple theme variable overrides by string replacement when possible
        const themedSvg = applyPieTheme(svg, theme);
        return { svg: themedSvg, graph: { nodes: [], edges: [], direction: 'TD' }, errors };
      } catch (e: any) {
        const msg = e?.message || 'Pie render error';
        const err = [{ line: 1, column: 1, message: msg, severity: 'error', code: 'PIE_RENDER' } as ValidationError];
        return { svg: this.generateErrorSvg(msg), graph: { nodes: [], edges: [], direction: 'TD' }, errors: err };
      }
    }

    // Unsupported diagram type
    const errorSvg = this.generateErrorSvg('Unsupported diagram type. Rendering supports flowchart and pie for now.');

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

// Apply basic pie theme variables to the generated SVG.
function applyPieTheme(svg: string, theme?: Record<string, any>): string {
  if (!theme) return svg;
  let out = svg;
  // Apply rim styles (outer circle) via CSS when provided
  if (theme.pieOuterStrokeWidth != null) {
    const w = String(theme.pieOuterStrokeWidth);
    // Insert or replace stroke-width on the rim circle tag
    out = out.replace(/(<circle class="pie-rim"[^>]*)(stroke-width="[^"]*" )?/g, (_m, p1) => `${p1}stroke-width="${w}" `);
  }
  if (theme.pieStrokeColor) {
    const c = String(theme.pieStrokeColor);
    out = out.replace(/(<circle class="pie-rim"[^>]*)(stroke="[^"]*" )?/g, (_m, p1) => `${p1}stroke="${c}" `);
  }
  // pieSectionTextColor
  if (theme.pieSectionTextColor) {
    const c = String(theme.pieSectionTextColor);
    // Replace the default style color for labels, and also add fill on <text> nodes
    out = out.replace(/\.slice-label \{[^}]*\}/, (m) => m.replace(/fill:\s*#[0-9A-Fa-f]{3,8}|fill:\s*rgb\([^)]*\)/, `fill: ${c}`));
    out = out.replace(/<text class="slice-label"([^>]*)>/g, `<text class="slice-label"$1 fill="${c}">`);
  }
  // pieTitleTextColor
  if (theme.pieTitleTextColor) {
    const c = String(theme.pieTitleTextColor);
    out = out.replace(/<text class="pie-title"([^>]*)>/g, `<text class="pie-title"$1 fill="${c}">`);
  }
  // pieSectionTextSize
  if (theme.pieSectionTextSize) {
    const size = String(theme.pieSectionTextSize);
    out = out.replace(/<text class="slice-label"([^>]*)>/g, `<text class="slice-label"$1 font-size="${size}">`);
  }
  // pieTitleTextSize
  if (theme.pieTitleTextSize) {
    const size = String(theme.pieTitleTextSize);
    out = out.replace(/<text class="pie-title"([^>]*)>/g, `<text class="pie-title"$1 font-size="${size}">`);
  }
  // pie1..pie12 color overrides: replace fill of path slices in order
  const colors: string[] = [];
  for (let i = 1; i <= 24; i++) {
    const key = 'pie' + i;
    if (theme[key]) colors.push(String(theme[key]));
  }
  if (colors.length) {
    let idx = 0;
    out = out.replace(/<path[^>]*class="pieCircle"[^>]*\sfill="([^"]+)"/g, (_m) => {
      const color = colors[idx] ?? null;
      idx++;
      if (color) return _m.replace(/fill="([^"]+)"/, `fill="${color}"`);
      return _m;
    });
  }
  return out;
}

// Export main render function for convenience
export function renderMermaid(text: string, options: RenderOptions = {}): RenderResult {
  const renderer = new MermaidRenderer(options.layoutEngine, options.renderer);
  return renderer.renderAny(text, options);
}

// Export interfaces and implementations for pluggability
export type { ILayoutEngine, IRenderer } from './interfaces.js';
export type { Graph, Layout, Node, Edge, LayoutNode, LayoutEdge } from './types.js';
export { DagreLayoutEngine } from './layout.js';
export { SVGRenderer } from './svg-generator.js';
export { DotRenderer } from './dot-renderer.js';
