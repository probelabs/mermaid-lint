#!/usr/bin/env node

import * as fs from 'node:fs';
import { validate } from './core/router.js';
import type { ValidationError } from './core/types.js';

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

    const { content, filename } = readInput(args[0]);
    const { errors } = validate(content);

    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;

    if (errorCount === 0 && warningCount === 0) {
        console.log('Valid');
        process.exit(0);
    } else if (errorCount === 0) {
        // Only warnings - still valid
        if (warningCount > 0) {
            console.error(`Found ${warningCount} warning(s) in ${filename}:\n`);
            errors.filter(e => e.severity === 'warning').forEach(warning => {
                const code = warning.code ? ` [${warning.code}]` : '';
                console.error(`\x1b[33mwarning\x1b[0m: ${filename}:${warning.line}:${warning.column}${code} - ${warning.message}`);
                if (warning.hint) console.error(`        hint: ${warning.hint}`);
            });
        }
        console.log('Valid'); // File is still valid despite warnings
        process.exit(0);
    } else {
        // Has errors
        console.error(`Found ${errorCount} error(s) in ${filename}:\n`);

        errors.filter(e => e.severity === 'error').forEach(error => {
            const code = error.code ? ` [${error.code}]` : '';
            console.error(`\x1b[31merror\x1b[0m: ${filename}:${error.line}:${error.column}${code} - ${error.message}`);
            if (error.hint) console.error(`        hint: ${error.hint}`);
        });

        if (warningCount > 0) {
            console.error(`\nFound ${warningCount} warning(s) in ${filename}:\n`);
            errors.filter(e => e.severity === 'warning').forEach(warning => {
                const code = warning.code ? ` [${warning.code}]` : '';
                console.error(`\x1b[33mwarning\x1b[0m: ${filename}:${warning.line}:${warning.column}${code} - ${warning.message}`);
                if (warning.hint) console.error(`        hint: ${warning.hint}`);
            });
        }

        process.exit(1);
    }
}

main();
