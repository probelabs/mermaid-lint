"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lintWithChevrotain = lintWithChevrotain;
const diagnostics_js_1 = require("./diagnostics.js");
function lintWithChevrotain(text, adapters) {
    const errors = [];
    // Lexing
    const lex = adapters.tokenize(text);
    if (lex.errors.length > 0) {
        errors.push(...lex.errors.map(diagnostics_js_1.fromLexerError));
    }
    // Diagram-specific token checks
    if (adapters.postLex) {
        try {
            errors.push(...(adapters.postLex(text, lex.tokens) || []));
        }
        catch { }
    }
    // Parsing (only if no fatal lexer errors)
    let cst = null;
    if (lex.errors.length === 0) {
        const parseRes = adapters.parse(lex.tokens);
        cst = parseRes.cst;
        if (parseRes.errors.length > 0) {
            errors.push(...parseRes.errors.map((e) => adapters.mapParserError(e, text)));
        }
    }
    // Semantics
    if (cst) {
        try {
            errors.push(...(adapters.analyze(cst, lex.tokens) || []));
        }
        catch (e) {
            errors.push({ line: 1, column: 1, severity: 'error', message: `Internal semantic analysis error: ${e.message}` });
        }
    }
    // Post-parse hooks: run even when parsing errored (cst may be null) so we can add
    // cross-line diagnostics based on tokens and already-mapped parser errors.
    if (adapters.postParse) {
        try {
            errors.push(...(adapters.postParse(text, lex.tokens, cst, errors) || []));
        }
        catch { }
    }
    return errors;
}
