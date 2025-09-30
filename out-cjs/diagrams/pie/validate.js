"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePie = validatePie;
const lexer_js_1 = require("./lexer.js");
const parser_js_1 = require("./parser.js");
const semantics_js_1 = require("./semantics.js");
const pipeline_js_1 = require("../../core/pipeline.js");
const quoteHygiene_js_1 = require("../../core/quoteHygiene.js");
const diagnostics_js_1 = require("../../core/diagnostics.js");
function validatePie(text, _options = {}) {
    return (0, pipeline_js_1.lintWithChevrotain)(text, {
        tokenize: lexer_js_1.tokenize,
        parse: parser_js_1.parse,
        analyze: (cst, tokens) => (0, semantics_js_1.analyzePie)(cst, tokens),
        mapParserError: (e, t) => (0, diagnostics_js_1.mapPieParserError)(e, t),
        postLex: (text, tokens) => {
            const out = [];
            // File-level unclosed quote fallback — helps when parser can’t reach sliceStmt cleanly
            out.push(...(0, quoteHygiene_js_1.detectUnclosedQuotesInText)(text, {
                code: 'PI-QUOTE-UNCLOSED',
                message: 'Unclosed quote in slice label.',
                hint: 'Close the quote: "Dogs" : 10',
                limitPerFile: 1
            }));
            // Detect double-in-double only on lines that do NOT contain escaped quotes
            const tokList = tokens;
            const escapedLines = new Set();
            for (const tk of tokList) {
                if (typeof tk.image === 'string' && tk.image.includes('\\"')) {
                    escapedLines.add(tk.startLine ?? 1);
                }
            }
            const dbl = (0, quoteHygiene_js_1.detectDoubleInDouble)(tokList, {
                code: 'PI-LABEL-DOUBLE-IN-DOUBLE',
                message: 'Double quotes inside a double-quoted slice label are not supported. Use &quot; for inner quotes.',
                hint: 'Example: "He said &quot;Hi&quot;" : 1',
                scopeEndTokenNames: ['Colon']
            }).filter(e => !escapedLines.has(e.line));
            out.push(...dbl);
            return out;
        }
    });
}
