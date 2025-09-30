"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDiagramType = detectDiagramType;
exports.validate = validate;
const validate_js_1 = require("../diagrams/flowchart/validate.js");
const validate_js_2 = require("../diagrams/pie/validate.js");
const validate_js_3 = require("../diagrams/sequence/validate.js");
function firstNonCommentLine(text) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const t = line.trim();
        if (!t)
            continue;
        if (t.startsWith('%%'))
            continue; // Mermaid comment
        return t;
    }
    return undefined;
}
function detectDiagramType(text) {
    const header = firstNonCommentLine(text);
    if (!header)
        return 'unknown';
    if (/^(flowchart|graph)\b/i.test(header))
        return 'flowchart';
    if (/^pie\b/i.test(header))
        return 'pie';
    if (/^sequenceDiagram\b/i.test(header))
        return 'sequence';
    return 'unknown';
}
function validate(text, options = {}) {
    const type = detectDiagramType(text);
    switch (type) {
        case 'flowchart':
            return { type, errors: (0, validate_js_1.validateFlowchart)(text, options) };
        case 'pie':
            return { type, errors: (0, validate_js_2.validatePie)(text, options) };
        case 'sequence':
            return { type, errors: (0, validate_js_3.validateSequence)(text, options) };
        default:
            return {
                type,
                errors: [
                    {
                        line: 1,
                        column: 1,
                        message: 'Diagram must start with "graph", "flowchart", "pie", or "sequenceDiagram"',
                        severity: 'error',
                        code: 'GEN-HEADER-INVALID',
                        hint: 'Start your diagram with e.g. "flowchart TD", "pie", or "sequenceDiagram".'
                    },
                ],
            };
    }
}
