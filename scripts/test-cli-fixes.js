#!/usr/bin/env node
/* eslint-disable no-console */
import assert from 'assert';
import { execSync } from 'child_process';

function runCliFix(input, level = 'safe') {
  const flag = level === 'all' ? '--fix=all' : '--fix';
  // Feed input via stdin
  const out = execSync(`node ./out/cli.js ${flag} --dry-run --print-fixed -`, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return out.toString();
}

// Case: multiple mixed/mismatched brackets across lines must all be fixed in one CLI run
const before = `flowchart LR
    A[Text] --> B(Text]
    B --> C
    X{{Hexagon]
    S([Stadium})
    Y[(Cylinder))
`;

const expected = `flowchart LR
    A[Text] --> B[Text]
    B --> C
    X{{Hexagon}}
    S([Stadium])
    Y[(Cylinder)]
`;

const fixed = runCliFix(before, 'safe');
assert.strictEqual(fixed, expected, 'CLI --fix should multipass and fix all bracket issues');

console.log('OK test-cli-fixes: CLI multipass autofix works.');

