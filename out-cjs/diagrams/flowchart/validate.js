"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFlowchart = validateFlowchart;
const lexer_js_1 = require("./lexer.js");
const parser_js_1 = require("./parser.js");
const semantics_js_1 = require("./semantics.js");
const pipeline_js_1 = require("../../core/pipeline.js");
const diagnostics_js_1 = require("../../core/diagnostics.js");
const quoteHygiene_js_1 = require("../../core/quoteHygiene.js");
const quoteHygiene_js_2 = require("../../core/quoteHygiene.js");
function validateFlowchart(text, options = {}) {
    return (0, pipeline_js_1.lintWithChevrotain)(text, {
        tokenize: lexer_js_1.tokenize,
        parse: parser_js_1.parse,
        analyze: (cst, tokens) => (0, semantics_js_1.analyzeFlowchart)(cst, tokens, { strict: !!options.strict }),
        mapParserError: (e, t) => (0, diagnostics_js_1.mapFlowchartParserError)(e, t),
        postLex: (_text, tokens) => {
            const errs = [];
            for (const token of tokens) {
                if (token.tokenType === lexer_js_1.InvalidArrow) {
                    errs.push({
                        line: token.startLine ?? 1,
                        column: token.startColumn ?? 1,
                        message: 'Invalid arrow syntax: -> (use --> instead)',
                        severity: 'error',
                        code: 'FL-ARROW-INVALID',
                        hint: 'Replace -> with -->, or use -- text --> for inline labels.',
                        length: (token.image?.length ?? 2)
                    });
                }
            }
            return errs;
        },
        postParse: (text, tokens, _cst, prevErrors) => {
            // Run quote hygiene regardless of other errors, but avoid duplicates when semantics already reported the same line.
            const seenEscapedLines = new Set(prevErrors.filter(e => e.code === 'FL-LABEL-ESCAPED-QUOTE').map(e => e.line));
            const esc = (0, quoteHygiene_js_2.detectEscapedQuotes)(tokens, {
                code: 'FL-LABEL-ESCAPED-QUOTE',
                message: 'Escaped quotes (\\") in node labels are not supported by Mermaid. Use &quot; instead.',
                hint: 'Prefer "He said &quot;Hi&quot;".'
            }).filter(e => !seenEscapedLines.has(e.line));
            // Detect double-in-double for lines not already reported by the parser mapping
            const seenDoubleLines = new Set(prevErrors.filter(e => e.code === 'FL-LABEL-DOUBLE-IN-DOUBLE').map(e => e.line));
            const escapedLinesAll = new Set((0, quoteHygiene_js_2.detectEscapedQuotes)(tokens, { code: 'x' }).map(e => e.line));
            const dbl = (0, quoteHygiene_js_1.detectDoubleInDouble)(tokens, {
                code: 'FL-LABEL-DOUBLE-IN-DOUBLE',
                message: 'Double quotes inside a double-quoted label are not supported. Use &quot; for inner quotes.',
                hint: 'Example: A["He said &quot;Hi&quot;"]',
                scopeEndTokenNames: [
                    'SquareClose', 'RoundClose', 'DiamondClose', 'DoubleSquareClose', 'DoubleRoundClose', 'StadiumClose', 'CylinderClose', 'HexagonClose'
                ]
            }).filter(e => !seenDoubleLines.has(e.line) && !escapedLinesAll.has(e.line));
            const errs = esc.concat(dbl);
            // File-level unclosed quote detection: only if overall quote count is odd (Mermaid treats
            // per-line mismatches as OK as long as the file balances quotes overall).
            const dblEsc = (text.match(/\\\"/g) || []).length;
            const dq = (text.match(/\"/g) || []).length - dblEsc;
            const sq = (text.match(/'/g) || []).length;
            if ((dq % 2 === 1) || (sq % 2 === 1)) {
                errs.push(...(0, quoteHygiene_js_1.detectUnclosedQuotesInText)(text, {
                    code: 'FL-QUOTE-UNCLOSED',
                    message: 'Unclosed quote in node label.',
                    hint: 'Close the quote: A["Label"]',
                    limitPerFile: 1
                }));
            }
            return errs;
        }
    });
}
