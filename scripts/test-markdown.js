#!/usr/bin/env node

import fs from 'node:fs';
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

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  const rel = 'test-fixtures/markdown/mixed.md';
  const full = path.resolve(rel);
  const content = fs.readFileSync(full, 'utf8');
  const lines = content.split(/\r?\n/);
  const lineAEmpty = lines.findIndex(l => /A\[""\]/.test(l)) + 1;
  const lineAnd = lines.findIndex(l => /\band Also not allowed\b/.test(l)) + 1;
  if (lineAEmpty <= 0 || lineAnd <= 0) {
    throw new Error('Fixture markers not found in mixed.md');
  }

  const json = runLinterJSON(rel);
  const all = [...(json.errors || []), ...(json.warnings || [])];

  const hasFlowEmpty = all.find(e => e.code === 'FL-NODE-EMPTY' && e.line === lineAEmpty);
  const hasAndOutsidePar = all.find(e => e.code === 'SE-AND-OUTSIDE-PAR' && e.line === lineAnd);

  assert(Boolean(hasFlowEmpty), `Expected FL-NODE-EMPTY at line ${lineAEmpty}, got: ${JSON.stringify(all, null, 2)}`);
  assert(Boolean(hasAndOutsidePar), `Expected SE-AND-OUTSIDE-PAR at line ${lineAnd}, got: ${JSON.stringify(all, null, 2)}`);

  console.log('Markdown extraction test passed.');
}

main();

