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
    // Compute extra padding when some items (notably subgraph titles) extend above/left of (0,0)
    let minX = Infinity;
    let minY = Infinity;
    for (const n of layout.nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
    }
    if ((layout as any).subgraphs) {
      for (const sg of (layout as any).subgraphs as Array<{x:number;y:number}>) {
        minX = Math.min(minX, sg.x);
        minY = Math.min(minY, sg.y);
      }
    }
    for (const e of layout.edges) {
      if (e.points) for (const p of e.points) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); }
    }
    if (!isFinite(minX)) { minX = 0; }
    if (!isFinite(minY)) { minY = 0; }
    const extraPadX = Math.max(0, -Math.floor(minX) + 1);
    const extraPadY = Math.max(0, -Math.floor(minY) + 1);

    const padX = this.padding + extraPadX;
    const padY = this.padding + extraPadY;

    const width = layout.width + this.padding * 2 + extraPadX;
    const height = layout.height + this.padding * 2 + extraPadY;

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
        const x = sg.x + padX;
        const y = sg.y + padY;
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

    // Build a padded node lookup for geometry intersections
    const nodeMap: Record<string, {x:number;y:number;width:number;height:number;shape:string}> = {};
    for (const n of layout.nodes) {
      nodeMap[n.id] = { x: n.x + padX, y: n.y + padY, width: n.width, height: n.height, shape: (n as any).shape };
    }

    // Draw edges first (so they appear behind nodes)
    for (const edge of layout.edges) {
      elements.push(this.generateEdge(edge, padX, padY, nodeMap));
    }

    // Draw nodes
    for (const node of layout.nodes) {
      elements.push(this.generateNodeWithPad(node, padX, padY));
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
    <marker id="cross-marker" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth">
      <path d="M1,1 L7,7 M7,1 L1,7" stroke="${this.arrowStroke}" stroke-width="1.5" />
    </marker>
  </defs>`;
  }

  private generateNodeWithPad(node: LayoutNode, padX: number, padY: number): string {
    const x = node.x + padX;
    const y = node.y + padY;
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

      case 'trapezoidAlt': {
        const inset = node.width * 0.15;
        const points = [
          `${x},${y}`,                               // top-left (full width)
          `${x + node.width},${y}`,                  // top-right
          `${x + node.width - inset},${y + node.height}`, // bottom-right (narrow)
          `${x + inset},${y + node.height}`          // bottom-left (narrow)
        ].join(' ');
        shape = `<polygon points="${points}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />`;
        break;
      }

      case 'cylinder': {
        // Scale the ellipse vertically based on node size
        const rx = Math.max(8, node.width / 2);
        const ry = Math.max(6, Math.min(node.height * 0.22, node.width * 0.25));
        const topCY = y + ry;
        const botCY = y + node.height - ry;
        const bodyH = Math.max(0, node.height - ry * 2);
        shape = `<g>
          <rect x="${x}" y="${topCY}" width="${node.width}" height="${bodyH}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />
          <ellipse cx="${cx}" cy="${topCY}" rx="${node.width/2}" ry="${ry}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" />
          <path d="M${x},${topCY} L${x},${botCY} A${node.width/2},${ry} 0 0,0 ${x + node.width},${botCY} L${x + node.width},${topCY}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" />
        </g>`;
        break;
      }

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
    // If the label contains basic HTML, use the rich renderer
    if (text.includes('<')) {
      return this.generateRichText(text, x, y, maxWidth);
    }
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
    const lineHeight = 18; // px - add a bit more vertical space
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

  // Basic HTML-aware text renderer supporting <br>, <b>/<strong>, <i>/<em>, <u>
  private generateRichText(html: string, x: number, y: number, maxWidth: number): string {
    // Normalize tag spacing so tokens like "< br / >" become "<br/>"
    html = this.normalizeHtml(html);
    type Seg = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; br?: boolean };
    const segments: Seg[] = [];
    // Normalize <br> variants to a unique token and tokenize tags
    const re = /<\/?(br|b|strong|i|em|u)\s*\/?\s*>/gi;
    let lastIndex = 0;
    const state = { bold: false, italic: false, underline: false };
    const pushText = (t: string) => {
      if (!t) return;
      segments.push({ text: this.htmlDecode(t), bold: state.bold, italic: state.italic, underline: state.underline });
    };
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      // text before tag
      pushText(html.slice(lastIndex, m.index));
      const tag = m[0].toLowerCase();
      const name = m[1].toLowerCase();
      const isClose = tag.startsWith('</');
      if (name === 'br') {
        segments.push({ text: '', br: true });
      } else if (name === 'b' || name === 'strong') {
        state.bold = !isClose ? true : false;
      } else if (name === 'i' || name === 'em') {
        state.italic = !isClose ? true : false;
      } else if (name === 'u') {
        state.underline = !isClose ? true : false;
      }
      lastIndex = re.lastIndex;
    }
    pushText(html.slice(lastIndex));

    // Wrap into lines with forced breaks
    const lines: Seg[][] = [];
    const charWidth = 7;
    const maxCharsPerLine = Math.max(1, Math.floor(maxWidth / charWidth));
    let current: Seg[] = [];
    let currentLen = 0;
    const flush = () => { if (current.length) { lines.push(current); current = []; currentLen = 0; } };
    const splitWords = (s: Seg): Seg[] => {
      if (!s.text) return [s];
      const words = s.text.split(/(\s+)/); // keep spaces
      return words.map(w => ({ ...s, text: w }));
    };

    for (const seg of segments) {
      if (seg.br) { flush(); continue; }
      for (const w of splitWords(seg)) {
        const wlen = w.text.length;
        if (currentLen + wlen > maxCharsPerLine && currentLen > 0) {
          flush();
        }
        current.push(w);
        currentLen += wlen;
      }
    }
    flush();

    // Emit SVG tspans
    const lineHeight = 18; // richer text lines spacing up slightly
    const totalHeight = (lines.length - 1) * lineHeight;
    const startY = y - totalHeight / 2 + this.fontSize * 0.35;
    const tspans: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const lineY = startY + i * lineHeight;
      // Build inline tspans for style changes
      let acc = '';
      let cursorX = x;
      // Use a grouping <tspan> to align the full line by x/y, and nest inline tspans
      const inner: string[] = [];
      let buffer = '';
      let style = { bold: false, italic: false, underline: false };
      const flushInline = () => {
        if (!buffer) return;
        const styleAttr = `${style.bold ? 'font-weight="bold" ' : ''}${style.italic ? 'font-style="italic" ' : ''}${style.underline ? 'text-decoration="underline" ' : ''}`;
        inner.push(`<tspan ${styleAttr}>${this.escapeXml(buffer)}</tspan>`);
        buffer = '';
      };
      for (const w of lines[i]) {
        const wStyle = { bold: !!w.bold, italic: !!w.italic, underline: !!w.underline };
        if (wStyle.bold !== style.bold || wStyle.italic !== style.italic || wStyle.underline !== style.underline) {
          flushInline();
          style = wStyle;
        }
        buffer += w.text;
      }
      flushInline();
      tspans.push(`<tspan x="${x}" y="${lineY}" text-anchor="middle">${inner.join('')}</tspan>`);
    }

    return `<text font-family="${this.fontFamily}" font-size="${this.fontSize}" fill="#333">${tspans.join('\n    ')}</text>`;
  }

  private normalizeHtml(s: string): string {
    // collapse spaces between < and tag name, around '/', and before >
    let out = s.replace(/<\s+/g, '<')
               .replace(/\s+>/g, '>')
               .replace(/<\s*\//g, '</')
               .replace(/\s*\/\s*>/g, '/>')
               .replace(/<\s*(br)\s*>/gi, '<$1/>'); // turn <br> into <br/>
    return out;
  }

  private htmlDecode(s: string): string {
    return s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private generateEdge(edge: LayoutEdge, padX: number, padY: number, nodeMap: Record<string, {x:number;y:number;width:number;height:number;shape:string}>): string {
    if (!edge.points || edge.points.length < 2) {
      return '';
    }

    // Build smoothed path (Catmull-Rom to Bezier) from dagre points
    const points = edge.points.map(p => ({ x: p.x + padX, y: p.y + padY }));
    const segData = this.buildSmoothSegments(points);

    // Style based on arrow type
    let strokeDasharray = '';
    let strokeWidth = 1.5;
    let markerEnd = 'url(#arrow)';
    let markerStart = '';

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

    // Apply endpoint trimming for arrows (trim along Bezier end tangent)
    let finalSegs = segData;
    // Markers from model (markerStart/markerEnd) override defaults for special arrow types
    const mStart = (edge as any).markerStart as (undefined|string);
    const mEnd = (edge as any).markerEnd as (undefined|string);
    // First try geometric intersection with source/target node boundary for precise joins
    const sourceNode = nodeMap[(edge as any).source];
    const targetNode = nodeMap[(edge as any).target];
    if (sourceNode) {
      finalSegs = this.intersectSegmentsStart(finalSegs, sourceNode);
    }
    if (targetNode) {
      finalSegs = this.intersectSegmentsEnd(finalSegs, targetNode);
    }
    // Fallback tiny trim if markers exist (avoid overlay)
    const cut = 1.5;
    if (mStart && mStart !== 'none') finalSegs = this.trimSegmentsStart(finalSegs, cut);
    if (mEnd && mEnd !== 'none') finalSegs = this.trimSegmentsEnd(finalSegs, cut);
    const pathData = this.pathFromSegments(finalSegs);

    let edgeElement = `<path d="${pathData}" stroke="${this.arrowStroke}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    if (strokeDasharray) {
      edgeElement += ` stroke-dasharray="${strokeDasharray}"`;
    }
    // Apply explicit markers from edge if present
    const startMark = mStart === 'arrow' ? 'url(#arrow)' : mStart === 'circle' ? 'url(#circle-marker)' : mStart === 'cross' ? 'url(#cross-marker)' : '';
    const endMark = mEnd === 'arrow' ? 'url(#arrow)' : mEnd === 'circle' ? 'url(#circle-marker)' : mEnd === 'cross' ? 'url(#cross-marker)' : (markerEnd || '');
    // Ensure the last segment has a non-zero tangent so marker rotates properly
    if (finalSegs.segs.length) {
      const last = finalSegs.segs[finalSegs.segs.length - 1];
      const d2 = Math.hypot(last.to.x - last.c2.x, last.to.y - last.c2.y);
      if (d2 < 0.1) {
        const prev = finalSegs.segs.length > 1 ? finalSegs.segs[finalSegs.segs.length - 2].to : finalSegs.start;
        const dx = last.to.x - prev.x; const dy = last.to.y - prev.y; const len = Math.hypot(dx, dy) || 1;
        const c2x = last.to.x - (dx/len) * 0.2; const c2y = last.to.y - (dy/len) * 0.2;
        finalSegs.segs[finalSegs.segs.length - 1] = { ...last, c2: { x: c2x, y: c2y } } as any;
      }
    }
    if (startMark) edgeElement += ` marker-start="${startMark}"`;
    if (endMark) edgeElement += ` marker-end="${endMark}"`;
    edgeElement += ' />';

    // Add edge label if present
    if (edge.label) {
      const pos = this.pointAtRatio(points, 0.55);
      const text = this.escapeXml(edge.label);
      const padding = 6;
      const fontSize = this.fontSize - 2;
      const width = Math.max(20, Math.min(240, text.length * 7 + padding * 2));
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
  private buildSmoothSegments(points: Array<{x:number;y:number}>): { start:{x:number;y:number}; segs: Array<{c1:{x:number;y:number}; c2:{x:number;y:number}; to:{x:number;y:number}}>} {
    if (points.length < 2) {
      const p = points[0] || {x:0,y:0};
      return { start: p, segs: [] };
    }
    if (points.length === 2) {
      const p0 = points[0];
      const p1 = points[1];
      const c1 = { x: p0.x + (p1.x - p0.x) / 3, y: p0.y + (p1.y - p0.y) / 3 };
      const c2 = { x: p0.x + 2*(p1.x - p0.x) / 3, y: p0.y + 2*(p1.y - p0.y) / 3 };
      return { start: p0, segs: [{ c1, c2, to: p1 }] };
    }
    const pts = [points[0], ...points, points[points.length - 1]]; // duplicate ends
    const segs: Array<{c1:{x:number;y:number}; c2:{x:number;y:number}; to:{x:number;y:number}}> = [];
    const firstIdx = 1;
    const lastIdx = pts.length - 3; // index i of the last produced segment
    const midFactor = 1.0;          // keep mid segments as-is
    const endFactor = 0.45;         // reduce handle magnitude near the ends a bit more
    for (let i = 1; i < pts.length - 2; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2];
      const f1 = (i === firstIdx) ? endFactor : midFactor;
      const f2 = (i === lastIdx)  ? endFactor : midFactor;
      const c1 = { x: p1.x + ((p2.x - p0.x) / 6) * f1, y: p1.y + ((p2.y - p0.y) / 6) * f1 };
      let c2 = { x: p2.x - ((p3.x - p1.x) / 6) * f2, y: p2.y - ((p3.y - p1.y) / 6) * f2 };
      if (i === lastIdx) {
        const flat = 0.3; c2 = { x: p2.x + (c2.x - p2.x) * flat, y: p2.y + (c2.y - p2.y) * flat };
      }
      segs.push({ c1, c2, to: { x: p2.x, y: p2.y } });
    }
    return { start: pts[1], segs };
  }

  private pathFromSegments(data: { start:{x:number;y:number}; segs: Array<{c1:{x:number;y:number}; c2:{x:number;y:number}; to:{x:number;y:number}}>}): string {
    let d = `M${data.start.x},${data.start.y}`;
    for (const s of data.segs) {
      d += ` C${s.c1.x},${s.c1.y} ${s.c2.x},${s.c2.y} ${s.to.x},${s.to.y}`;
    }
    return d;
  }

  private trimSegmentsEnd(data: { start:{x:number;y:number}; segs: Array<{c1:{x:number;y:number}; c2:{x:number;y:number}; to:{x:number;y:number}}>} , cut: number) {
    const segs = data.segs.slice();
    if (!segs.length) return data;
    const last = { ...segs[segs.length - 1] };
    const vx = last.to.x - last.c2.x;
    const vy = last.to.y - last.c2.y;
    const len = Math.hypot(vx, vy) || 1;
    const nx = vx / len;
    const ny = vy / len;
    const newTo = { x: last.to.x - nx * cut, y: last.to.y - ny * cut };
    last.to = newTo;
    segs[segs.length - 1] = last;
    return { start: data.start, segs };
  }

  private trimSegmentsStart(data: { start:{x:number;y:number}; segs: Array<{c1:{x:number;y:number}; c2:{x:number;y:number}; to:{x:number;y:number}}>} , cut: number) {
    const segs = data.segs.slice();
    if (!segs.length) return data;
    const first = { ...segs[0] };
    const vx = first.c1.x - data.start.x;
    const vy = first.c1.y - data.start.y;
    const len = Math.hypot(vx, vy) || 1;
    const nx = vx / len;
    const ny = vy / len;
    const newStart = { x: data.start.x + nx * cut, y: data.start.y + ny * cut };
    return { start: newStart, segs };
  }

  // ---- shape intersections ----
  private intersectSegmentsEnd(data: { start:{x:number;y:number}; segs: Array<{c1:{x:number;y:number}; c2:{x:number;y:number}; to:{x:number;y:number}}>} , node: {x:number;y:number;width:number;height:number;shape:string}) {
    if (!data.segs.length) return data;
    const last = data.segs[data.segs.length - 1];
    const p1 = last.c2; const p2 = last.to;
    const hit = this.intersectLineWithNode(p1, p2, node);
    if (hit) {
      const segs = data.segs.slice();
      segs[segs.length - 1] = { ...last, to: hit };
      return { start: data.start, segs };
    }
    return data;
  }

  private intersectSegmentsStart(data: { start:{x:number;y:number}; segs: Array<{c1:{x:number;y:number}; c2:{x:number;y:number}; to:{x:number;y:number}}>} , node: {x:number;y:number;width:number;height:number;shape:string}) {
    if (!data.segs.length) return data;
    const first = data.segs[0];
    const p1 = data.start; const p2 = first.c1;
    const hit = this.intersectLineWithNode(p1, p2, node);
    if (hit) {
      return { start: hit, segs: data.segs };
    }
    return data;
  }

  private intersectLineWithNode(p1:{x:number;y:number}, p2:{x:number;y:number}, node:{x:number;y:number;width:number;height:number;shape:string}): {x:number;y:number} | null {
    const shape = node.shape;
    if (shape === 'circle') {
      const cx = node.x + node.width/2; const cy = node.y + node.height/2; const r = Math.min(node.width, node.height)/2;
      return this.lineCircleIntersection(p1, p2, {cx, cy, r});
    } else if (shape === 'diamond') {
      const cx = node.x + node.width/2; const cy = node.y + node.height/2;
      const poly = [ {x:cx, y:node.y}, {x:node.x+node.width, y:cy}, {x:cx, y:node.y+node.height}, {x:node.x, y:cy} ];
      return this.linePolygonIntersection(p1, p2, poly);
    } else {
      // default to rectangle
      const poly = [
        {x:node.x, y:node.y},
        {x:node.x+node.width, y:node.y},
        {x:node.x+node.width, y:node.y+node.height},
        {x:node.x, y:node.y+node.height}
      ];
      return this.linePolygonIntersection(p1, p2, poly);
    }
  }

  private lineCircleIntersection(p1:{x:number;y:number}, p2:{x:number;y:number}, c:{cx:number;cy:number;r:number}): {x:number;y:number} | null {
    // parametric p = p1 + t*(p2-p1)
    const dx = p2.x - p1.x; const dy = p2.y - p1.y;
    const fx = p1.x - c.cx; const fy = p1.y - c.cy;
    const a = dx*dx + dy*dy;
    const b = 2*(fx*dx + fy*dy);
    const cc = fx*fx + fy*fy - c.r*c.r;
    const disc = b*b - 4*a*cc; if (disc < 0) return null;
    const s = Math.sqrt(disc);
    // we need t in (0,1), nearest to 1 (closest to p2)
    const t1 = (-b - s) / (2*a);
    const t2 = (-b + s) / (2*a);
    const ts = [t1, t2].filter(t => t >= 0 && t <= 1);
    if (!ts.length) return null;
    const t = Math.max(...ts);
    return { x: p1.x + dx*t, y: p1.y + dy*t };
  }

  private linePolygonIntersection(p1:{x:number;y:number}, p2:{x:number;y:number}, poly:Array<{x:number;y:number}>): {x:number;y:number} | null {
    let bestT = -Infinity; let best=null as any;
    for (let i=0;i<poly.length;i++){
      const a = poly[i]; const b = poly[(i+1)%poly.length];
      const hit = this.segmentIntersection(p1,p2,a,b);
      if (hit && hit.t >= 0 && hit.t <= 1 && hit.u >=0 && hit.u <=1){
        if (hit.t > bestT){ bestT = hit.t; best = {x: hit.x, y: hit.y}; }
      }
    }
    return best;
  }

  private segmentIntersection(p:{x:number;y:number}, p2:{x:number;y:number}, q:{x:number;y:number}, q2:{x:number;y:number}): {x:number;y:number;t:number;u:number}|null {
    const r = { x: p2.x - p.x, y: p2.y - p.y };
    const s = { x: q2.x - q.x, y: q2.y - q.y };
    const rxs = r.x*s.y - r.y*s.x; if (Math.abs(rxs) < 1e-6) return null;
    const q_p = { x: q.x - p.x, y: q.y - p.y };
    const t = (q_p.x*s.y - q_p.y*s.x)/rxs;
    const u = (q_p.x*r.y - q_p.y*r.x)/rxs;
    const x = p.x + t*r.x; const y = p.y + t*r.y;
    return {x,y,t,u};
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
