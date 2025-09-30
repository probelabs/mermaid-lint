#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function runJSON(relPath) {
  try {
    const out = execSync(`node ./out/cli.js --format json "${relPath}"`, { encoding: 'utf8' });
    return JSON.parse(out);
  } catch (e) {
    const out = (e.stdout || e.stderr || '').toString();
    try { return JSON.parse(out); } catch { return null; }
  }
}

function updateType(type, root) {
  const dir = path.join(root, 'test-fixtures', type);
  const invalidDir = path.join(dir, 'invalid');
  const files = fs.readdirSync(invalidDir).filter(f => f.endsWith('.mmd')).sort();
  const expected = {};
  for (const f of files) {
    const rel = path.join('test-fixtures', type, 'invalid', f);
    const json = runJSON(rel);
    if (!json) continue;
    if (json.valid) continue; // skip if somehow valid
    const codes = [...(json.errors || []), ...(json.warnings || [])]
      .map(e => e.code).filter(Boolean);
    expected[f] = codes;
  }
  const outPath = path.join(dir, 'expected-errors.json');
  fs.writeFileSync(outPath, JSON.stringify(expected, null, 2) + '\n');
  console.log(`Updated ${outPath}`);
}

function main() {
  const arg = process.argv[2] || 'all';
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const types = arg === 'all' ? ['flowchart', 'pie', 'sequence'] : [arg];
  for (const t of types) updateType(t, root);
}

main();

