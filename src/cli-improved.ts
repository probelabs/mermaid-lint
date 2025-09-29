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
    const lines = text.split('\n');
    
    // First check if diagram type is present
    const firstNonEmptyLine = lines.find(line => line.trim() && !line.trim().startsWith('%%'));
    if (!firstNonEmptyLine || !firstNonEmptyLine.match(/^\s*(graph|flowchart)\s/)) {
        errors.push({
            line: 1,
            column: 1,
            message: 'Diagram must start with "graph" or "flowchart"',
            severity: 'error'
        });
        return errors; // Fatal error, can't continue
    }
    
    // Check basic structure with direction
    const directionMatch = text.match(/^\s*(graph|flowchart)\s+(\w+)/m);
    if (directionMatch) {
        const direction = directionMatch[2];
        if (!['TD', 'TB', 'BT', 'RL', 'LR'].includes(direction)) {
            errors.push({
                line: 1,
                column: directionMatch[0].indexOf(direction) + 1,
                message: `Invalid direction: ${direction}. Must be one of: TD, TB, BT, RL, LR`,
                severity: 'error'
            });
        }
    }
    
    // Check if diagram is empty (no nodes or links after declaration)
    // Look for any statement after the diagram declaration
    const contentAfterDeclaration = lines.slice(1).some(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('%%') && trimmed.length > 0;
    });
    if (!contentAfterDeclaration) {
        errors.push({
            line: 1,
            column: 1,
            message: 'Empty diagram - must contain at least one statement',
            severity: 'error'
        });
    }
    
    lines.forEach((line, lineNum) => {
        // Skip comments
        if (line.trim().startsWith('%%')) return;
        
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
                // Empty content is actually valid in Mermaid (removes the check)
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
        
        // Check for single arrow (invalid) - must have space before to avoid matching -->  
        if (line.match(/[^-]->/) && !line.includes('-->') && !line.includes('.->') && !line.includes('=>')) {
            const column = line.search(/\s->\s/) + 1;
            errors.push({
                line: lineNum + 1,
                column,
                message: 'Invalid arrow syntax: -> (use --> instead)',
                severity: 'error'
            });
        }
        
        // Check for unclosed brackets
        const openSquare = (line.match(/\[/g) || []).length;
        const closeSquare = (line.match(/\]/g) || []).length;
        if (openSquare !== closeSquare) {
            errors.push({
                line: lineNum + 1,
                column: 1,
                message: 'Unclosed or mismatched square brackets',
                severity: 'error'
            });
        }
        
        // Check for incomplete node syntax like "A((" without closing
        if (line.match(/\w+\(\(\s*(-->|--|===|\.\.)/)) {
            errors.push({
                line: lineNum + 1,
                column: 1,
                message: 'Incomplete node syntax - missing closing brackets',
                severity: 'error'
            });
        }
        
        // Check for mixing bracket types
        const mixMatch = line.match(/\[([^\]]*)\)|(\(([^)]*)\])/);
        if (mixMatch) {
            errors.push({
                line: lineNum + 1,
                column: line.indexOf(mixMatch[0]) + 1,
                message: 'Mixed bracket types (e.g., [text) or (text])',
                severity: 'error'
            });
        }
        
        // Check for nodes without connections (just "A B" on same line)
        // Skip diagram declaration lines
        const nodeMatch = line.match(/^\s*(\w+)\s+(\w+)\s*$/);
        if (nodeMatch && 
            !line.match(/^\s*(graph|flowchart)\s/) &&
            !line.includes('subgraph') && 
            !line.includes('end') && 
            !line.includes('class') && 
            !line.includes('style') &&
            !line.includes('classDef')) {
            errors.push({
                line: lineNum + 1,
                column: 1,
                message: 'Missing arrow between nodes',
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
    
    // Check for unclosed subgraphs
    const subgraphStarts = (text.match(/\bsubgraph\b/g) || []).length;
    const subgraphEnds = (text.match(/\bend\b/g) || []).length;
    if (subgraphStarts !== subgraphEnds) {
        if (subgraphStarts > subgraphEnds) {
            errors.push({
                line: 1,
                column: 1,
                message: `Unclosed subgraph: ${subgraphStarts} 'subgraph' but only ${subgraphEnds} 'end'`,
                severity: 'error'
            });
        } else {
            errors.push({
                line: 1,
                column: 1,
                message: `Unmatched 'end': ${subgraphEnds} 'end' but only ${subgraphStarts} 'subgraph'`,
                severity: 'error'
            });
        }
    }
    
    // Check for subgraph without ID or title
    const subgraphLines = lines.filter(line => line.trim().startsWith('subgraph'));
    subgraphLines.forEach(line => {
        if (line.trim() === 'subgraph') {
            const lineNum = lines.indexOf(line);
            errors.push({
                line: lineNum + 1,
                column: 1,
                message: 'Subgraph must have an ID or title',
                severity: 'error'
            });
        }
    });
    
    // Check for duplicate subgraph IDs
    const subgraphIds: string[] = [];
    subgraphLines.forEach(line => {
        const match = line.match(/subgraph\s+(\w+)/);
        if (match) {
            const id = match[1];
            if (subgraphIds.includes(id)) {
                const lineNum = lines.indexOf(line);
                errors.push({
                    line: lineNum + 1,
                    column: line.indexOf(id) + 1,
                    message: `Duplicate subgraph ID: ${id}`,
                    severity: 'error'
                });
            }
            subgraphIds.push(id);
        }
    });
    
    // Check for invalid class syntax
    const classLines = lines.filter(line => line.trim().startsWith('class '));
    classLines.forEach(line => {
        if (line.trim() === 'class' || !line.match(/class\s+\w+/)) {
            const lineNum = lines.indexOf(line);
            errors.push({
                line: lineNum + 1,
                column: 1,
                message: 'Invalid class syntax',
                severity: 'error'
            });
        }
    });
    
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
        console.log('  - Diagram type and direction validation');
        console.log('  - Empty diagrams');
        console.log('  - Invalid arrow syntax');
        console.log('  - Unclosed/mismatched brackets');
        console.log('  - Missing arrows between nodes');
        console.log('  - Problematic HTML entities');
        console.log('  - Nested unescaped quotes');
        console.log('  - Subgraph validation');
        console.log('  - Class syntax validation');
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
    
    const actualErrors = errors.filter(e => e.severity === 'error');
    const warnings = errors.filter(e => e.severity === 'warning');
    
    if (errors.length === 0) {
        console.log(`✅ ${filename}: No errors found`);
        process.exit(0);
    } else {
        if (actualErrors.length > 0) {
            console.log(`Found ${actualErrors.length} error(s) in ${filename}:\n`);
            actualErrors.forEach(error => {
                console.log(formatError(error, filename));
            });
        }
        
        if (warnings.length > 0) {
            if (actualErrors.length > 0) console.log('');
            console.log(`Found ${warnings.length} warning(s) in ${filename}:\n`);
            warnings.forEach(warning => {
                console.log(formatError(warning, filename));
            });
        }
        
        // Exit with error code only if there are actual errors
        process.exit(actualErrors.length > 0 ? 1 : 0);
    }
}

main();