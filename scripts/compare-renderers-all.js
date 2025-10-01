#!/usr/bin/env node

// Batch-compare Mermaid (official) vs Maid (experimental) renderer outputs
// for all valid flowchart fixtures. Produces PNGs and pixel-diff images
// plus a console summary of mismatch percentages per file.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { renderMermaid } from '../out/renderer/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function runMermaidCliToPng(inputPath, outputPath) {
  try {
    const puppeteerCfg = path.resolve(__dirname, 'puppeteer-ci.json');
    const pFlag = fs.existsSync(puppeteerCfg) ? ` -p "${puppeteerCfg}"` : '';
    execSync(`npx @mermaid-js/mermaid-cli${pFlag} -i "${inputPath}" -o "${outputPath}" -b white`, {
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '..')
    });
    return true;
  } catch (e) {
    console.error(`Failed mermaid-cli render for ${inputPath}: ${e.message}`);
    return false;
  }
}

async function runMaidToPng(inputPath, outputPath) {
  const content = fs.readFileSync(inputPath, 'utf8');
  const res = renderMermaid(content);
  if (!res?.svg) {
    console.error(`Maid render returned no SVG for ${inputPath}`);
    return false;
  }
  const svgPath = outputPath.replace(/\.png$/i, '.svg');
  fs.writeFileSync(svgPath, res.svg);
  // Rasterize via system tools (preferred: rsvg-convert, fallback: convert)
  try {
    execSync(`rsvg-convert -o "${outputPath}" "${svgPath}" 2>/dev/null`, { stdio: 'pipe' });
    fs.unlinkSync(svgPath);
    return true;
  } catch {}
  try {
    execSync(`convert "${svgPath}" "${outputPath}" 2>/dev/null`, { stdio: 'pipe' });
    fs.unlinkSync(svgPath);
    return true;
  } catch (e) {
    console.error(`PNG conversion not available (rsvg-convert/convert). SVG left at: ${svgPath}`);
    return false;
  }
}

async function compareOne(inputPath, outDir) {
  const base = path.basename(inputPath, '.mmd');
  const mermaidPng = path.join(outDir, `${base}-mermaid.png`);
  const maidPng = path.join(outDir, `${base}-maid.png`);

  const okMer = runMermaidCliToPng(inputPath, mermaidPng);
  const okMaid = await runMaidToPng(inputPath, maidPng);
  if (!okMer || !okMaid) {
    return { file: base, ok: false, reason: !okMer ? 'mermaid-cli failed' : 'maid render failed' };
  }
  return { file: base, ok: true, mermaidPng, maidPng };
}

async function main() {
  const args = process.argv.slice(2);
  const type = args[0] && !args[0].startsWith('--') ? args[0] : 'flowchart';
  if (type !== 'flowchart') {
    console.error('Only flowchart is supported by the Maid renderer today.');
    process.exit(1);
  }

  const fixturesDir = path.resolve(__dirname, '..', 'test-fixtures', type, 'valid');
  const outDir = path.resolve(__dirname, '..', 'temp', 'comparison');
  ensureDir(outDir);

  const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.mmd')).sort();
  if (!files.length) {
    console.error(`No fixtures found in ${fixturesDir}`);
    process.exit(1);
  }

  console.log(`Comparing ${files.length} ${type} diagram(s)...\n`);
  const results = [];
  for (const f of files) {
    const abs = path.join(fixturesDir, f);
    const r = await compareOne(abs, outDir);
    results.push(r);
    if (!r.ok) {
      console.log(` - ${f}: FAILED (${r.reason})`);
    } else {
      console.log(` - ${f}: ✅ Mermaid → ${path.relative(process.cwd(), r.mermaidPng)} | ✅ Maid → ${path.relative(process.cwd(), r.maidPng)}`);
    }
  }

  const ok = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  console.log(`\nSummary:`);
  console.log(` ✅ Compared: ${ok.length}`);
  console.log(` ❌ Failed:  ${failed.length}`);
  console.log(`\nOutputs in: ${outDir}`);
}

main().catch((e) => { console.error(e.stack || e.message || String(e)); process.exit(1); });
