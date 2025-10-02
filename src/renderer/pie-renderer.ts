import type { PieChartModel, PieRenderOptions } from './pie-types.js';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

const DEFAULT_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

export function renderPie(model: PieChartModel, opts: PieRenderOptions = {}): string {
  const width = Math.max(320, Math.floor(opts.width ?? 640));
  const height = Math.max(240, Math.floor(opts.height ?? 400));

  // Layout constants
  const pad = 24;
  const titleH = model.title ? 28 : 0;
  const cx = width / 2;
  const cy = (height + titleH) / 2 + (model.title ? 8 : 0);
  const radius = Math.max(40, Math.min(width, height - titleH) / 2 - pad);

  // Sum and normalize values
  const total = model.slices.reduce((a, s) => a + Math.max(0, s.value), 0);
  const slices = model.slices.filter(s => Math.max(0, s.value) > 0);

  let start = -Math.PI / 2; // start at top

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `\n  <style>
    .pie-title { font-family: Arial, sans-serif; font-size: 16px; font-weight: 600; fill: #222; }
    .slice-label { font-family: Arial, sans-serif; font-size: 12px; fill: #222; dominant-baseline: middle; }
  </style>`;

  if (model.title) {
    svg += `\n  <text class="pie-title" x="${cx}" y="${pad + 8}" text-anchor="middle">${escapeXml(model.title)}</text>`;
  }

  svg += `\n  <g class="pie" aria-label="pie">`;

  slices.forEach((s, i) => {
    const pct = total > 0 ? Math.max(0, s.value) / total : 0;
    const angle = 2 * Math.PI * pct;
    const end = start + angle;
    const large = angle > Math.PI ? 1 : 0;
    const c0 = polarToCartesian(cx, cy, radius, start);
    const c1 = polarToCartesian(cx, cy, radius, end);
    const d = [
      `M ${cx} ${cy}`,
      `L ${c0.x.toFixed(2)} ${c0.y.toFixed(2)}`,
      `A ${radius} ${radius} 0 ${large} 1 ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}`,
      'Z'
    ].join(' ');
    const fill = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    svg += `\n    <path d="${d}" fill="${fill}" fill-opacity="0.9" stroke="#fff" stroke-width="1" />`;

    // Label at arc midpoint
    const mid = (start + end) / 2;
    const lr = radius * 0.62;
    const lp = polarToCartesian(cx, cy, lr, mid);
    const labelBase = s.label;
    const dataText = model.showData ? ` ${Number(s.value).toString()}` : '';
    const text = escapeXml(labelBase + dataText);
    // Auto flip anchor based on quadrant for readability
    const cos = Math.cos(mid);
    const anchor = Math.abs(cos) < 0.2 ? 'middle' : (cos > 0 ? 'start' : 'end');
    svg += `\n    <text class="slice-label" x="${lp.x.toFixed(2)}" y="${lp.y.toFixed(2)}" text-anchor="${anchor}">${text}</text>`;

    start = end;
  });

  svg += `\n  </g>\n</svg>`;
  return svg;
}

