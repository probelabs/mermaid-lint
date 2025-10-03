// Shared arrowhead helpers used by renderers (flowchart, sequence, etc.)
// Produces small overlay triangles that point along a polyline's last segment.

export type Point = { x: number; y: number };

export function triangleAtEnd(start: Point, end: Point, color = '#333', length = 8, width = 6): string {
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const len = Math.hypot(vx, vy) || 1;
  const ux = vx / len; const uy = vy / len;
  const nx = -uy; const ny = ux;
  const baseX = end.x - ux * length;
  const baseY = end.y - uy * length;
  const p2x = baseX + nx * (width / 2), p2y = baseY + ny * (width / 2);
  const p3x = baseX - nx * (width / 2), p3y = baseY - ny * (width / 2);
  return `<path d="M${end.x},${end.y} L${p2x},${p2y} L${p3x},${p3y} Z" fill="${color}" />`;
}

export function triangleAtStart(first: Point, second: Point, color = '#333', length = 8, width = 6): string {
  // Arrow at the start point pointing toward the second point
  const vx = second.x - first.x;
  const vy = second.y - first.y;
  const len = Math.hypot(vx, vy) || 1;
  const ux = vx / len; const uy = vy / len;
  const nx = -uy; const ny = ux;
  // Tip points backward from first toward outside the segment; base on the first point
  const tipX = first.x - ux * length;
  const tipY = first.y - uy * length;
  const p2x = first.x + nx * (width / 2), p2y = first.y + ny * (width / 2);
  const p3x = first.x - nx * (width / 2), p3y = first.y - ny * (width / 2);
  return `<path d="M${tipX},${tipY} L${p2x},${p2y} L${p3x},${p3y} Z" fill="${color}" />`;
}

