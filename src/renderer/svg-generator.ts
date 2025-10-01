import type { Layout, LayoutNode, LayoutEdge, NodeShape, ArrowType } from './types.js';
import type { IRenderer } from './interfaces.js';

/**
 * Generates SVG from a laid-out graph
 */
export class SVGRenderer implements IRenderer {
  private padding = 20;
  private fontSize = 14;
  private fontFamily = 'Arial, sans-serif';
  // Theme: tuned to resemble Mermaid default
  private defaultStroke = '#3f3f3f';
  private defaultFill = '#eef0ff'; // light violet-ish fill
  private arrowStroke = '#555555';
  private arrowMarkerSize = 6; // px

  render(layout: Layout): string {
    const width = layout.width + this.padding * 2;
    const height = layout.height + this.padding * 2;

    const elements: string[] = [];

    // Add defs for markers (arrowheads)
    elements.push(this.generateDefs());

    // Draw subgraphs (cluster boxes) behind edges and nodes
    if ((layout as any).subgraphs && (layout as any).subgraphs.length) {
      const sgs = (layout as any).subgraphs as Array<{id:string;label?:string;x:number;y:number;width:number;height:number;parent?:string}>;
      const order = sgs.slice().sort((a,b) => (a.parent ? 1 : 0) - (b.parent ? 1 : 0));
      const boxes: string[] = [];
      const titles: Array<{depth:number, svg:string}> = [];
      const depthOf = (sg:any) => {
        let d=0; let p=sg.parent; const map = new Map(order.map(o=>[o.id,o]));
        while(p){ d++; p = map.get(p)?.parent; }
        return d;
      };
      for (const sg of order) {
        const x = sg.x + this.padding;
        const y = sg.y + this.padding;
        const w = sg.width;
        const h = sg.height;
        boxes.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" ry="4" fill="#fffbe6" stroke="#cfcf99" stroke-width="1" />`);
        if (sg.label) {
          titles.push({ depth: depthOf(sg), svg: `<text x="${x + w/2}" y="${y + 18}" text-anchor="middle" font-family="${this.fontFamily}" font-size="12" fill="#333">${this.escapeXml(sg.label)}</text>` });
        }
      }
      elements.push(`<g class="subgraph-boxes">${boxes.join('')}</g>`);
      // Draw parent titles on top of children titles
      titles.sort((a,b)=> a.depth - b.depth);
      elements.push(`<g class="subgraph-titles">${titles.map(t=>t.svg).join('')}</g>`);
    }

    // Draw edges first (so they appear behind nodes)
    for (const edge of layout.edges) {
      elements.push(this.generateEdge(edge));
    }

    // Draw nodes
    for (const node of layout.nodes) {
      elements.push(this.generateNode(node));
    }

    // White background rect to match Mermaid output
    const bg = `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${bg}
  ${elements.join('\n  ')}
</svg>`;
  }

  private generateDefs(): string {
    const w = this.arrowMarkerSize;
    const h = this.arrowMarkerSize;
    const refX = Math.max(1, this.arrowMarkerSize - 1);
    const refY = Math.max(1, Math.round(this.arrowMarkerSize / 2));
    return `<defs>
    <marker id="arrow" markerWidth="${w}" markerHeight="${h}" refX="${refX}" refY="${refY}" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,${h} L${w},${refY} z" fill="${this.arrowStroke}" />
    </marker>
    <marker id="circle-marker" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto" markerUnits="strokeWidth">
      <circle cx="3" cy="3" r="3" fill="${this.arrowStroke}" />
    </marker>
  </defs>`;
  }

  private generateNode(node: LayoutNode): string {
    const x = node.x + this.padding;
    const y = node.y + this.padding;
    const cx = x + node.width / 2;
    const cy = y + node.height / 2;

    let shape = '';
    const strokeWidth = (node.style?.strokeWidth ?? 1.5);
    const stroke = (node.style?.stroke ?? this.defaultStroke);
    const fill = (node.style?.fill ?? this.defaultFill);

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

    // Add text label with wrapping
    const text = this.generateWrappedText(node.label, cx, cy, node.width - 20);

    return `<g id="${node.id}">
    ${shape}
    ${text}
  </g>`;
  }

