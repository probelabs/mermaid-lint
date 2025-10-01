import type { Layout, LayoutNode, LayoutEdge, NodeShape, ArrowType } from './types.js';

/**
 * Generates SVG from a laid-out graph
 */
export class SVGGenerator {
  private padding = 20;
  private fontSize = 14;
  private fontFamily = 'Arial, sans-serif';

  generate(layout: Layout): string {
    const width = layout.width + this.padding * 2;
    const height = layout.height + this.padding * 2;

    const elements: string[] = [];

    // Add defs for markers (arrowheads)
    elements.push(this.generateDefs());

    // Draw edges first (so they appear behind nodes)
    for (const edge of layout.edges) {
      elements.push(this.generateEdge(edge));
    }

    // Draw nodes
    for (const node of layout.nodes) {
      elements.push(this.generateNode(node));
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${elements.join('\n  ')}
</svg>`;
  }

  private generateDefs(): string {
    return `<defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#333" />
    </marker>
    <marker id="circle-marker" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto" markerUnits="strokeWidth">
      <circle cx="3" cy="3" r="3" fill="#333" />
    </marker>
  </defs>`;
  }

  private generateNode(node: LayoutNode): string {
    const x = node.x + this.padding;
    const y = node.y + this.padding;
    const cx = x + node.width / 2;
    const cy = y + node.height / 2;

    let shape = '';
    const strokeWidth = 2;
    const stroke = '#333';
    const fill = '#fff';

    switch (node.shape) {
      case 'rectangle':
        shape = `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="0" ry="0" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`;
        break;

      case 'round':
        shape = `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="5" ry="5" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`;
        break;

      case 'stadium':
        const radius = node.height / 2;
        shape = `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="${radius}" ry="${radius}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`;
        break;

      case 'circle':
        const r = Math.min(node.width, node.height) / 2;
        shape = `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`;
        break;

      case 'diamond': {
        const points = [
          `${cx},${y}`,                    // top
          `${x + node.width},${cy}`,       // right
          `${cx},${y + node.height}`,      // bottom
          `${x},${cy}`                      // left
        ].join(' ');
        shape = `<polygon points="${points}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`;
        break;
      }

      case 'hexagon': {
        const dx = node.width * 0.25;
        const points = [
          `${x + dx},${y}`,                         // top-left
          `${x + node.width - dx},${y}`,            // top-right
          `${x + node.width},${cy}`,                // right
          `${x + node.width - dx},${y + node.height}`, // bottom-right
          `${x + dx},${y + node.height}`,           // bottom-left
          `${x},${cy}`                               // left
        ].join(' ');
        shape = `<polygon points="${points}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`;
        break;
      }

      case 'parallelogram': {
        const skew = node.width * 0.15;
        const points = [
          `${x + skew},${y}`,                       // top-left
          `${x + node.width},${y}`,                 // top-right
          `${x + node.width - skew},${y + node.height}`, // bottom-right
          `${x},${y + node.height}`                 // bottom-left
        ].join(' ');
        shape = `<polygon points="${points}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`;
        break;
      }

      case 'trapezoid': {
        const inset = node.width * 0.15;
        const points = [
          `${x + inset},${y}`,                      // top-left
          `${x + node.width - inset},${y}`,         // top-right
          `${x + node.width},${y + node.height}`,   // bottom-right
          `${x},${y + node.height}`                 // bottom-left
        ].join(' ');
        shape = `<polygon points="${points}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`;
        break;
      }

      case 'cylinder':
        const ellipseRy = 10;
        shape = `<g>
          <ellipse cx="${cx}" cy="${y + ellipseRy}" rx="${node.width/2}" ry="${ellipseRy}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />
          <rect x="${x}" y="${y + ellipseRy}" width="${node.width}" height="${node.height - ellipseRy * 2}" stroke="none" fill="${fill}" />
          <path d="M${x},${y + ellipseRy} L${x},${y + node.height - ellipseRy} A${node.width/2},${ellipseRy} 0 0,0 ${x + node.width},${y + node.height - ellipseRy} L${x + node.width},${y + ellipseRy}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" />
        </g>`;
        break;

      case 'subroutine':
        const insetX = 5;
        shape = `<g>
          <rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="0" ry="0" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />
          <line x1="${x + insetX}" y1="${y}" x2="${x + insetX}" y2="${y + node.height}" stroke="${stroke}" stroke-width="${strokeWidth}" />
          <line x1="${x + node.width - insetX}" y1="${y}" x2="${x + node.width - insetX}" y2="${y + node.height}" stroke="${stroke}" stroke-width="${strokeWidth}" />
        </g>`;
        break;

      case 'double':
        const gap = 4;
        shape = `<g>
          <rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="0" ry="0" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />
          <rect x="${x + gap}" y="${y + gap}" width="${node.width - gap * 2}" height="${node.height - gap * 2}" rx="0" ry="0" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" />
        </g>`;
        break;

      default:
        shape = `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="0" ry="0" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`;
    }

    // Add text label
    const text = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="${this.fontFamily}" font-size="${this.fontSize}" fill="#333">${this.escapeXml(node.label)}</text>`;

    return `<g id="${node.id}">
    ${shape}
    ${text}
  </g>`;
  }

  private generateEdge(edge: LayoutEdge): string {
    if (!edge.points || edge.points.length < 2) {
      return '';
    }

    // Build path
    const points = edge.points.map(p => ({
      x: p.x + this.padding,
      y: p.y + this.padding
    }));

    let pathData = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathData += ` L${points[i].x},${points[i].y}`;
    }

    // Style based on arrow type
    let strokeDasharray = '';
    let strokeWidth = 2;
    let markerEnd = 'url(#arrow)';

    switch (edge.type) {
      case 'open':
        markerEnd = '';
        break;
      case 'dotted':
        strokeDasharray = '5,5';
        break;
      case 'thick':
        strokeWidth = 3;
        break;
      case 'invisible':
        strokeDasharray = '0,100000';
        markerEnd = '';
        break;
    }

    let edgeElement = `<path d="${pathData}" stroke="#333" stroke-width="${strokeWidth}" fill="none"`;
    if (strokeDasharray) {
      edgeElement += ` stroke-dasharray="${strokeDasharray}"`;
    }
    if (markerEnd) {
      edgeElement += ` marker-end="${markerEnd}"`;
    }
    edgeElement += ' />';

    // Add edge label if present
    if (edge.label) {
      const midPoint = points[Math.floor(points.length / 2)];
      const labelBg = `<rect x="${midPoint.x - 30}" y="${midPoint.y - 10}" width="60" height="20" fill="white" opacity="0.9" rx="3" />`;
      const labelText = `<text x="${midPoint.x}" y="${midPoint.y}" text-anchor="middle" dominant-baseline="middle" font-family="${this.fontFamily}" font-size="${this.fontSize - 2}" fill="#333">${this.escapeXml(edge.label)}</text>`;

      return `<g>
    ${edgeElement}
    ${labelBg}
    ${labelText}
  </g>`;
    }

    return edgeElement;
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