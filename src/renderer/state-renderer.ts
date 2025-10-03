import type { StateModel } from './state-types.js';
import type { Graph, Node, Edge, Subgraph } from './types.js';
import { DagreLayoutEngine } from './layout.js';
import { SVGRenderer } from './svg-generator.js';
import { buildSharedCss } from './styles.js';

function toGraph(model: StateModel): Graph {
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
    nodes.push({ id: s.id, label, shape });
  }

  for (const t of model.transitions) {
    edges.push({ id: `${t.source}->${t.target}-${Math.random().toString(36).slice(2,7)}`, source: t.source, target: t.target, label: t.label, type: 'arrow', markerEnd: 'arrow' });
  }

  for (const c of model.composites) {
    subgraphs.push({ id: c.id, label: c.label, nodes: c.nodes, parent: c.parent });
  }

  return { nodes, edges, subgraphs, direction: model.direction } as Graph;
}

export function renderState(model: StateModel): string {
  const graph = toGraph(model);
  const layout = new DagreLayoutEngine().layout(graph);
  const svg = new SVGRenderer().render(layout);
  // Inject shared CSS block if not present
  if (!/\<style\>/.test(svg)) {
    const css = buildSharedCss();
    return svg.replace('<svg ', `<svg `).replace('</svg>', `<style>${css}</style></svg>`);
  }
  return svg;
}
