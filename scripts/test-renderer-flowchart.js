#!/usr/bin/env node
// Renderer test for flowchart frontmatter theme variables

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderMermaid } from '../out/renderer/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function expect(cond, msg) { if (!cond) throw new Error(msg); }

const file = path.resolve(__dirname, '..', 'test-fixtures/flowchart/valid/frontmatter-theme.mmd');
const text = fs.readFileSync(file, 'utf8');
const { svg } = renderMermaid(text);

const style = svg.match(/<style>[\s\S]*?<\/style>/)?.[0] || '';

// CSS rules should be present
expect(/\.node-shape\s*\{/.test(style), 'missing .node-shape');
expect(/\.edge-path\s*\{/.test(style), 'missing .edge-path');
expect(/\.cluster-rect\s*\{/.test(style), 'missing .cluster-rect');
expect(/\.node-label\s*\{/.test(style), 'missing .node-label');

// Theming: node, edge, cluster colors
expect(/\.node-shape\s*\{[\s\S]*fill:\s*#FFEEDD;/.test(style), 'nodeBkg not applied');
expect(/\.node-shape\s*\{[\s\S]*stroke:\s*#8844AA;/.test(style), 'nodeBorder not applied');
expect(/\.node-label\s*\{[\s\S]*fill:\s*#112233;/.test(style), 'nodeTextColor not applied');
expect(/\.edge-path\s*\{[\s\S]*stroke:\s*#222222;/.test(style), 'lineColor not applied');
expect(/\.cluster-rect\s*\{[\s\S]*fill:\s*#FFFBE6;/.test(style), 'clusterBkg not applied');
expect(/\.cluster-rect\s*\{[\s\S]*stroke:\s*#AAAA33;/.test(style), 'clusterBorder not applied');

// Fonts
expect(/\.node-label\s*\{[\s\S]*font-family:\s*Trebuchet MS;/.test(style), 'fontFamily not applied');
expect(/\.node-label\s*\{[\s\S]*font-size:\s*15px;/.test(style), 'fontSize not applied');

console.log('OK renderer flowchart theme test');

