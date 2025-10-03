import { DagreLayoutEngine } from './layout.js';
import { buildSharedCss } from './styles.js';
import { escapeXml, measureText } from './utils.js';
import type { ClassModel, ClassDef, Relation } from './class-types.js';
import type { Graph, Node, Edge, Layout } from './types.js';

type Pt = { x: number; y: number };

function classNodeSize(def: ClassDef, fontSize = 14): { width: number; height: number; title: string; attrLines: string[]; methodLines: string[] } {
  const title = def.stereotype ? `«${def.stereotype}» ${def.display}` : def.display;
  const attrLines = def.attributes.slice();
  const methodLines = def.methods.slice();
  const lineH = Math.max(16, Math.round(fontSize * 1.1));
  const padX = 12, padY = 10;
  const titleW = measureText(title, fontSize + 1) + padX * 2;
  const attrsW = Math.max(0, ...attrLines.map(t => measureText(t, fontSize))) + padX * 2;
  const methodsW = Math.max(0, ...methodLines.map(t => measureText(t, fontSize))) + padX * 2;
  const width = Math.max(120, titleW, attrsW, methodsW);
  const sepH = (attrLines.length ? 6 : 0) + (methodLines.length ? 6 : 0);
  const height = padY*2 + lineH /*title*/ + (attrLines.length * lineH) + (methodLines.length ? 6 : 0) + (attrLines.length ? 6 : 0) + (methodLines.length * lineH);
  return { width, height, title, attrLines, methodLines };
}

function triangleOpenAt(points: [Pt, Pt], color: string, length = 10, width = 8, atEnd = true): string {
  const [a,b] = atEnd ? points : [points[1], points[0]];
  const vx = b.x - a.x, vy = b.y - a.y; const len = Math.hypot(vx, vy) || 1; const ux = vx/len, uy = vy/len; const nx = -uy, ny = ux;
  const tip = { x: b.x, y: b.y };
  const base = { x: b.x - ux * length, y: b.y - uy * length };
  const p2 = { x: base.x + nx*(width/2), y: base.y + ny*(width/2) };
  const p3 = { x: base.x - nx*(width/2), y: base.y - ny*(width/2) };
  return `<path d="M${tip.x},${tip.y} L${p2.x},${p2.y} M${tip.x},${tip.y} L${p3.x},${p3.y}" stroke="${color}" fill="none" />`;
}

function diamondAt(points: [Pt, Pt], color: string, filled: boolean, size = 10, atStart = true): string {
  const [a,b] = atStart ? points : [points[1], points[0]];
  const vx = b.x - a.x, vy = b.y - a.y; const len = Math.hypot(vx, vy) || 1; const ux = vx/len, uy = vy/len; const nx = -uy, ny = ux;
  const center = { x: a.x, y: a.y };
  const pTip = { x: center.x - ux*size, y: center.y - uy*size };
  const pLeft = { x: center.x + nx*(size/1.4), y: center.y + ny*(size/1.4) };
  const pRight = { x: center.x - nx*(size/1.4), y: center.y - ny*(size/1.4) };
  const pBack = { x: center.x + ux*size, y: center.y + uy*size };
  const d = `M${pTip.x},${pTip.y} L${pLeft.x},${pLeft.y} L${pBack.x},${pBack.y} L${pRight.x},${pRight.y} Z`;
  return filled ? `<path d="${d}" fill="${color}" stroke="${color}"/>` : `<path d="${d}" fill="white" stroke="${color}"/>`;
}

function polyline(points: Pt[], cls: string, dashed = false, stroke = '#555', strokeWidth = 2): string {
  const d = points.map(p => `${p.x},${p.y}`).join(' ');
  const dash = dashed ? ` stroke-dasharray="4 3"` : '';
  return `<polyline class="${cls}" points="${d}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none"${dash}/>`;
}

