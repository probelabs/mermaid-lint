#!/usr/bin/env node

import * as fs from 'node:fs';
import { tokenize, InvalidArrow } from './chevrotain-lexer.js';
import { parse } from './chevrotain-parser.js';
import type { ILexingError, IRecognitionException, IToken } from 'chevrotain';

interface ValidationError {
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
}

function validateWithChevrotain(text: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = text.split('\n');
    
    // First do basic validation
    const firstNonEmptyLine = lines.find(line => line.trim() && !line.trim().startsWith('%%'));
    if (!firstNonEmptyLine || !firstNonEmptyLine.match(/^\s*(graph|flowchart)\s/)) {
        errors.push({
            line: 1,
            column: 1,
            message: 'Diagram must start with "graph" or "flowchart"',
            severity: 'error'
        });
        return errors;
    }
    
    // Tokenize
    const lexResult = tokenize(text);
    
    // Check for lexer errors
    if (lexResult.errors.length > 0) {
        lexResult.errors.forEach((error: ILexingError) => {
            errors.push({
                line: error.line ?? 1,
                column: error.column ?? 1,
                message: error.message,
                severity: 'error'
            });
        });
    }
    
    // Check for invalid arrows in tokens
    lexResult.tokens.forEach((token: IToken) => {
        if (token.tokenType === InvalidArrow) {
            errors.push({
                line: token.startLine ?? 1,
                column: token.startColumn ?? 1,
                message: 'Invalid arrow syntax: -> (use --> instead)',
                severity: 'error'
            });
        }
    });
    
    // Parse if no critical lexer errors
    if (errors.filter(e => e.severity === 'error').length === 0) {
        const parseResult = parse(lexResult.tokens);
        
        // Check for parser errors
        if (parseResult.errors.length > 0) {
            parseResult.errors.forEach((error: IRecognitionException) => {
                const token = error.token;
                errors.push({
                    line: token?.startLine ?? 1,
                    column: token?.startColumn ?? 1,
                    message: error.message || 'Parser error',
                    severity: 'error'
                });
            });
        }
    }
    
    // Additional semantic validation (keep compatibility with mermaid-cli)
    // Note: header-only diagrams (no statements) are considered valid by mermaid-cli
    
    // Check for specific patterns
    lines.forEach((line, lineNum) => {
        // Check for empty node content
        const emptyNodePatterns = [
            /\[""\]/,          // Empty quotes
            /\["\s+"\]/,       // Only whitespace
            /\[''\]/,          // Empty single quotes
            /\['\s+'\]/,
            /\(\("\s*"\)\)/,
            /\(\(\s*\)\)/,
        ];
        
        for (const pattern of emptyNodePatterns) {
            if (pattern.test(line)) {
                errors.push({
                    line: lineNum + 1,
                    column: 1,
                    message: 'Empty node content is not allowed',
                    severity: 'error'
                });
                break;
            }
        }
        
        // Check for escaped quotes
        if (line.includes('\\"') && line.match(/\[[^\]]*\\"/)) {
            errors.push({
                line: lineNum + 1,
                column: line.indexOf('\\"') + 1,
                message: 'Escaped quotes in node labels are not supported',
                severity: 'error'
            });
        }
        
        // Check for incomplete class syntax
        if (line.trim().startsWith('class ')) {
            const classLine = line.trim();
            const parts = classLine.split(/\s+/);
            if (parts.length < 3) {
                errors.push({
                    line: lineNum + 1,
                    column: 1,
                    message: 'Incomplete class syntax: needs format "class nodeId className"',
                    severity: 'error'
                });
            }
        }
        
        // Warning for link text not in pipes (but allow inline text patterns)
        const hasArrow = line.match(/-->|<--|-.->|<-.-|==>|<==/);
        const hasLinkText = line.match(/-->[^|]*\w+[^|]*(?:-->|--|$)/);
        const hasInlineText = line.match(/--\s+\w+\s+-->|-\.\w+\.->|==\w+==>|--\s*\w+/);
        
        if (hasArrow && hasLinkText && !line.match(/-->\s*\|[^|]*\|/) && !hasInlineText) {
            const linkTextMatch = line.match(/-->\s*(\w+)/);
            if (linkTextMatch) {
                errors.push({
                    line: lineNum + 1,
                    column: line.indexOf(linkTextMatch[0]) + 1,
                    message: "Link text must be enclosed in pipes: |text|",
                    severity: 'warning'
                });
            }
        }
    });
    
    return errors;
}

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
    const errors = validateWithChevrotain(content);

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
                console.error(`\x1b[33mwarning\x1b[0m: ${filename}:${warning.line}:${warning.column} - ${warning.message}`);
            });
        }
        console.log('Valid'); // File is still valid despite warnings
        process.exit(0);
    } else {
        // Has errors
        console.error(`Found ${errorCount} error(s) in ${filename}:\n`);

        errors.filter(e => e.severity === 'error').forEach(error => {
            console.error(`\x1b[31merror\x1b[0m: ${filename}:${error.line}:${error.column} - ${error.message}`);
        });

        if (warningCount > 0) {
            console.error(`\nFound ${warningCount} warning(s) in ${filename}:\n`);
            errors.filter(e => e.severity === 'warning').forEach(warning => {
                console.error(`\x1b[33mwarning\x1b[0m: ${filename}:${warning.line}:${warning.column} - ${warning.message}`);
            });
        }

        process.exit(1);
    }
}

main();
