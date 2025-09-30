"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePie = analyzePie;
const parser_js_1 = require("./parser.js");
const BaseVisitor = parser_js_1.parserInstance.getBaseCstVisitorConstructorWithDefaults();
class PieSemanticsVisitor extends BaseVisitor {
    constructor(ctx) {
        super();
        this.validateVisitor();
        this.ctx = ctx;
    }
    diagram(ctx) {
        if (ctx.statement)
            ctx.statement.forEach((s) => this.visit(s));
    }
    statement(ctx) {
        // No-op: visit children to keep structure future-proof
        for (const k of Object.keys(ctx)) {
            const arr = ctx[k];
            if (Array.isArray(arr)) {
                arr.forEach((n) => {
                    if (n && typeof n.name === 'string')
                        this.visit(n);
                });
            }
        }
    }
}
function analyzePie(cst, _tokens) {
    const ctx = { errors: [] };
    const v = new PieSemanticsVisitor(ctx);
    v.visit(cst);
    return ctx.errors;
}