export function renderClass(model: ClassModel, opts: { theme?: Record<string, any> } = {}): string {
  // Build a Graph for Dagre with explicit sizes
  const nodes: Node[] = [];
  const nodeSizeInfo: Record<string, ReturnType<typeof classNodeSize>> = {};
  for (const c of model.classes) {
    const sz = classNodeSize(c);
    nodeSizeInfo[c.id] = sz;
    nodes.push({ id: c.id, label: c.display, shape: 'rectangle', width: sz.width, height: sz.height });
  }
  const edges: Edge[] = model.relations.map((r, i) => ({ id: `e${i}`, source: r.source, target: r.target, type: 'open' }));
  const graph: Graph = { nodes, edges, direction: model.direction };
  const layoutEngine = new DagreLayoutEngine();
  const layout: Layout = layoutEngine.layout(graph);

  // SVG setup
  const width = Math.ceil(layout.width + 40);
  const height = Math.ceil(layout.height + 40);
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${Math.min(0, -20)} ${Math.min(0, -20)} ${width} ${height}">`);
  const sharedCss = buildSharedCss();
  parts.push(`<style>${sharedCss}
    .class-title { font-weight: 600; }
    .class-divider { stroke: #aaa; stroke-width: 1; }
    .class-member { font-size: 12px; }
  </style>`);

  // Draw nodes
  for (const n of layout.nodes) {
    const info = nodeSizeInfo[n.id];
    const x = n.x, y = n.y, w = n.width, h = n.height; // dagre already positioned using our sizes
    const title = info.title;
    const attrs = info.attrLines;
    const methods = info.methodLines;
    const lineH = 16; const padX = 12; const padY = 10;
    let cy = y + padY + lineH; // baseline for title
    parts.push(`  <g transform="translate(${x},${y})">`);
    parts.push(`    <rect class="node-shape" width="${w}" height="${h}" rx="0"/>`);
    // Title centered
    parts.push(`    <text class="node-label class-title" x="${w/2}" y="${padY + 12}" text-anchor="middle" dominant-baseline="middle">${escapeXml(title)}</text>`);
    let yCursor = padY + 18;
    if (attrs.length) {
      parts.push(`    <line class="class-divider" x1="0" y1="${yCursor}" x2="${w}" y2="${yCursor}"/>`);
      yCursor += 8;
      for (const a of attrs) {
        parts.push(`    <text class="node-label class-member" x="${padX}" y="${yCursor}" dominant-baseline="hanging">${escapeXml(a)}</text>`);
        yCursor += lineH;
      }
    }
    if (methods.length) {
      parts.push(`    <line class="class-divider" x1="0" y1="${yCursor}" x2="${w}" y2="${yCursor}"/>`);
      yCursor += 8;
      for (const m of methods) {
        parts.push(`    <text class="node-label class-member" x="${padX}" y="${yCursor}" dominant-baseline="hanging">${escapeXml(m)}</text>`);
        yCursor += lineH;
      }
    }
    parts.push('  </g>');
  }

  // Draw edges + markers + labels
  const edgeColor = '#555';
  for (let i = 0; i < layout.edges.length; i++) {
    const e = layout.edges[i];
    const rel = model.relations[i];
    const pts = e.points;
    const dashed = rel.kind === 'dependency' || rel.kind === 'realization';
    parts.push(polyline(pts, 'edge-path', dashed, edgeColor, 2));

    // Cardinalities near ends
    if (rel.leftCard) {
      const p = pts[0];
      parts.push(`<text class="edge-label-text" x="${p.x - 6}" y="${p.y - 6}" text-anchor="end">${escapeXml(rel.leftCard)}</text>`);
    }
    if (rel.rightCard) {
      const p = pts[pts.length - 1];
      parts.push(`<text class="edge-label-text" x="${p.x + 6}" y="${p.y - 6}" text-anchor="start">${escapeXml(rel.rightCard)}</text>`);
    }
    if (rel.label) {
      const mid = pts[Math.floor(pts.length/2)];
      parts.push(`<text class="edge-label-text" x="${mid.x}" y="${mid.y - 8}" text-anchor="middle">${escapeXml(rel.label)}</text>`);
    }

    // Markers
    const pStart: [Pt,Pt] = [pts[0], pts[1] ?? pts[0]];
    const pEnd: [Pt,Pt] = [pts[pts.length-2] ?? pts[pts.length-1], pts[pts.length-1]];
    switch (rel.kind) {
      case 'extends':
        parts.push(triangleOpenAt(pEnd, edgeColor, 12, 10, true));
        break;
      case 'realization':
        parts.push(triangleOpenAt(pEnd, edgeColor, 12, 10, true));
        break;
      case 'dependency':
        // Approximate with open triangle for now
        parts.push(triangleOpenAt(pEnd, edgeColor, 10, 8, true));
        break;
      case 'aggregation':
        parts.push(diamondAt(pStart, edgeColor, false, 8, true));
        break;
      case 'composition':
        parts.push(diamondAt(pStart, edgeColor, true, 8, true));
        break;
      case 'aggregation-both':
        parts.push(diamondAt(pStart, edgeColor, false, 8, true));
        parts.push(diamondAt(pEnd, edgeColor, false, 8, false));
        break;
      case 'composition-both':
        parts.push(diamondAt(pStart, edgeColor, true, 8, true));
        parts.push(diamondAt(pEnd, edgeColor, true, 8, false));
        break;
      case 'aggregation-to-comp':
        parts.push(diamondAt(pStart, edgeColor, false, 8, true));
        parts.push(diamondAt(pEnd, edgeColor, true, 8, false));
        break;
      case 'composition-to-agg':
        parts.push(diamondAt(pStart, edgeColor, true, 8, true));
        parts.push(diamondAt(pEnd, edgeColor, false, 8, false));
        break;
      case 'lollipop-left':
        // Circle near start
        parts.push(`<circle cx="${pStart[0].x}" cy="${pStart[0].y}" r="5" fill="white" stroke="${edgeColor}" />`);
        break;
      case 'lollipop-right':
        parts.push(`<circle cx="${pEnd[1].x}" cy="${pEnd[1].y}" r="5" fill="white" stroke="${edgeColor}" />`);
        break;
      case 'association':
      default:
        break;
    }
  }

  parts.push('</svg>');
  return parts.join('\n');
}

