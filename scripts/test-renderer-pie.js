#!/usr/bin/env node
// Simple renderer test for pie frontmatter theme variables.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderMermaid } from '../out/renderer/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(cond, msg) { if (!cond) { throw new Error(msg); } }

async function main() {
  const file = path.resolve(__dirname, '..', 'test-fixtures/pie/valid/frontmatter-theme.mmd');
  const text = fs.readFileSync(file, 'utf8');
  const { svg } = renderMermaid(text);
  // Expect arc stroke width overridden
  assert(/stroke-width="3px"/.test(svg), 'Expected stroke-width="3px" for pie arcs');
  // Expect label color and size applied
  assert(/class="slice-label"[^>]*fill="#333333"/.test(svg), 'Expected slice-label fill #333333');
  assert(/class="slice-label"[^>]*font-size="13px"/.test(svg), 'Expected slice-label font-size 13px');
  // Expect title color and size
  assert(/class="pie-title"[^>]*fill="#111111"/.test(svg), 'Expected pie-title fill #111111');
  assert(/class="pie-title"[^>]*font-size="18px"/.test(svg), 'Expected pie-title font-size 18px');
  // Expect first two slice fills overridden
  const pathFills = Array.from(svg.matchAll(/<path d=\"M [^\"]+\" fill=\"([^\"]+)\"/g)).map(m => m[1]);
  assert(pathFills[0] === '#00AAFF', 'Expected first slice color #00AAFF');
  assert(pathFills[1] === '#FFAA00', 'Expected second slice color #FFAA00');
  // Percent labels and legend
  if(!(/>\s*60%\s*</.test(svg) || />60%</.test(svg) || /60%/.test(svg))) throw new Error('Expected percentage labels (e.g., 60%) on slices');
  if(!(/<g class=\"legend\">/.test(svg))) throw new Error('Expected legend group');
  if(!(/class=\"slice-label legend-text\"/.test(svg))) throw new Error('Expected legend text entries');
  if(!(/Dogs\s+30/.test(svg))) throw new Error('Expected legend to contain "Dogs 30" when showData');
  console.log('OK renderer pie theme + legend test');
}

main().catch((e) => { console.error(e.stack || e.message || String(e)); process.exit(1); });

