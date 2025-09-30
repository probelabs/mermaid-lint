"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorAt = errorAt;
exports.errorAtToken = errorAtToken;
exports.warningAt = warningAt;
const diagnostics_js_1 = require("./diagnostics.js");
function errorAt(line, column, message, extra = {}) {
    const pos = (0, diagnostics_js_1.coercePos)(line ?? null, column ?? null, 1, 1);
    return { line: pos.line, column: pos.column, message, severity: 'error', ...extra };
}
function errorAtToken(tok, message, extra = {}) {
    return errorAt(tok?.startLine, tok?.startColumn, message, extra);
}
function warningAt(line, column, message, extra = {}) {
    const pos = (0, diagnostics_js_1.coercePos)(line ?? null, column ?? null, 1, 1);
    return { line: pos.line, column: pos.column, message, severity: 'warning', ...extra };
}
