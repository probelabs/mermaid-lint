#!/usr/bin/env node

import { execSync } from 'child_process';

function run(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || e.stderr || e.message || '').toString() };
  }
}

function main() {
  // JSON mode should return a per-file summary and overall valid:false
  const j = run('node ./out/cli.js --format json test-fixtures/docs-tree');
  if (j.code === 0) throw new Error('Expected non-zero exit code for directory with errors');
  const json = JSON.parse(j.out);
  if (json.valid !== false) throw new Error('Expected valid:false');
  if (!Array.isArray(json.files) || json.files.length < 3) throw new Error('Expected at least 3 scanned files');
  const hasBad = json.files.find(f => /bad\.md$/.test(f.file));
  if (!hasBad || hasBad.errorCount < 1) throw new Error('Expected errors in bad.md');
  const hasStray = json.files.find(f => /stray\.mmd$/.test(f.file));
  if (!hasStray || hasStray.errorCount < 1) throw new Error('Expected errors in stray.mmd');

  // Text mode: should print something and exit non-zero
  const t = run('node ./out/cli.js test-fixtures/docs-tree');
  if (t.code === 0) throw new Error('Expected non-zero exit code in text mode');
  if (!/bad\.md/.test(t.out) || !/stray\.mmd/.test(t.out)) throw new Error('Output should include file paths');

  console.log('Directory scan test passed.');

  // Gitignore-respecting scan: should ignore sub/stray.mmd due to .gitignore
  const j2 = run('node ./out/cli.js --format json test-fixtures/docs-tree-ignored');
  if (j2.code !== 1) throw new Error('Expected non-zero exit code for docs-tree-ignored (still has bad.md error)');
  const json2 = JSON.parse(j2.out);
  if (!json2.files.find(f => /bad\.md$/.test(f.file))) throw new Error('Expected bad.md present');
  if (json2.files.find(f => /sub\/stray\.mmd$/.test(f.file))) throw new Error('stray.mmd should be ignored by .gitignore');

  // Include/Exclude: exclude bad.md; only stray.mmd remains as error
  const j3 = run('node ./out/cli.js --format json -E "**/bad.md" test-fixtures/docs-tree');
  if (j3.code !== 1) throw new Error('Expected non-zero exit (stray still errors)');
  const json3 = JSON.parse(j3.out);
  if (json3.files.find(f => /bad\.md$/.test(f.file))) throw new Error('bad.md should be excluded');

  // Include only .mmd and exclude stray.mmd; should be all valid
  const j4 = run('node ./out/cli.js --format json -I "**/*.mmd" -E "**/stray.mmd" test-fixtures/docs-tree');
  if (j4.code !== 0) throw new Error('Expected zero exit when includes/excludes filter out errors');
  const json4 = JSON.parse(j4.out);
  if (json4.valid !== true) throw new Error('Expected valid:true');
}

main();
