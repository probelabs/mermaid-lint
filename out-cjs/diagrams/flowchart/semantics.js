"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFlowchart = analyzeFlowchart;
const parser_js_1 = require("./parser.js");
// Build a CST visitor base from the parser instance
const BaseVisitor = parser_js_1.parserInstance.getBaseCstVisitorConstructorWithDefaults();
class FlowSemanticsVisitor extends BaseVisitor {
    constructor(ctx) {
        super();
        this.validateVisitor();
        this.ctx = ctx;
    }
    // Entry point
    diagram(ctx) {
        // Visit all statements
        if (ctx.statement)
            ctx.statement.forEach((s) => this.visit(s));
    }
    statement(ctx) {
        // delegate to child rules only (skip token arrays)
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
    subgraph(ctx) {
        if (ctx.subgraphStatement)
            ctx.subgraphStatement.forEach((s) => this.visit(s));
    }
    subgraphStatement(ctx) {
        // visit nested rules inside subgraph body
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
    directionStatement(ctx) {
        const kwTok = ctx.dirKw?.[0];
        if (kwTok && kwTok.image !== 'direction') {
            this.ctx.errors.push({
                line: kwTok.startLine ?? 1,
                column: kwTok.startColumn ?? 1,
                severity: 'error',
                code: 'FL-DIR-KW-INVALID',
                message: `Unknown keyword '${kwTok.image}' before direction. Use 'direction TB' / 'LR' / etc.`,
                hint: "Example inside subgraph: 'direction TB'",
                length: (kwTok.image?.length ?? 0)
            });
        }
    }
    nodeStatement(ctx) {
        if (ctx.nodeOrParallelGroup)
            ctx.nodeOrParallelGroup.forEach((n) => this.visit(n));
        // links are syntactic; semantic link warnings stay outside for now
    }
    nodeOrParallelGroup(ctx) {
        if (ctx.node)
            ctx.node.forEach((n) => this.visit(n));
    }
    node(ctx) {
        // only shape/content semantics live here
        if (ctx.nodeShape)
            ctx.nodeShape.forEach((n) => this.visit(n));
    }
    checkEmptyContent(openTok, contentNodes) {
        // No content nodes at all
        if (!contentNodes || contentNodes.length === 0) {
            this.ctx.errors.push({
                line: openTok.startLine ?? 1,
                column: openTok.startColumn ?? 1,
                severity: 'error',
                message: 'Empty label inside a shape.',
                code: 'FL-NODE-EMPTY',
                hint: 'Write non-empty text inside the brackets, e.g., A["Start"] or A[Start]. If you want no label, omit the brackets and just use A.'
            });
            return;
        }
        // content exists – check quoted empty strings
        for (const cn of contentNodes) {
            const ch = cn.children || {};
            const qs = []
                .concat(ch.QuotedString || [])
                .concat(ch.MultilineText || []);
            for (const q of qs) {
                const img = q.image;
                if (!img)
                    continue;
                // remove wrappers
                const text = img.startsWith('"') || img.startsWith("'") ? img.slice(1, -1) : img;
                if (text.trim().length === 0) {
                    this.ctx.errors.push({
                        line: q.startLine ?? 1,
                        column: q.startColumn ?? 1,
                        severity: 'error',
                        message: 'Empty label inside a shape (only empty quotes/whitespace).',
                        code: 'FL-NODE-EMPTY',
                        hint: 'Provide non-empty text, e.g., A["Start"] or A[Start]. If you want no label, omit the brackets and just use A.'
                    });
                }
            }
        }
    }
    checkEscapedQuotes(contentNodes) {
        if (!contentNodes)
            return;
        for (const cn of contentNodes) {
            const ch = cn.children || {};
            const tokens = []
                .concat(ch.QuotedString || [])
                .concat(ch.Text || [])
                .concat(ch.Identifier || [])
                .concat(ch.NumberLiteral || []);
            for (const t of tokens) {
                if (t.image && t.image.includes('\\"')) {
                    this.ctx.errors.push({
                        line: t.startLine ?? 1,
                        column: t.startColumn ?? 1,
                        severity: 'error',
                        message: 'Escaped quotes (\\") in node labels are not supported by Mermaid. Use &quot; instead.',
                        code: 'FL-LABEL-ESCAPED-QUOTE',
                        hint: 'Prefer "He said &quot;Hi&quot;".'
                    });
                }
            }
        }
    }
    checkDoubleInSingleQuoted(contentNodes) {
        if (!contentNodes)
            return;
        for (const cn of contentNodes) {
            const ch = cn.children || {};
            const qs = ch.QuotedString || [];
            for (const q of qs) {
                const s = q.image || '';
                if (s.startsWith("'") && s.endsWith("'") && s.includes('"')) {
                    const innerIdx = s.indexOf('"');
                    const col = (q.startColumn ?? 1) + Math.max(0, innerIdx);
                    this.ctx.errors.push({
                        line: q.startLine ?? 1,
                        column: col,
                        severity: 'error',
                        message: 'Double quotes inside a single-quoted label are not supported by Mermaid. Replace inner " with &quot; or use a double-quoted label with &quot;.',
                        code: 'FL-LABEL-DOUBLE-IN-SINGLE',
                        hint: 'Change to "She said &quot;Hello&quot;" or replace inner " with &quot;.',
                        length: 1
                    });
                }
            }
        }
    }
    checkDoubleInDoubleQuoted(contentNodes) {
        if (!contentNodes)
            return;
        for (const cn of contentNodes) {
            const ch = cn.children || {};
            const qs = ch.QuotedString || [];
            if (qs.length >= 2) {
                const q2 = qs[1];
                this.ctx.errors.push({
                    line: q2.startLine ?? 1,
                    column: q2.startColumn ?? 1,
                    severity: 'error',
                    code: 'FL-LABEL-DOUBLE-IN-DOUBLE',
                    message: 'Double quotes inside a double-quoted label are not supported. Use &quot; for inner quotes.',
                    hint: 'Example: A["He said &quot;Hi&quot;"]',
                    length: 1
                });
            }
        }
    }
    warnParensInUnquoted(contentNodes) {
        if (!contentNodes)
            return;
        for (const cn of contentNodes) {
            const ch = cn.children || {};
            const hasQuoted = Array.isArray(ch.QuotedString) && ch.QuotedString.length > 0;
            if (hasQuoted)
                continue; // wrapped, fine
            const opens = ch.RoundOpen || [];
            const closes = ch.RoundClose || [];
            const offenders = [...opens, ...closes];
            if (offenders.length > 0) {
                const t = offenders[0];
                this.ctx.errors.push({
                    line: t.startLine ?? 1,
                    column: t.startColumn ?? 1,
                    severity: 'warning',
                    code: 'FL-LABEL-PARENS-UNQUOTED',
                    message: 'Parentheses inside an unquoted label may be ambiguous. Wrap the label in quotes.',
                    hint: 'Example: A["Calls func(arg)"]'
                });
            }
        }
    }
    nodeShape(ctx) {
        // Determine shape and collect the corresponding content node array key
        const openTok = (ctx.SquareOpen && ctx.SquareOpen[0]) ||
            (ctx.DoubleSquareOpen && ctx.DoubleSquareOpen[0]) ||
            (ctx.RoundOpen && ctx.RoundOpen[0]) ||
            (ctx.DoubleRoundOpen && ctx.DoubleRoundOpen[0]) ||
            (ctx.DiamondOpen && ctx.DiamondOpen[0]) ||
            (ctx.HexagonOpen && ctx.HexagonOpen[0]) ||
            (ctx.StadiumOpen && ctx.StadiumOpen[0]) ||
            (ctx.CylinderOpen && ctx.CylinderOpen[0]);
        // Gather any of nodeContentX properties
        const contentNodes = [];
        for (const key of Object.keys(ctx)) {
            if (key.startsWith('nodeContent')) {
                const arr = ctx[key];
                if (Array.isArray(arr))
                    contentNodes.push(...arr);
            }
        }
        if (openTok) {
            this.checkEmptyContent(openTok, contentNodes.length ? contentNodes : undefined);
            this.checkEscapedQuotes(contentNodes);
            this.checkDoubleInSingleQuoted(contentNodes);
            this.warnParensInUnquoted(contentNodes);
            // Strict mode: require quoted labels inside shapes
            if (this.ctx.strict) {
                let quoted = false;
                let firstContentTok;
                for (const cn of contentNodes) {
                    const ch = cn.children || {};
                    if ((ch.QuotedString && ch.QuotedString.length) || (ch.MultilineText && ch.MultilineText.length)) {
                        quoted = true;
                        break;
                    }
                    // track first token as pointer
                    const candidates = []
                        .concat(ch.Identifier || [])
                        .concat(ch.Text || [])
                        .concat(ch.NumberLiteral || [])
                        .concat(ch.RoundOpen || [])
                        .concat(ch.RoundClose || [])
                        .concat(ch.Comma || [])
                        .concat(ch.Colon || [])
                        .concat(ch.Pipe || []);
                    if (!firstContentTok && candidates.length)
                        firstContentTok = candidates[0];
                }
                if (contentNodes.length > 0 && !quoted) {
                    const p = firstContentTok ?? openTok;
                    this.ctx.errors.push({
                        line: p.startLine ?? 1,
                        column: p.startColumn ?? 1,
                        severity: 'error',
                        code: 'FL-STRICT-LABEL-QUOTES-REQUIRED',
                        message: 'Strict mode: Node label must be quoted (use double quotes and &quot; inside).',
                        hint: 'Example: A["Label with &quot;quotes&quot; and (parens)"]'
                    });
                }
            }
        }
    }
}
function analyzeFlowchart(cst, _tokens, opts) {
    const ctx = { errors: [], strict: opts?.strict };
    const v = new FlowSemanticsVisitor(ctx);
    v.visit(cst);
    return ctx.errors;
}
