#!/usr/bin/env node

import * as fs from 'node:fs';
import { validate } from './core/router.js';
import type { ValidationError } from './core/types.js';
import { toJsonResult, textReport } from './core/format.js';

// Main CLI execution
function printUsage() {
    console.log('Usage: mermaid-lint <file.mmd>');
    console.log('       cat diagram.mmd | mermaid-lint -');
}

function readInput(arg: string): { content: string; filename: string } {
    if (arg === '-') {
        return { content: fs.readFileSync(0, 'utf8'), filename: '<stdin>' };
    }
    if (!fs.existsSync(arg)) {
        console.error(`File not found: ${arg}`);
        process.exit(1);
    }
    return { content: fs.readFileSync(arg, 'utf8'), filename: arg };
}

function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
        printUsage();
        process.exit(args.length === 0 ? 1 : 0);
    }

    // simple arg parsing: --format json|text (consume flag + value) and --strict
    let format: 'text' | 'json' = 'text';
    let strict = false;
    const positionals: string[] = [];
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--format' || a === '-f') {
            const v = (args[i + 1] || '').toLowerCase();
            if (v === 'json' || v === 'text') { format = v as any; i++; continue; }
        }
        if (a === '--strict' || a === '-s') { strict = true; continue; }
        if (!a.startsWith('-')) positionals.push(a);
    }
    const target = positionals[0] || args[0];
    const { content, filename } = readInput(target);
    const { errors } = validate(content, { strict });

    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;

    if (format === 'json') {
        const json = toJsonResult(filename, errors);
        console.log(JSON.stringify(json, null, 2));
        process.exit(json.valid ? 0 : 1);
    } else {
        // Text output: caret-underlined snippets without border lines
        const report = textReport(filename, content, errors);
        const outTo = errorCount > 0 ? 'stderr' : 'stdout';
        if (outTo === 'stderr') console.error(report); else console.log(report);
        process.exit(errorCount > 0 ? 1 : 0);
    }
}

main();
