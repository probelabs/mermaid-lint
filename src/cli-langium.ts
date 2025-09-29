#!/usr/bin/env node

import * as fs from 'fs';
import { createFlowchartServices } from './generated/module.js';
import { registerValidationChecks } from './flowchart-validator.js';
import { NodeFileSystem } from 'langium/node';
import { parseDocument } from 'langium';

const services = createFlowchartServices(NodeFileSystem);
registerValidationChecks(services.Flowchart);

interface DiagnosticInfo {
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
}

async function validateMermaidFile(filePath: string, content: string): Promise<DiagnosticInfo[]> {
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(content, filePath);
    
    // Parse the document
    await services.shared.workspace.DocumentBuilder.build([document]);
    
    const diagnostics: DiagnosticInfo[] = [];
    
    // Check for parse errors
    if (document.parseResult.lexerErrors.length > 0) {
        document.parseResult.lexerErrors.forEach(error => {
            diagnostics.push({
                line: error.line || 1,
                column: error.column || 1,
                message: error.message,
                severity: 'error'
            });
        });
    }
    
    if (document.parseResult.parserErrors.length > 0) {
        document.parseResult.parserErrors.forEach(error => {
            diagnostics.push({
                line: error.token.startLine || 1,
                column: error.token.startColumn || 1,
                message: error.message,
                severity: 'error'
            });
        });
    }
    
    // Run validation
    const validationResult = await services.Flowchart.validation.DocumentValidator.validateDocument(document);
    validationResult.forEach(diagnostic => {
        const severity = diagnostic.severity === 1 ? 'error' : 
                        diagnostic.severity === 2 ? 'warning' : 'info';
        diagnostics.push({
            line: diagnostic.range?.start.line ? diagnostic.range.start.line + 1 : 1,
            column: diagnostic.range?.start.character ? diagnostic.range.start.character + 1 : 1,
            message: diagnostic.message,
            severity
        });
    });
    
    return diagnostics;
}

function formatDiagnostic(diagnostic: DiagnosticInfo, filename: string): string {
    const severityColor = diagnostic.severity === 'error' ? '\x1b[31m' : 
                          diagnostic.severity === 'warning' ? '\x1b[33m' : '\x1b[36m';
    const reset = '\x1b[0m';
    return `${severityColor}${diagnostic.severity}${reset}: ${filename}:${diagnostic.line}:${diagnostic.column} - ${diagnostic.message}`;
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log('Usage: mermaid-lint <file.mmd>');
        console.log('       cat diagram.mmd | mermaid-lint -');
        console.log('');
        console.log('Validates Mermaid flowchart/graph diagrams using Langium parser.');
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
    
    const diagnostics = await validateMermaidFile(filename, content);
    
    const errors = diagnostics.filter(d => d.severity === 'error');
    const warnings = diagnostics.filter(d => d.severity === 'warning');
    
    if (diagnostics.length === 0) {
        console.log(`✅ ${filename}: No issues found`);
        process.exit(0);
    } else {
        if (errors.length > 0) {
            console.log(`Found ${errors.length} error(s) in ${filename}:\n`);
            errors.forEach(diagnostic => {
                console.log(formatDiagnostic(diagnostic, filename));
            });
        }
        
        if (warnings.length > 0) {
            if (errors.length > 0) console.log('');
            console.log(`Found ${warnings.length} warning(s) in ${filename}:\n`);
            warnings.forEach(diagnostic => {
                console.log(formatDiagnostic(diagnostic, filename));
            });
        }
        
        process.exit(errors.length > 0 ? 1 : 0);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});