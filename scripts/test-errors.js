#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function runLinterJSON(relPath) {
  const cmd = `node ./out/cli.js --format json "${relPath}"`;
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    return JSON.parse(out);
  } catch (e) {
    const out = (e.stdout || e.stderr || '').toString();
    try { return JSON.parse(out); } catch {
      throw new Error(`Failed to parse JSON output for ${relPath}:\n${out}`);
    }
  }
}

function runType(type, root) {
  const fixturesDir = path.join(root, 'test-fixtures', type);
  const expectedPath = path.join(fixturesDir, 'expected-errors.json');
  if (!fs.existsSync(expectedPath)) {
    console.error(`No expected-errors.json for type: ${type}`);
    return { passed: 0, failed: 1 };
  }
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
  const files = Object.keys(expected).sort();
  let passed = 0, failed = 0;
  console.log(`\n== ${type.toUpperCase()} ==`);
  for (const file of files) {
    const rel = path.join('test-fixtures', type, 'invalid', file);
    const json = runLinterJSON(rel);
    const codes = [...(json.errors || []), ...(json.warnings || [])].map(e => e.code).filter(Boolean);
    const need = expected[file];
    const missing = need.filter(code => !codes.includes(code));
    if (missing.length === 0) {
      console.log(`✓ ${file} → ${need.join(', ')}`);
      passed++;
    } else {
      console.log(`✗ ${file} → missing codes: ${missing.join(', ')} (got: ${codes.join(', ')})`);
      failed++;
    }
  }
  return { passed, failed };
}

function main() {
  const arg = process.argv[2] || 'all';
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const types = arg === 'all' ? ['flowchart', 'pie', 'sequence'] : [arg];
  let totalP = 0, totalF = 0;
  for (const t of types) {
    const { passed, failed } = runType(t, root);
    totalP += passed; totalF += failed;
  }
  console.log(`\nSummary: ${totalP} passed, ${totalF} failed`);
  process.exit(totalF === 0 ? 0 : 1);
}

main();
