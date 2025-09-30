#!/usr/bin/env node
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ESM import from built entry
const esm = await import(resolve(__dirname, '../out/index.js'));
assert.ok(typeof esm.validate === 'function', 'validate (ESM) should be exported');

const ok = 'flowchart TD\n  A[Start] --> B[End]\n';
const bad = 'flowchart TD\n  A["He said \"Hi\""]\n';

let res = esm.validate(ok);
assert.equal(res.type, 'flowchart');
assert.equal(res.errors.length, 0);

res = esm.validate(bad);
assert.equal(res.type, 'flowchart');
assert.ok(res.errors.length > 0);

const fixed = esm.fixText(bad, { level: 'safe' });
assert.ok(fixed.fixed.includes('&quot;'));

console.log('SDK smoke test passed (ESM).');
