#!/usr/bin/env node
// Compare PNG outputs for a single diagram between Mermaid CLI and our renderer.

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');

function run(cmd) {
  return execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
}

async function main() {
  const rel = process.argv[2] || 'test-fixtures/flowchart/valid/nested-subgraphs.mmd';
  const abs = path.resolve(root, rel);
  if (!fs.existsSync(abs)) {
    console.error('Input not found:', rel);
    process.exit(1);
  }
  const tmpDir = path.resolve(root, '.tmp-compare');
  fs.mkdirSync(tmpDir, { recursive: true });

  const base = path.basename(rel).replace(/\.mmd$/, '');
  const mmSvg = path.join(tmpDir, base + '.mermaid.svg');
  const mmPng = path.join(tmpDir, base + '.mermaid.png');
  const oursSvg = path.join(tmpDir, base + '.ours.svg');
  const oursPng = path.join(tmpDir, base + '.ours.png');

  // 1) Mermaid CLI SVG+PNG
  const puppeteerCfg = path.resolve(__dirname, 'puppeteer-ci.json');
  const pFlag = fs.existsSync(puppeteerCfg) ? ` -p "${puppeteerCfg}"` : '';
  try {
    run(`npx @mermaid-js/mermaid-cli${pFlag} -i "${rel}" -o "${mmPng}"`);
    // Also export SVG for metrics by reusing mmdc default (png already produced)
    run(`npx @mermaid-js/mermaid-cli${pFlag} -i "${rel}" -o "${mmSvg}"`);
  } catch (e) {
    console.error('Failed to run mermaid-cli:', e.message || e);
  }

  // 2) Our renderer SVG
  const { renderMermaid } = await import(path.resolve(root, 'out/renderer/index.js'));
  const src = fs.readFileSync(abs, 'utf8');
  const r = renderMermaid(src);
  if (!r || !r.svg) {
    console.error('Our renderer returned no SVG');
    process.exit(2);
  }
  fs.writeFileSync(oursSvg, r.svg);
  // 3) Convert our SVG to PNG via resvg-js
  const resvg = new Resvg(r.svg); // render at native SVG size
  const pngData = resvg.render().asPng();
  fs.writeFileSync(oursPng, pngData);

  // 4) Simple structural compare: count paths/rects and report sizes
  function svgStats(svgPath) {
    let s = { paths: 0, rects: 0, lines: 0, width: 0, height: 0 };
    if (!fs.existsSync(svgPath)) return s;
    const t = fs.readFileSync(svgPath, 'utf8');
    s.paths = (t.match(/<path\b/gi) || []).length;
    s.rects = (t.match(/<rect\b/gi) || []).length;
    s.lines = (t.match(/<line\b/gi) || []).length;
    const m = t.match(/viewBox\s*=\s*"\s*0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/i);
    if (m) { s.width = +m[1]; s.height = +m[2]; }
    return s;
  }

  const mmStats = svgStats(mmSvg);
  const ourStats = svgStats(oursSvg);

  console.log('Mermaid PNG:', mmPng);
  console.log('Ours PNG   :', oursPng);
  console.log('Mermaid SVG stats:', mmStats);
  console.log('Ours SVG stats   :', ourStats);
}

main().catch((e) => { console.error(e); process.exit(1); });
