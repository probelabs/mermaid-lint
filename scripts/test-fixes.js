#!/usr/bin/env node
/* eslint-disable no-console */
import assert from 'assert';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outRoot = path.resolve(__dirname, '..', 'out');
const router = await import(path.join(outRoot, 'core', 'router.js'));
const fixes = await import(path.join(outRoot, 'core', 'fixes.js'));
const edits = await import(path.join(outRoot, 'core', 'edits.js'));

function validate(text, opts = {}) { return router.validate(text, opts).errors; }
function applyFixes(text, level = 'safe', opts = {}) {
  let current = text;
  for (let i = 0; i < 3; i++) {
    const res = router.validate(current, opts);
    const es = fixes.computeFixes(current, res.errors, level);
    if (!es.length) return current;
    const next = edits.applyEdits(current, es);
    if (next === current) return current;
    current = next;
  }
  return current;
}

function expectValid(text, opts = {}) {
  const errs = validate(text, opts);
  assert.strictEqual(errs.filter(e => e.severity === 'error').length, 0, 'Expected no errors');
}

const cases = [
  {
    name: 'FL-ARROW-INVALID',
    before: 'flowchart TD\nA -> B\n',
    after:  'flowchart TD\nA --> B\n'
  },
  {
    name: 'FL-LABEL-ESCAPED-QUOTE',
    before: 'flowchart TD\nA["He said \\"Hi\\""]\n'
  },
  {
    name: 'FL-LABEL-DOUBLE-IN-SINGLE',
    before: "flowchart TD\nA['He said \"Hi\"']\n",
    after:  "flowchart TD\nA['He said &quot;Hi&quot;']\n"
  },
  {
    name: 'FL-DIR-KW-INVALID',
    before: 'flowchart TD\nsubgraph S\n  foo TB\nend\n',
    after:  'flowchart TD\nsubgraph S\n  direction TB\nend\n'
  },
  {
    name: 'FL-DIR-MISSING',
    before: 'flowchart\n',
    after:  'flowchart TD\n'
  },
  {
    name: 'FL-LABEL-DOUBLE-IN-SINGLE (whole-label)',
    before: "flowchart LR\n  A['She said \"Hello\"'] --> B\n",
    after:  "flowchart LR\n  A['She said &quot;Hello&quot;'] --> B\n"
  },
  {
    name: 'FL-LINK-MISSING (all)',
    before: 'flowchart TD\nA[Foo] B[Bar]\n',
    after:  'flowchart TD\nA[Foo]  --> B[Bar]\n',
    afterLevel: 'all'
  },
  {
    name: 'FL-NODE-UNCLOSED-BRACKET',
    before: 'flowchart TD\nA[Label\n',
    afterLevel: 'all', // we treat as insertion; still valid
  },
  {
    name: 'FL-NODE-EMPTY (strip brackets)',
    before: 'flowchart TD\n    A["\"] --> B[" "]\n    B --> C[]\n',
    after:  'flowchart TD\n    A --> B\n    B --> C\n'
  },
  // Note: Flowchart quote-wrapping heuristics are intentionally not auto-fixed.
  // Pie
  { name: 'PI-LABEL-REQUIRES-QUOTES', before: 'pie\nDogs : 10\n', after: 'pie\n"Dogs" : 10\n' },
  { name: 'PI-MISSING-COLON', before: 'pie\n"Dogs" 10\n', after: 'pie\n"Dogs"  : 10\n' },
  { name: 'PI-LABEL-ESCAPED-QUOTE', before: 'pie\n"He \\"said\\"" : 1\n' },
  // Double-in-double auto-fix is intentionally disabled (unsafe). We still validate escaped-quote cases.
  { name: 'PI-QUOTE-UNCLOSED (all)', before: 'pie\n"Dogs : 10\n', afterLevel: 'all' },
  // Sequence
  { name: 'SE-MSG-COLON-MISSING', before: 'sequenceDiagram\nA->B hi\n', after: 'sequenceDiagram\nA->B : hi\n' },
  { name: 'SE-NOTE-MALFORMED', before: 'sequenceDiagram\nNote right of A Hello\n', after: 'sequenceDiagram\nNote right of A : Hello\n' },
  { name: 'SE-ELSE-IN-CRITICAL', before: 'sequenceDiagram\ncritical Do\n  else Not allowed\nend\n', after: 'sequenceDiagram\ncritical Do\n  option Not allowed\nend\n' },
  { name: 'SE-BLOCK-MISSING-END', before: 'sequenceDiagram\npar Do work\n  A->B: hi\n', afterLevel: 'safe' },
  { name: 'SE-LABEL-DOUBLE-IN-DOUBLE', before: 'sequenceDiagram\n  participant "Logger "debug"" as L\n  L->>L: hi\n', after: 'sequenceDiagram\n  participant "Logger &quot;debug&quot;" as L\n  L->>L: hi\n' },
  {
    name: 'SE-BLOCK-MISSING-END (box/insert before outdented)',
    before: 'sequenceDiagram\n  box Aqua Group\n    participant A\n    participant B\n  A->B: hi\n',
    after:  'sequenceDiagram\n  box Aqua Group\n    participant A\n    participant B\n  end\n  A->B: hi\n'
  },
  { name: 'SE-AUTONUMBER-EXTRANEOUS', before: 'sequenceDiagram\nautonumber 10 10 participant A\n', after: 'sequenceDiagram\nautonumber 10 10\nparticipant A\n' },
  { name: 'SE-AUTONUMBER-MALFORMED (all)', before: 'sequenceDiagram\nautonumber foo bar baz\nA->B: ok\n', afterLevel: 'all' },
  { name: 'SE-QUOTE-UNCLOSED (all)', before: 'sequenceDiagram\nparticipant "Bob\n', afterLevel: 'all' },
  { name: 'SE-LABEL-ESCAPED-QUOTE', before: 'sequenceDiagram\nparticipant "Logger \\"debug\\"" as L\n' },
  // SE-LABEL-DOUBLE-IN-DOUBLE is intentionally not auto-fixed (unsafe single-char rewrite).
];

let passed = 0;
for (const c of cases) {
  const level = c.afterLevel || 'safe';
  const opts = c.opts || {};
  const fixed = applyFixes(c.before, level, opts);
  if (c.after) {
    assert.strictEqual(fixed, c.after, `Fix output mismatch for ${c.name}`);
  }
  // Validate fixed content
  expectValid(fixed, opts);
  passed++;
}

console.log(`OK test-fixes: ${passed} cases passed.`);
