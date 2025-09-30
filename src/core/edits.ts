import type { PositionLC, TextEditLC } from './types.js';

function toLines(text: string): string[] {
  return text.split(/\r?\n/);
}

export function posToOffset(text: string, pos: PositionLC): number {
  const lines = toLines(text);
  const lineIdx = Math.max(0, Math.min(lines.length - 1, pos.line - 1));
  const line = lines[lineIdx] ?? '';
  const col = Math.max(1, pos.column);
  let off = 0;
  for (let i = 0; i < lineIdx; i++) off += (lines[i]?.length ?? 0) + 1; // +1 for newline
  off += Math.min(line.length, col - 1);
  return off;
}

export function applyEdits(text: string, edits: TextEditLC[]): string {
  if (!edits || edits.length === 0) return text;
  // Convert to offsets and sort descending by start
  type Edit = { startOff: number; endOff: number; newText: string };
  const offs: Edit[] = edits.map(e => {
    const startOff = posToOffset(text, e.start);
    const endOff = e.end ? posToOffset(text, e.end) : startOff;
    return { startOff, endOff, newText: e.newText };
  }).sort((a, b) => b.startOff - a.startOff);

  let out = text;
  for (const e of offs) {
    out = out.slice(0, e.startOff) + e.newText + out.slice(e.endOff);
  }
  return out;
}

export function replaceRange(text: string, start: PositionLC, length: number, newText: string): TextEditLC {
  return { start, end: { line: start.line, column: start.column + Math.max(0, length) }, newText };
}

export function insertAt(text: string, start: PositionLC, newText: string): TextEditLC {
  return { start, newText };
}

export function lineTextAt(text: string, line: number): string {
  const lines = toLines(text);
  return lines[Math.max(0, Math.min(lines.length - 1, line - 1))] ?? '';
}

export function inferIndentFromLine(lineText: string): string {
  const m = /^(\s*)/.exec(lineText);
  return m ? (m[1] || '') : '';
}

