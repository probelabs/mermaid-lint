#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const globby_1 = require("globby");
const router_js_1 = require("./core/router.js");
const format_js_1 = require("./core/format.js");
const markdown_js_1 = require("./core/markdown.js");
const fixes_js_1 = require("./core/fixes.js");
const edits_js_1 = require("./core/edits.js");
function autoFixMultipass(text, strict, level) {
    let current = text;
    for (let i = 0; i < 5; i++) {
        const res = (0, router_js_1.validate)(current, { strict });
        const edits = (0, fixes_js_1.computeFixes)(current, res.errors, level);
        if (edits.length === 0)
            return { fixed: current, errors: res.errors };
        const next = (0, edits_js_1.applyEdits)(current, edits);
        if (next === current)
            return { fixed: current, errors: res.errors };
        current = next;
    }
    const finalRes = (0, router_js_1.validate)(current, { strict });
    return { fixed: current, errors: finalRes.errors };
}
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
    console.log('  --strict, -s    Enable strict mode (require quoted labels inside shapes)');
    console.log('  --format, -f    Output format: text|json (default: text)');
    console.log('  --fix[=all]     Apply auto-fixes (safe by default; all for heuristics)');
    console.log('  --dry-run, -n   Do not write files (useful with --fix)');
    console.log('  --print-fixed   With --fix, print fixed content for a single file/stdin');
}
function readInput(arg) {
    if (arg === '-') {
        return { content: fs.readFileSync(0, 'utf8'), filename: '<stdin>' };
    }
    if (!fs.existsSync(arg)) {
        console.error(`File not found: ${arg}`);
        process.exit(1);
    }
    return { content: fs.readFileSync(arg, 'utf8'), filename: arg };
}
function isDirectory(p) {
    try {
        return fs.statSync(p).isDirectory();
    }
    catch {
        return false;
    }
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
async function listCandidateFiles(root, includes, excludes, useGitignore) {
    const patterns = includes.length > 0 ? includes : DEFAULT_INCLUDE_GLOBS;
    const ignore = [
        ...excludes,
        ...(useGitignore ? [] : DEFAULT_IGNORE_DIRS),
    ];
    const cwdAbs = path.resolve(root);
    const files = await (0, globby_1.globby)(patterns, {
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
    // --fix[=all], --dry-run/-n (do not write), --print-fixed (stdout fixed content for single file),
    // directory options: --include/-I, --exclude/-E, --no-gitignore
    let format = 'text';
    let strict = false;
    let fixLevel = null; // null means no fixing
    let dryRun = false;
    let printFixed = false;
    let includeGlobs = [];
    let excludeGlobs = [];
    let useGitignore = true;
    const positionals = [];
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--format' || a === '-f') {
            const v = (args[i + 1] || '').toLowerCase();
            if (v === 'json' || v === 'text') {
                format = v;
                i++;
                continue;
            }
        }
        if (a === '--strict' || a === '-s') {
            strict = true;
            continue;
        }
        if (a === '--fix' || a.startsWith('--fix=')) {
            if (a === '--fix')
                fixLevel = 'safe';
            else {
                const v = a.split('=')[1]?.toLowerCase();
                fixLevel = v === 'all' ? 'all' : 'safe';
            }
            continue;
        }
        if (a === '--dry-run' || a === '-n') {
            dryRun = true;
            continue;
        }
        if (a === '--print-fixed') {
            printFixed = true;
            continue;
        }
        if (a === '--include' || a === '-I') {
            const v = args[i + 1];
            if (v) {
                includeGlobs.push(...v.split(',').map(s => s.trim()).filter(Boolean));
                i++;
                continue;
            }
        }
        if (a === '--exclude' || a === '-E') {
            const v = args[i + 1];
            if (v) {
                excludeGlobs.push(...v.split(',').map(s => s.trim()).filter(Boolean));
                i++;
                continue;
            }
        }
        if (a === '--no-gitignore') {
            useGitignore = false;
            continue;
        }
        if (a === '--gitignore') {
            useGitignore = true;
            continue;
        }
        if (a === '-' || !a.startsWith('-'))
            positionals.push(a);
    }
    const target = positionals[0] || args[0];
    // Directory mode
    if (isDirectory(target)) {
        const files = await listCandidateFiles(target, includeGlobs, excludeGlobs, useGitignore);
        const results = [];
        let diagramCount = 0;
        let modifiedCount = 0;
        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const ext = path.extname(file).toLowerCase();
            const isMermaidFile = ext === '.mmd' || ext === '.mermaid';
            const blocks = (0, markdown_js_1.extractMermaidBlocks)(content);
            let errs = [];
            let newContent = null;
            if (blocks.length > 0) {
                diagramCount += blocks.length;
                // Optionally fix each block and reassemble file
                if (fixLevel) {
                    const lines = content.split(/\r?\n/);
                    // Rebuild by replacing each block with its multipass-fixed content
                    let accLines = [...lines];
                    for (const b of blocks) {
                        const { fixed: fixedBlock } = autoFixMultipass(b.content, strict, fixLevel);
                        if (fixedBlock !== b.content) {
                            const realStart = b.startLine - 1;
                            const realEnd = b.endLine - 2;
                            const before = accLines.slice(0, realStart);
                            const after = accLines.slice(realEnd + 1);
                            const fixedLines = fixedBlock.split('\n');
                            accLines = before.concat(fixedLines, after);
                        }
                    }
                    newContent = accLines.join('\n');
                    if (newContent !== null && !dryRun) {
                        fs.writeFileSync(file, newContent, 'utf8');
                        modifiedCount++;
                    }
                    // Validate result content (new or original)
                    const checkText = newContent ?? content;
                    const freshBlocks = (0, markdown_js_1.extractMermaidBlocks)(checkText);
                    for (const b of freshBlocks) {
                        const { errors: blockErrors2 } = (0, router_js_1.validate)(b.content, { strict });
                        if (blockErrors2.length)
                            errs = errs.concat((0, markdown_js_1.offsetErrors)(blockErrors2, b.startLine - 1));
                    }
                }
                else {
                    for (const b of blocks) {
                        const { errors: blockErrors } = (0, router_js_1.validate)(b.content, { strict });
                        if (blockErrors.length)
                            errs = errs.concat((0, markdown_js_1.offsetErrors)(blockErrors, b.startLine - 1));
                    }
                }
            }
            else {
                const kind = (0, router_js_1.detectDiagramType)(content);
                if (kind !== 'unknown') {
                    diagramCount++;
                    if (fixLevel) {
                        const { fixed, errors: afterErrs } = autoFixMultipass(content, strict, fixLevel);
                        if (fixed !== content && !dryRun) {
                            fs.writeFileSync(file, fixed, 'utf8');
                            modifiedCount++;
                        }
                        errs = afterErrs;
                    }
                    else {
                        const res = (0, router_js_1.validate)(content, { strict });
                        errs = res.errors;
                    }
                }
                else if (isMermaidFile) {
                    // Mermaid file without header → invalid
                    diagramCount++;
                    const res = (0, router_js_1.validate)(content, { strict });
                    errs = res.errors; // expect GEN-HEADER-INVALID
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
                const json = (0, format_js_1.toJsonResult)(file, errs);
                return json;
            });
            const totalErrors = jsonFiles.reduce((n, jf) => n + (jf.errorCount || 0), 0);
            const totalWarnings = jsonFiles.reduce((n, jf) => n + (jf.warningCount || 0), 0);
            const overallValid = totalErrors === 0;
            const payload = { valid: overallValid, files: jsonFiles, errorCount: totalErrors, warningCount: totalWarnings, diagramCount };
            console.log(JSON.stringify(payload, null, 2));
            process.exit(overallValid ? 0 : 1);
        }
        else {
            if (results.length === 0) {
                if (diagramCount === 0)
                    console.log('No Mermaid diagrams found.');
                else
                    console.log(modifiedCount > 0 ? `All diagrams valid after fixes. Modified ${modifiedCount} file(s).` : 'All diagrams valid.');
                process.exit(0);
            }
            for (const r of results) {
                const report = (0, format_js_1.textReport)(r.file, r.content, r.errors);
                // Ensure clear separation between files
                console.error(report.trimEnd());
            }
            process.exit(1);
        }
        return; // directory handled
    }
    // Single-file or stdin mode
    const { content, filename } = readInput(target);
    const fileExt = filename === '<stdin>' ? '' : path.extname(filename).toLowerCase();
    const isMermaidFile = fileExt === '.mmd' || fileExt === '.mermaid';
    // If the file contains one or more ```mermaid fences, validate each block
    const blocks = (0, markdown_js_1.extractMermaidBlocks)(content);
    let errors = [];
    let diagramsFound = false;
    if (blocks.length > 0) {
        diagramsFound = true;
        if (fixLevel) {
            // Fix each block (multipass) and reconstruct
            const lines = content.split(/\r?\n/);
            let accLines = [...lines];
            for (const b of blocks) {
                const { fixed: fixedBlock } = autoFixMultipass(b.content, strict, fixLevel);
                if (fixedBlock !== b.content) {
                    const realStart = b.startLine - 1;
                    const realEnd = b.endLine - 2;
                    const before = accLines.slice(0, realStart);
                    const after = accLines.slice(realEnd + 1);
                    const fixedLines = fixedBlock.split('\n');
                    accLines = before.concat(fixedLines, after);
                }
            }
            const fixed = accLines.join('\n');
            const err2 = [];
            const newBlocks = (0, markdown_js_1.extractMermaidBlocks)(fixed);
            for (const b of newBlocks) {
                const { errors: blockErrors2 } = (0, router_js_1.validate)(b.content, { strict });
                err2.push(...(0, markdown_js_1.offsetErrors)(blockErrors2, b.startLine - 1));
            }
            if (!dryRun && filename !== '<stdin>') {
                fs.writeFileSync(filename, fixed, 'utf8');
            }
            if (printFixed || filename === '<stdin>') {
                // Print only the fixed content when requested or on stdin
                process.stdout.write(fixed);
            }
            errors = err2;
        }
        else {
            for (const b of blocks) {
                const { errors: blockErrors } = (0, router_js_1.validate)(b.content, { strict });
                errors = errors.concat((0, markdown_js_1.offsetErrors)(blockErrors, b.startLine - 1));
            }
        }
    }
    else {
        // If no mermaid fences found, only validate whole file when it looks like a diagram.
        const kind = (0, router_js_1.detectDiagramType)(content);
        if (kind !== 'unknown') {
            diagramsFound = true;
            if (fixLevel) {
                const { fixed, errors: afterErrs } = autoFixMultipass(content, strict, fixLevel);
                if (!dryRun && filename !== '<stdin>')
                    fs.writeFileSync(filename, fixed, 'utf8');
                if (printFixed || filename === '<stdin>')
                    process.stdout.write(fixed);
                errors = afterErrs;
            }
            else {
                const res = (0, router_js_1.validate)(content, { strict });
                errors = res.errors;
            }
        }
        else {
            if (isMermaidFile) {
                // Treat standalone Mermaid files without a proper header as invalid
                diagramsFound = true;
                const res = (0, router_js_1.validate)(content, { strict });
                errors = res.errors; // will include GEN-HEADER-INVALID
            }
            else {
                errors = []; // No diagrams detected (Markdown or other) → success
            }
        }
    }
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;
    if (format === 'json') {
        const json = (0, format_js_1.toJsonResult)(filename, errors);
        // include a hint field for clients, without breaking structure
        json.diagramCount = diagramsFound ? 1 : 0;
        console.log(JSON.stringify(json, null, 2));
        process.exit(json.valid ? 0 : 1);
    }
    else {
        // Text output: caret-underlined snippets without border lines
        if (!fixLevel) {
            if (errorCount === 0 && !diagramsFound) {
                console.log('No Mermaid diagrams found.');
            }
            else {
                const report = (0, format_js_1.textReport)(filename, content, errors);
                const outTo = errorCount > 0 ? 'stderr' : 'stdout';
                if (outTo === 'stderr')
                    console.error(report);
                else
                    console.log(report);
            }
        }
        process.exit(errorCount > 0 ? 1 : 0);
    }
}
main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
