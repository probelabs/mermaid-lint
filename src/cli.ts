#!/usr/bin/env node

import * as fs from 'fs';

interface ValidationError {
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
}

function validateDiagram(text: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check for problematic HTML entities
    const lines = text.split('\n');
    lines.forEach((line, lineNum) => {
        // Check for &apos; which causes issues
        if (line.includes('&apos;')) {
            const column = line.indexOf('&apos;') + 1;
            errors.push({
                line: lineNum + 1,
                column,
                message: "Found '&apos;' HTML entity. Use &#39; or escape quotes properly",
                severity: 'error'
            });
        }
        
        // Check for nested unescaped quotes in square brackets
        const squareBracketMatch = line.match(/\[([^[\]]+)\]/g);
        if (squareBracketMatch) {
            squareBracketMatch.forEach(match => {
                const content = match.slice(1, -1);
                // If content has outer quotes, check for unescaped inner quotes
                if (content.startsWith('"') && content.endsWith('"')) {
                    const innerContent = content.slice(1, -1);
                    if (innerContent.includes('"') && !innerContent.includes('&quot;') && !innerContent.includes('\\"')) {
                        errors.push({
                            line: lineNum + 1,
                            column: line.indexOf(match) + 1,
                            message: "Unescaped double quotes inside quoted node label",
                            severity: 'error'
                        });
                    }
                } else if (content.startsWith("'") && content.endsWith("'")) {
                    const innerContent = content.slice(1, -1);
                    if (innerContent.includes("'") && !innerContent.includes('&#39;') && !innerContent.includes("\\'")) {
                        errors.push({
                            line: lineNum + 1,
                            column: line.indexOf(match) + 1,
                            message: "Unescaped single quotes inside quoted node label",
                            severity: 'error'
                        });
                    }
                }
            });
        }
        
        // Check for double-encoded entities
        if (line.includes('&amp;#') || line.includes('&amp;quot;') || line.includes('&amp;apos;')) {
            const column = line.search(/&amp;(#|quot|apos)/) + 1;
            errors.push({
                line: lineNum + 1,
                column,
                message: "Double-encoded HTML entity detected",
                severity: 'error'
            });
        }
        
        // Check for invalid arrow syntax
        if (line.includes('-->') || line.includes('---')) {
            // Check if there's text after arrow without pipe separators
            const arrowMatch = line.match(/(-->|---)\s*([^|\s]+)/);
            if (arrowMatch && arrowMatch[2] && !line.includes('|')) {
                errors.push({
                    line: lineNum + 1, 
                    column: line.indexOf(arrowMatch[0]) + 1,
                    message: "Link text must be enclosed in pipes: |text|",
                    severity: 'warning'
                });
            }
        }
    });
    
    // Try basic Langium parsing (simplified without full services)
    try {
        // Check basic structure
        if (!text.match(/^(graph|flowchart)\s+(TD|TB|BT|RL|LR)/m)) {
            errors.push({
                line: 1,
                column: 1,
                message: 'Diagram must start with "graph" or "flowchart" followed by direction (TD, TB, BT, RL, LR)',
                severity: 'error'
            });
        }
        
        // Check for unclosed subgraphs
        const subgraphStarts = (text.match(/\bsubgraph\b/g) || []).length;
        const subgraphEnds = (text.match(/\bend\b/g) || []).length;
        if (subgraphStarts !== subgraphEnds) {
            errors.push({
                line: 1,
                column: 1,
                message: `Mismatched subgraphs: ${subgraphStarts} 'subgraph' but ${subgraphEnds} 'end'`,
                severity: 'error'
            });
        }
        
    } catch (e: any) {
        errors.push({
            line: 1,
            column: 1,
            message: `Parsing error: ${e.message}`,
            severity: 'error'
        });
    }
    
    return errors;
}

function formatError(error: ValidationError, filename: string): string {
    const severityColor = error.severity === 'error' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';
    return `${severityColor}${error.severity}${reset}: ${filename}:${error.line}:${error.column} - ${error.message}`;
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log('Usage: mermaid-lint <file.mmd>');
        console.log('       cat diagram.mmd | mermaid-lint -');
        console.log('');
        console.log('Validates Mermaid flowchart/graph diagrams for syntax errors.');
        console.log('Specifically checks for:');
        console.log('  - Problematic HTML entities (&apos;)');
        console.log('  - Nested unescaped quotes');
        console.log('  - Double-encoded entities');
        console.log('  - Invalid arrow syntax');
        console.log('  - Unclosed subgraphs');
        process.exit(0);
    }
    
    let content: string;
    let filename: string;
    
    if (args[0] === '-') {
        // Read from stdin
        content = fs.readFileSync(0, 'utf-8');
        filename = '<stdin>';
    } else {
        // Read from file
        filename = args[0];
        if (!fs.existsSync(filename)) {
            console.error(`Error: File '${filename}' not found`);
            process.exit(1);
        }
        content = fs.readFileSync(filename, 'utf-8');
    }
    
    const errors = validateDiagram(content);
    
    if (errors.length === 0) {
        console.log(`✅ ${filename}: No errors found`);
        process.exit(0);
    } else {
        console.log(`Found ${errors.length} issue(s) in ${filename}:\n`);
        errors.forEach(error => {
            console.log(formatError(error, filename));
        });
        process.exit(1);
    }
}

main();