import type { PieChartModel, PieRenderOptions } from './pie-types.js';
import { escapeXml, measureText, palette, formatNumber, formatPercent } from './utils.js';

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

interface InternalOptions extends PieRenderOptions {}

export function renderPie(model: PieChartModel, opts: InternalOptions = {}): string {
  let width = Math.max(320, Math.floor(opts.width ?? 640));
  const height = Math.max(240, Math.floor(opts.height ?? 400));

  // Layout constants
  const pad = 24;
  const titleH = model.title ? 28 : 0;
  let cx = width / 2;
  const cy = (height + titleH) / 2 + (model.title ? 8 : 0);
  const baseRadius = Math.max(40, Math.min(width, height - titleH) / 2 - pad);

  // Sum and normalize values
  const slices = model.slices.filter(s => Math.max(0, s.value) > 0);
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0);

  // Pre-measure legend to reserve space on the right
  const LEG_SW = 12; // legend swatch size
  const LEG_GAP = 8; // gap between swatch and text
  const LEG_VSPACE = 18;
  const legendItems = slices.map(s => `${s.label}${model.showData ? ` ${formatNumber(Number(s.value))}` : ''}`);
  const legendTextWidth = legendItems.length ? Math.max(...legendItems.map(t => measureText(t, 12))) : 0;
  const legendBlockWidth = legendItems.length ? (LEG_SW + LEG_GAP + legendTextWidth + pad) : 0;

  if (legendItems.length) {
    const neededWidth = pad + (baseRadius * 2) + legendBlockWidth + pad;
    if (neededWidth > width) width = Math.ceil(neededWidth);
  }

  // After potential width change, recalc center and radius
  let radius = baseRadius;
  if (legendItems.length) {
    const leftPad = Math.max(pad, (width - legendBlockWidth - (radius * 2)) / 2);
    cx = leftPad + radius;
  }

  let start = -Math.PI / 2; // start at top

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `\n  <style>
    .pie-title { font-family: Arial, sans-serif; font-size: 16px; font-weight: 600; fill: #222; }
    .slice-label { font-family: Arial, sans-serif; font-size: 12px; fill: #222; dominant-baseline: middle; }
    .leader { stroke: #444; stroke-width: 1; fill: none; }
  </style>`;

  if (model.title) {
    svg += `\n  <text class="pie-title" x="${cx}" y="${pad + 8}" text-anchor="middle">${escapeXml(model.title)}</text>`;
  }

  svg += `\n  <g class="pie" aria-label="pie">`;

  const minOutsideAngle = 0.35; // ~20 degrees
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
    const fill = s.color || palette(i);
    // Mermaid default does not draw per-slice strokes; avoid white outlines between slices
    svg += `\n    <path d="${d}" fill="${fill}" fill-opacity="0.9" stroke="none" />`;

    // Percent labels on slices (Mermaid parity)
    const mid = (start + end) / 2;
    const cos = Math.cos(mid);
    const sin = Math.sin(mid);
    const percentLabel = escapeXml(formatPercent(s.value, total));

    if (angle < minOutsideAngle) {
      // Leader line and outside label
      const r1 = radius * 0.9;
      const r2 = radius * 1.06;
      const p1 = polarToCartesian(cx, cy, r1, mid);
      const p2 = polarToCartesian(cx, cy, r2, mid);
      const hlen = 12;
      const anchorLeft = cos < 0;
      const hx = anchorLeft ? p2.x - hlen : p2.x + hlen;
      const hy = p2.y;
      svg += `\n    <path class="leader" d="M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} L ${hx.toFixed(2)} ${hy.toFixed(2)}" />`;
      const tx = anchorLeft ? hx - 2 : hx + 2;
      const tAnchor = anchorLeft ? 'end' : 'start';
      svg += `\n    <text class="slice-label" x="${tx.toFixed(2)}" y="${hy.toFixed(2)}" text-anchor="${tAnchor}">${percentLabel}</text>`;
    } else {
      // Inside label near arc midpoint
      const lr = radius * 0.62;
      const lp = { x: cx + lr * cos, y: cy + lr * sin };
      const tAnchor = Math.abs(cos) < 0.2 ? 'middle' : (cos > 0 ? 'start' : 'end');
      const avail = lr;
      const textW = measureText(percentLabel, 12);
      const anchor = textW > avail * 1.2 ? 'middle' : tAnchor;
      svg += `\n    <text class="slice-label" x="${lp.x.toFixed(2)}" y="${lp.y.toFixed(2)}" text-anchor="${anchor}">${percentLabel}</text>`;
    }

    start = end;
  });

  // Optional outer rim; allow theming via options
  const rimStroke = opts.rimStroke ?? 'none';
  const rimWidth = opts.rimStrokeWidth != null ? String(opts.rimStrokeWidth) : '';
  svg += `\n  </g>\n  <circle class="pie-rim" cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${rimStroke}"${rimWidth ? ` stroke-width="${rimWidth}"` : ''} />`;

  // Legend to the right: label and optional value (with showData)
  if (legendItems.length) {
    const legendX = cx + radius + pad / 2;
    let legendY = (model.title ? pad * 2 : pad) + 10;
    svg += `\n  <g class="legend">`;
    slices.forEach((s, i) => {
      const y = legendY + i * LEG_VSPACE;
      const fill = s.color || palette(i);
      const text = escapeXml(`${s.label}${model.showData ? ` ${formatNumber(Number(s.value))}` : ''}`);
      svg += `\n    <rect x="${legendX}" y="${y - LEG_SW + 6}" width="${LEG_SW}" height="${LEG_SW}" fill="${fill}" stroke="#fff" stroke-width="1" />`;
      svg += `\n    <text class="slice-label legend-text" x="${legendX + LEG_SW + LEG_GAP}" y="${y}" text-anchor="start">${text}</text>`;
    });
    svg += `\n  </g>`;
  }

  svg += `\n</svg>`;
  return svg;
}
