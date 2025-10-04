import type { StateModel } from './state-types.js';
import type { Graph, Node, Edge, Subgraph } from './types.js';
import { DagreLayoutEngine } from './layout.js';
import { SVGRenderer } from './svg-generator.js';
import { buildSharedCss } from './styles.js';

function toGraph(model: StateModel): { graph: Graph; laneGroups: Array<{ parentId: string; id: string; nodes: string[] }> } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const subgraphs: Subgraph[] = [];

  for (const s of model.nodes) {
    let shape: Node['shape'] = 'rectangle';
    let label = s.label || s.id;
    if (s.kind === 'start') { shape = 'circle'; label = ''; }
    else if (s.kind === 'end') { shape = 'circle'; label = ''; }
    else if (s.kind === 'history') { shape = 'circle'; label = 'H'; }
    else if (s.kind === 'history-deep') { shape = 'circle'; label = 'H*'; }
    else if (s.kind === 'choice') { shape = 'diamond'; }
    else if (s.kind === 'fork' || s.kind === 'join') { shape = 'rectangle'; }
    const node: Node = { id: s.id, label, shape };
    if (s.kind === 'fork' || s.kind === 'join') { (node as any).width = 80; (node as any).height = 8; }
    nodes.push(node);
  }

  for (const t of model.transitions) {
    edges.push({ id: `${t.source}->${t.target}-${Math.random().toString(36).slice(2,7)}`, source: t.source, target: t.target, label: t.label, type: 'arrow', markerEnd: 'arrow' });
  }

  const laneGroups = (model.lanes || []).slice();
  const laneIds = new Set(laneGroups.map(l => l.id));
  for (const c of model.composites) {
    if (laneIds.has(c.id)) continue;
    subgraphs.push({ id: c.id, label: c.label, nodes: c.nodes, parent: c.parent });
  }

  return { graph: { nodes, edges, subgraphs, direction: model.direction } as Graph, laneGroups };
}

export function renderState(model: StateModel): string {
  const { graph, laneGroups } = toGraph(model);
  const layout = new DagreLayoutEngine().layout(graph);
  let svg = new SVGRenderer().render(layout);
  // Build overlays: lane dividers + end double circles
  const byId: Record<string, { x:number;y:number;width:number;height:number }> = Object.fromEntries(layout.nodes.map(n => [n.id, { x:n.x, y:n.y, width:n.width, height:n.height }]));
  const subById: Record<string, { x:number;y:number;width:number;height:number;label?:string }> = Object.fromEntries(((layout as any).subgraphs || []).map((s:any)=>[s.id,{x:s.x,y:s.y,width:s.width,height:s.height,label:s.label}]));
  const overlays: string[] = [];
  for (const lg of laneGroups) {
    const parent = subById[lg.parentId];
    if (!parent) continue;
    const members = lg.nodes.map(id => byId[id]).filter(Boolean);
    if (!members.length) continue;
    // Horizontal divider at min member Y (TD layout assumption)
    const minY = Math.min(...members.map(m => m.y));
    const y = Math.max(parent.y, minY - 8);
    overlays.push(`<line class="lane-divider" x1="${parent.x}" y1="${y}" x2="${parent.x + parent.width}" y2="${y}" />`);
  }
  for (const n of layout.nodes) {
    // End nodes only
    const src = (model.nodes || []).find(nn => nn.id === n.id);
    if (!src || src.kind !== 'end') continue;
    const cx = n.x + n.width/2; const cy = n.y + n.height/2;
    const r = Math.max(1, Math.min(n.width, n.height)/2 - 3);
    overlays.push(`<circle class="end-double" cx="${cx}" cy="${cy}" r="${r}" fill="none" />`);
  }
  if (overlays.length) {
    const style = `<style>.lane-divider{stroke:#aaaaaa;stroke-width:1;stroke-dasharray:4 3}.end-double{stroke:#3f3f3f;stroke-width:1}</style>`;
    svg = svg.replace('</svg>', `${style}<g class="state-overlays">${overlays.join('\n')}</g></svg>`);
  }
  if (!/<style>/.test(svg)) {
    const css = buildSharedCss();
    svg = svg.replace('<svg ', `<svg `).replace('</svg>', `<style>${css}</style></svg>`);
  }
  return svg;
}
