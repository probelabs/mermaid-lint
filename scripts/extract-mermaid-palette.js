#!/usr/bin/env node
// Extract Mermaid default pie palette by rendering a canonical pie and reading slice fills.

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function runMermaidCli(content) {
  const tmpDir = path.join(process.cwd(), '.tmp-compare');
  fs.mkdirSync(tmpDir, { recursive: true });
  const mmd = path.join(tmpDir, 'palette-source.mmd');
  const out = path.join(tmpDir, 'palette.svg');
  fs.writeFileSync(mmd, content, 'utf8');
  try {
    execSync(`npx @mermaid-js/mermaid-cli -i "${mmd}" -o "${out}"`, { stdio: 'pipe' });
    const svg = fs.readFileSync(out, 'utf8');
    return svg;
  } finally {
    // keep files for inspection
  }
}

function makeCanonicalPie(n = 12) {
  const lines = [ 'pie', '  title Palette Probe' ];
  for (let i = 1; i <= n; i++) lines.push(`  "S${i}" : 1`);
  return lines.join('\n') + '\n';
}

function extractSliceFills(svg) {
  // Mermaid draws pie as <path ... fill="#xxxxxx" ...>
  const fills = Array.from(svg.matchAll(/<path[^>]*\sd="M\s*[^\"]+"[^>]*\sfill="([^"]+)"/g)).map(m => m[1]);
  // Uniquify in order
  const uniq = [];
  for (const c of fills) { if (!uniq.includes(c)) uniq.push(c); }
  return uniq;
}

function main() {
  const svg = runMermaidCli(makeCanonicalPie(12));
  const palette = extractSliceFills(svg).slice(0, 12);
  console.log(JSON.stringify({ palette }, null, 2));
}

main();