  private generateWrappedText(text: string, x: number, y: number, maxWidth: number): string {
    // Estimate character width (tuned to Mermaid)
    const charWidth = 7; // px per character
    const maxCharsPerLine = Math.floor(maxWidth / charWidth);

    if (maxCharsPerLine <= 0 || text.length <= maxCharsPerLine) {
      // Single line - use dy offset for better vertical centering
      const dyOffset = this.fontSize * 0.35; // Empirical value for vertical centering
      return `<text x="${x}" y="${y + dyOffset}" text-anchor="middle" font-family="${this.fontFamily}" font-size="${this.fontSize}" fill="#333">${this.escapeXml(text)}</text>`;
    }

    // Split text into words
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length > maxCharsPerLine && currentLine) {
        // Current line is full, start new line
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    // Add remaining text
    if (currentLine) {
      lines.push(currentLine);
    }

    // Generate SVG text with tspans for each line
    const lineHeight = 16; // px
    const totalHeight = (lines.length - 1) * lineHeight;
    const startY = y - totalHeight / 2 + this.fontSize * 0.35; // Add dy offset for centering

    const tspans = lines.map((line, i) => {
      const lineY = startY + i * lineHeight;
      // Remove dominant-baseline and use explicit y positioning
      return `<tspan x="${x}" y="${lineY}" text-anchor="middle">${this.escapeXml(line)}</tspan>`;
    }).join('\n    ');

    return `<text font-family="${this.fontFamily}" font-size="${this.fontSize}" fill="#333">
    ${tspans}
  </text>`;
  }

  private generateEdge(edge: LayoutEdge): string {
    if (!edge.points || edge.points.length < 2) {
      return '';
    }

    // Build smoothed path (Catmull-Rom to Bezier) from dagre points
    const points = edge.points.map(p => ({ x: p.x + this.padding, y: p.y + this.padding }));
    // If we will draw an arrowhead, trim the endpoint slightly so the head doesn't overlap the node border
    let pts = points;

    // Style based on arrow type
    let strokeDasharray = '';
    let strokeWidth = 1.5;
    let markerEnd = 'url(#arrow)';

    switch (edge.type) {
      case 'open':
        markerEnd = '';
        break;
      case 'dotted':
        strokeDasharray = '3,3';
        break;
      case 'thick':
        strokeWidth = 3;
        break;
      case 'invisible':
        strokeDasharray = '0,100000';
        markerEnd = '';
        break;
    }

    // Apply endpoint trimming for arrows
    if (markerEnd) {
      const cut = Math.max(4, this.arrowMarkerSize); // pixels to trim
      pts = this.trimPathEnd(points, cut);
    }
    const pathData = this.buildSmoothPath(pts);

    let edgeElement = `<path d="${pathData}" stroke="${this.arrowStroke}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    if (strokeDasharray) {
      edgeElement += ` stroke-dasharray="${strokeDasharray}"`;
    }
    if (markerEnd) {
      edgeElement += ` marker-end="${markerEnd}"`;
    }
    edgeElement += ' />';

    // Add edge label if present
    if (edge.label) {
      const pos = this.pointAtRatio(pts, 0.55);
      const text = this.escapeXml(edge.label);
      const padding = 6;
      const fontSize = this.fontSize - 2;
      const width = Math.max(20, Math.min(200, text.length * 7 + padding * 2));
      const height = 18;
      const x = pos.x - width / 2;
      const y = pos.y - height / 2;
      const labelBg = `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff" fill-opacity="0.65" stroke="#999" stroke-opacity="0.4" stroke-width="1" rx="4" />`;
      const labelText = `<text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle" font-family="${this.fontFamily}" font-size="${fontSize}" fill="#333">${text}</text>`;

      return `<g>
    ${edgeElement}
    ${labelBg}
    ${labelText}
  </g>`;
    }

    return edgeElement;
  }

  // --- helpers ---
  private buildSmoothPath(points: Array<{x:number;y:number}>): string {
    if (points.length === 2) {
      return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
    }
    // Catmull-Rom to Bezier
    const pts = [points[0], ...points, points[points.length - 1]]; // duplicate ends
    let d = `M${pts[1].x},${pts[1].y}`;
    for (let i = 1; i < pts.length - 2; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }
    return d;
  }

  private trimPathEnd(points: Array<{x:number;y:number}>, cut: number): Array<{x:number;y:number}> {
    if (points.length < 2) return points;
    const out = points.slice();
    const a = out[out.length - 2];
    const b = out[out.length - 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    out[out.length - 1] = { x: b.x - nx * cut, y: b.y - ny * cut };
    return out;
  }

  private pointAtRatio(points: Array<{x:number;y:number}>, ratio: number): {x:number;y:number} {
    const clampRatio = Math.max(0, Math.min(1, ratio));
    let total = 0;
    const segs: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i+1].x - points[i].x;
      const dy = points[i+1].y - points[i].y;
      const len = Math.hypot(dx, dy);
      segs.push(len);
      total += len;
    }
    if (total === 0) return points[Math.floor(points.length / 2)];
    let target = total * clampRatio;
    for (let i = 0; i < segs.length; i++) {
      if (target <= segs[i]) {
        const t = segs[i] === 0 ? 0 : target / segs[i];
        return {
          x: points[i].x + (points[i+1].x - points[i].x) * t,
          y: points[i].y + (points[i+1].y - points[i].y) * t,
        };
      }
      target -= segs[i];
    }
    return points[points.length - 1];
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
