#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { globby } from 'globby';
import { validate, detectDiagramType } from './core/router.js';
import type { ValidationError } from './core/types.js';
import { toJsonResult, textReport } from './core/format.js';
import { extractMermaidBlocks, offsetErrors } from './core/markdown.js';

// Main CLI execution
function printUsage() {
    console.log('Usage: maid <file>');
    console.log('       cat file | maid -');
    console.log('       maid <directory>');
    console.log('  - Validates standalone .mmd files or Markdown with ```mermaid fences');
    console.log('  - When a directory is given, scans recursively for .md/.markdown/.mdx/.mmd/.mermaid');
    console.log('Options:');
    console.log('  --include, -I   Glob(s) to include (repeatable or comma-separated)');
    console.log('  --exclude, -E   Glob(s) to exclude (repeatable or comma-separated)');
    console.log('  --no-gitignore  Do not respect .gitignore when scanning directories');
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

function isDirectory(p: string) {
    try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

const DEFAULT_INCLUDE_GLOBS = [
  '**/*.md',
  '**/*.markdown',
  '**/*.mdx',
  '**/*.mmd',
  '**/*.mermaid',
];

const DEFAULT_IGNORE_DIRS = [
  '**/.git/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.vercel/**',
  '**/.cache/**',
  '**/coverage/**'
];

async function listCandidateFiles(root: string, includes: string[], excludes: string[], useGitignore: boolean): Promise<string[]> {
    const patterns = includes.length > 0 ? includes : DEFAULT_INCLUDE_GLOBS;
    const ignore = [
      ...excludes,
      ...(useGitignore ? [] : DEFAULT_IGNORE_DIRS),
    ];
    const cwdAbs = path.resolve(root);
    const files = await globby(patterns, {
      cwd: cwdAbs,
      absolute: true,
      dot: true,
      gitignore: useGitignore,
      ignore,
      followSymbolicLinks: false,
    });
    return files.sort();
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
        printUsage();
        process.exit(args.length === 0 ? 1 : 0);
    }

    // simple arg parsing: --format json|text (consume flag + value), --strict,
    // directory options: --include/-I, --exclude/-E, --no-gitignore
    let format: 'text' | 'json' = 'text';
    let strict = false;
    let includeGlobs: string[] = [];
    let excludeGlobs: string[] = [];
    let useGitignore = true;
    const positionals: string[] = [];
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--format' || a === '-f') {
            const v = (args[i + 1] || '').toLowerCase();
            if (v === 'json' || v === 'text') { format = v as any; i++; continue; }
        }
        if (a === '--strict' || a === '-s') { strict = true; continue; }
        if (a === '--include' || a === '-I') {
            const v = args[i + 1];
            if (v) {
                includeGlobs.push(...v.split(',').map(s => s.trim()).filter(Boolean));
                i++; continue;
            }
        }
        if (a === '--exclude' || a === '-E') {
            const v = args[i + 1];
            if (v) {
                excludeGlobs.push(...v.split(',').map(s => s.trim()).filter(Boolean));
                i++; continue;
            }
        }
        if (a === '--no-gitignore') { useGitignore = false; continue; }
        if (a === '--gitignore') { useGitignore = true; continue; }
        if (!a.startsWith('-')) positionals.push(a);
    }
    const target = positionals[0] || args[0];
    // Directory mode
    if (isDirectory(target)) {
        const files = await listCandidateFiles(target, includeGlobs, excludeGlobs, useGitignore);
        type FileResult = { file: string; content: string; errors: ValidationError[] };
        const results: FileResult[] = [];
        let diagramCount = 0;
        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const blocks = extractMermaidBlocks(content);
            let errs: ValidationError[] = [];
            if (blocks.length > 0) {
                diagramCount += blocks.length;
                for (const b of blocks) {
                    const { errors: blockErrors } = validate(b.content, { strict });
                    if (blockErrors.length) errs = errs.concat(offsetErrors(blockErrors, b.startLine - 1));
                }
            } else {
                const kind = detectDiagramType(content);
                if (kind !== 'unknown') {
                    diagramCount++;
                    const res = validate(content, { strict });
                    errs = res.errors;
                }
            }
            if (errs.length > 0) {
                results.push({ file, content, errors: errs });
            }
        }
        // Output and exit code
        if (format === 'json') {
            const jsonFiles = files.map((file) => {
                const found = results.find(r => r.file === file);
                const errs = found ? found.errors : [];
                const json = toJsonResult(file, errs);
                return json;
            });
            const totalErrors = jsonFiles.reduce((n, jf) => n + (jf.errorCount || 0), 0);
            const totalWarnings = jsonFiles.reduce((n, jf) => n + (jf.warningCount || 0), 0);
            const overallValid = totalErrors === 0;
            const payload = { valid: overallValid, files: jsonFiles, errorCount: totalErrors, warningCount: totalWarnings, diagramCount };
            console.log(JSON.stringify(payload, null, 2));
            process.exit(overallValid ? 0 : 1);
        } else {
            if (results.length === 0) {
                console.log(diagramCount === 0 ? 'No Mermaid diagrams found.' : 'All diagrams valid.');
                process.exit(0);
            }
            for (const r of results) {
                const report = textReport(r.file, r.content, r.errors);
                // Ensure clear separation between files
                console.error(report.trimEnd());
            }
            process.exit(1);
        }
        return; // directory handled
    }

    // Single-file or stdin mode
    const { content, filename } = readInput(target);
    // If the file contains one or more ```mermaid fences, validate each block
    const blocks = extractMermaidBlocks(content);
    let errors: ValidationError[] = [];
    let diagramsFound = false;
    if (blocks.length > 0) {
        diagramsFound = true;
        for (const b of blocks) {
            const { errors: blockErrors } = validate(b.content, { strict });
            errors = errors.concat(offsetErrors(blockErrors, b.startLine - 1));
        }
    } else {
        // If no mermaid fences found, only validate whole file when it looks like a diagram.
        const kind = detectDiagramType(content);
        if (kind !== 'unknown') {
            diagramsFound = true;
            const res = validate(content, { strict });
            errors = res.errors;
        } else {
            errors = []; // No diagrams detected in file; treat as valid
        }
    }

    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;

    if (format === 'json') {
        const json = toJsonResult(filename, errors);
        // include a hint field for clients, without breaking structure
        (json as any).diagramCount = diagramsFound ? 1 : 0;
        console.log(JSON.stringify(json, null, 2));
        process.exit(json.valid ? 0 : 1);
    } else {
        // Text output: caret-underlined snippets without border lines
        if (errorCount === 0 && !diagramsFound) {
            console.log('No Mermaid diagrams found.');
        } else {
            const report = textReport(filename, content, errors);
            const outTo = errorCount > 0 ? 'stderr' : 'stdout';
            if (outTo === 'stderr') console.error(report); else console.log(report);
        }
        process.exit(errorCount > 0 ? 1 : 0);
    }
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
