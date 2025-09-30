#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

function runJSON(file) {
  const out = execSync(`node ./out/cli.js --format json "${file}"`, { encoding: 'utf8' });
  return JSON.parse(out);
}

const files = [
  'test-fixtures/unsupported/class-diagram.mmd',
  'test-fixtures/unsupported/state-v2.mmd',
];

let ok = 0;
for (const f of files) {
  const res = runJSON(f);
  assert.equal(res.valid, true, `${f}: expected valid for unsupported diagram type`);
  assert.equal(res.errorCount, 0, `${f}: expected zero errors`);
  ok++;
}
console.log(`Unsupported diagram pass-through: ${ok}/${files.length} OK`);

