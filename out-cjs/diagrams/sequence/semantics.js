"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSequence = analyzeSequence;
const parser_js_1 = require("./parser.js");
// Minimal semantic pass scaffold (hooks for future rules)
const BaseVisitor = parser_js_1.parserInstance.getBaseCstVisitorConstructorWithDefaults();
class SequenceSemanticsVisitor extends BaseVisitor {
    constructor(ctx) {
        super();
        this.ctx = ctx;
        this.validateVisitor();
    }
}
function analyzeSequence(_cst, _tokens) {
    const ctx = { tokens: _tokens };
    const v = new SequenceSemanticsVisitor(ctx);
    // No-op for now; parser structure already guards most syntax. Add checks here later.
    return [];
}
