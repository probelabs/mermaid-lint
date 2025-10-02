#!/usr/bin/env node
// Generate Mermaid-CLI SVG and Maid SVG for a given .mmd, and print a quick structural/color diff.

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runMermaidCli(inputPath, outSvg) {
  const puppeteerCfg = path.resolve(__dirname, 'puppeteer-ci.json');
  const pFlag = fs.existsSync(puppeteerCfg) ? ` -p "${puppeteerCfg}"` : '';
  execSync(`npx @mermaid-js/mermaid-cli${pFlag} -i "${inputPath}" -o "${outSvg}"`, { stdio: 'pipe', cwd: path.resolve(__dirname, '..') });
  return fs.readFileSync(outSvg, 'utf8');
}

async function runMaid(inputPath, outSvg) {
  const { renderMermaid } = await import('../out/renderer/index.js');
  const text = fs.readFileSync(inputPath, 'utf8');
  const { svg } = renderMermaid(text);
  fs.writeFileSync(outSvg, svg, 'utf8');
  return svg;
}

function extractFills(svg) {
  return Array.from(svg.matchAll(/\sfill="([^"]+)"/g)).map(m => m[1]);
}

function extractStrokes(svg) {
  return Array.from(svg.matchAll(/\sstroke="([^"]+)"/g)).map(m => m[1]);
}

function summarize(svg) {
  const fills = extractFills(svg);
  const strokes = extractStrokes(svg);
  const uniq = (arr) => Array.from(new Set(arr));
  const paths = (svg.match(/<path\b/g) || []).length;
  const rects = (svg.match(/<rect\b/g) || []).length;
  const texts = (svg.match(/<text\b/g) || []).length;
  const hasLegend = /<g class=\"legend\"/.test(svg) || /\blegend\b/.test(svg);
  return {
    paths, rects, texts, hasLegend,
    fills: uniq(fills).slice(0, 24),
    strokes: uniq(strokes).slice(0, 24)
  };
}

function diffArrays(a, b) {
  const onlyA = a.filter(x => !b.includes(x));
  const onlyB = b.filter(x => !a.includes(x));
  return { onlyA, onlyB };
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node scripts/compare-render-svg.js <diagram.mmd>');
    process.exit(1);
  }
  const abs = path.resolve(input);
  const tmp = path.resolve(__dirname, '..', '.tmp-compare');
  fs.mkdirSync(tmp, { recursive: true });
  const merSvgPath = path.join(tmp, 'mermaid.svg');
  const maidSvgPath = path.join(tmp, 'maid.svg');

  console.log('Rendering with mermaid-cli…');
  const mer = runMermaidCli(abs, merSvgPath);
  console.log('Rendering with Maid…');
  const ours = await runMaid(abs, maidSvgPath);

  const s1 = summarize(mer);
  const s2 = summarize(ours);

  console.log('\nMermaid summary:', s1);
  console.log('Maid summary:', s2);

  const fd = diffArrays(s1.fills, s2.fills);
  if (fd.onlyA.length || fd.onlyB.length) {
    console.log('\nFill palette differences:');
    if (fd.onlyA.length) console.log('  Only in Mermaid:', fd.onlyA);
    if (fd.onlyB.length) console.log('  Only in Maid   :', fd.onlyB);
  } else {
    console.log('\nFill palette: match (first 24 uniques)');
  }

  const sd = diffArrays(s1.strokes, s2.strokes);
  if (sd.onlyA.length || sd.onlyB.length) {
    console.log('\nStroke color differences:');
    if (sd.onlyA.length) console.log('  Only in Mermaid:', sd.onlyA);
    if (sd.onlyB.length) console.log('  Only in Maid   :', sd.onlyB);
  } else {
    console.log('\nStroke colors: match (first 24 uniques)');
  }

  console.log(`\nSaved SVGs to: \n  Mermaid: ${merSvgPath}\n  Maid   : ${maidSvgPath}`);
}

main().catch(e => { console.error(e.stack || e.message || String(e)); process.exit(1); });

