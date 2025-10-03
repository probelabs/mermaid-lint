// Shared block (container/cluster) helpers for consistent visuals across diagram types.
// Emits background and overlay (border + title + dividers) using the same
// classes as flowchart clusters so theming applies uniformly.

import { escapeXml, measureText } from './utils.js';

export function blockBackground(x: number, y: number, width: number, height: number): string {
  // Transparent; kept as separate layer in case we theme fill later
  return `<g class="cluster-bg-layer" transform="translate(${x},${y})">
  <rect class="cluster-bg" x="0" y="0" width="${width}" height="${height}" rx="4"/>
</g>`;
}

export function blockOverlay(
  x: number,
  y: number,
  width: number,
  height: number,
  title?: string,
  branchYs: Array<{ y:number; title?: string }> = [],
  titleYOffset: number = 0,
  align: 'center' | 'left' = 'center',
  branchAlign: 'center' | 'left' = 'left'
): string {
  const parts: string[] = [];
  parts.push(`<g class="cluster-overlay" transform="translate(${x},${y})">`);
  parts.push(`<rect class="cluster-border" x="0" y="0" width="${width}" height="${height}" rx="4"/>`);

  const titleText = title ? escapeXml(title) : '';
  if (titleText) {
    const titleW = Math.max(24, measureText(titleText, 12) + 10);
    const yBg = -2 + titleYOffset;
    const yText = 11 + titleYOffset;
    if (align === 'left') {
      const xBg = 6;
      parts.push(`<rect class="cluster-title-bg" x="${xBg}" y="${yBg}" width="${titleW}" height="18" rx="3"/>`);
      // Left-align text inside pill with slight inner padding
      parts.push(`<text class="cluster-label-text" x="${xBg + 6}" y="${yText}" text-anchor="start">${titleText}</text>`);
    } else {
      const xBg = 6;
      parts.push(`<rect class="cluster-title-bg" x="${xBg}" y="${yBg}" width="${titleW}" height="18" rx="3"/>`);
      parts.push(`<text class="cluster-label-text" x="${xBg + titleW/2}" y="${yText}" text-anchor="middle">${titleText}</text>`);
    }
  }
  for (const br of branchYs) {
    const yRel = br.y - y;
    parts.push(`<line x1="0" y1="${yRel}" x2="${width}" y2="${yRel}" class="cluster-border" />`);
    if (br.title) {
      const text = escapeXml(br.title);
      const bw = Math.max(24, measureText(text, 12) + 10);
      const xBg = 6;
      parts.push(`<rect class="cluster-title-bg" x="${xBg}" y="${yRel - 10}" width="${bw}" height="18" rx="3"/>`);
      if (branchAlign === 'left') {
        parts.push(`<text class="cluster-label-text" x="${xBg + 6}" y="${yRel + 1}" text-anchor="start">${text}</text>`);
      } else {
        parts.push(`<text class="cluster-label-text" x="${xBg + bw/2}" y="${yRel + 1}" text-anchor="middle">${text}</text>`);
      }
    }
  }
  parts.push('</g>');
  return parts.join('\n');
}
