// Shared utilities for renderers (flowchart, pie, etc.)

export function escapeXml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Simple text width approximation for non-browser environments
// Assumes ~0.6em per character (reasonable for Arial/Sans at 12–16px)
export function measureText(text: string, fontSize = 12): number {
  const avg = 0.6 * fontSize;
  return Math.max(0, Math.round(text.length * avg));
}

// Default categorical palette (Mermaid-like). Fallback to HSL cycling if out of range.
// Sourced via scripts/extract-mermaid-palette.js against mermaid-cli
export const DEFAULT_PALETTE = [
  '#ECECFF',
  '#ffffde',
  'hsl(80, 100%, 56.2745098039%)',
  'hsl(240, 100%, 86.2745098039%)',
  'hsl(60, 100%, 63.5294117647%)',
  'hsl(80, 100%, 76.2745098039%)',
  'hsl(300, 100%, 76.2745098039%)',
  'hsl(180, 100%, 56.2745098039%)',
  'hsl(0, 100%, 56.2745098039%)',
  'hsl(300, 100%, 56.2745098039%)',
  'hsl(150, 100%, 56.2745098039%)',
  'hsl(0, 100%, 66.2745098039%)'
];

export function palette(index: number): string {
  if (index < DEFAULT_PALETTE.length) return DEFAULT_PALETTE[index];
  const i = index - DEFAULT_PALETTE.length;
  const hue = (i * 47) % 360; // spread hues
  return `hsl(${hue} 60% 55%)`;
}

export function formatNumber(n: number): string {
  // Keep simple, avoid locales for snapshot stability
  if (Number.isInteger(n)) return String(n);
  return (Math.round(n * 100) / 100).toString();
}

export function formatPercent(value: number, total: number): string {
  if (!(total > 0)) return '0%';
  const p = (value / total) * 100;
  return `${Math.round(p)}%`;
}
