import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const path = resolve('out-cjs/package.json');
await mkdir(dirname(path), { recursive: true });
await writeFile(path, JSON.stringify({ type: 'commonjs' }, null, 2), 'utf8');
console.log('Wrote out-cjs/package.json { "type": "commonjs" }');

