"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSequence = validateSequence;
const lexer_js_1 = require("./lexer.js");
const parser_js_1 = require("./parser.js");
const semantics_js_1 = require("./semantics.js");
const diagnostics_js_1 = require("../../core/diagnostics.js");
const pipeline_js_1 = require("../../core/pipeline.js");
const t = __importStar(require("./lexer.js"));
const quoteHygiene_js_1 = require("../../core/quoteHygiene.js");
function validateSequence(text, options = {}) {
    return (0, pipeline_js_1.lintWithChevrotain)(text, {
        tokenize: lexer_js_1.tokenize,
        parse: parser_js_1.parse,
        analyze: (cst, tokens) => (0, semantics_js_1.analyzeSequence)(cst, tokens),
        mapParserError: (e, t) => (0, diagnostics_js_1.mapSequenceParserError)(e, t),
        postLex: (_text, tokens) => {
            const tokList = tokens;
            // Global: escaped quotes detection (pre-parse so it always triggers even on parse failures)
            const errsRaw = (0, quoteHygiene_js_1.detectEscapedQuotes)(tokList, {
                code: 'SE-LABEL-ESCAPED-QUOTE',
                message: 'Escaped quotes (\\") in names or labels are not supported by Mermaid. Use &quot; instead.',
                hint: 'Example: participant "Logger &quot;debug&quot;" as L'
            });
            const errs = errsRaw.map(e => ({ ...e, severity: (options.strict ? 'error' : 'warning') }));
            // Heuristic for double quotes inside double-quoted names/labels on a single line
            const byLine = new Map();
            for (const tk of tokList) {
                const ln = tk.startLine ?? 1;
                if (!byLine.has(ln))
                    byLine.set(ln, []);
                byLine.get(ln).push(tk);
            }
            const escapedLines = new Set(errs.map(e => e.line));
            const dbl = (0, quoteHygiene_js_1.detectDoubleInDouble)(tokList, {
                code: 'SE-LABEL-DOUBLE-IN-DOUBLE',
                message: 'Double quotes inside a double-quoted name/label are not supported. Use &quot; for inner quotes.',
                hint: 'Example: participant "Logger &quot;debug&quot;" as L',
                scopeEndTokenNames: ['Newline']
            }).filter(e => !escapedLines.has(e.line)).map(e => ({ ...e, severity: (options.strict ? 'error' : 'warning') }));
            errs.push(...dbl);
            return errs;
        },
        postParse: (text, tokens, _cst, prevErrors) => {
            const warnings = [];
            const tokenList = tokens;
            const hasPar = tokenList.some(x => x.tokenType === t.ParKeyword);
            const hasAnd = tokenList.some(x => x.tokenType === t.AndKeyword);
            const hasAlt = tokenList.some(x => x.tokenType === t.AltKeyword);
            const hasElse = tokenList.some(x => x.tokenType === t.ElseKeyword);
            // Only add these hints if there were parse errors (to avoid noisy hints on valid files)
            const hadErrors = prevErrors.some(e => e.severity === 'error');
            if (hadErrors) {
                // Shared: unclosed quotes detection (fallback)
                if (!prevErrors.some(e => e.code === 'SE-QUOTE-UNCLOSED')) {
                    const unc = (0, quoteHygiene_js_1.detectUnclosedQuotesInText)(text, {
                        code: 'SE-QUOTE-UNCLOSED',
                        message: 'Unclosed quote in participant/actor name.',
                        hint: 'Close the quote: participant "Bob"  or  participant Alice as "Alias"',
                        limitPerFile: 1
                    });
                    if (unc.length)
                        warnings.push(...unc.map(u => ({ ...u, severity: (options.strict ? 'error' : 'warning') })));
                }
                const hasAndOutsideParErr = prevErrors.some(e => e.code === 'SE-AND-OUTSIDE-PAR');
                const hasElseOutsideAltErr = prevErrors.some(e => e.code === 'SE-ELSE-OUTSIDE-ALT');
                if (hasAnd && !hasPar && !hasAndOutsideParErr) {
                    const first = tokenList.find(x => x.tokenType === t.AndKeyword);
                    warnings.push({
                        line: first.startLine ?? 1,
                        column: first.startColumn ?? 1,
                        severity: 'warning',
                        code: 'SE-HINT-PAR-BLOCK-SUGGEST',
                        message: "Found 'and' but no 'par' block in the file.",
                        hint: "Start a parallel section with: par … and … end",
                        length: (first.image?.length ?? 3)
                    });
                }
                if (hasElse && !hasAlt && !hasElseOutsideAltErr) {
                    const first = tokenList.find(x => x.tokenType === t.ElseKeyword);
                    warnings.push({
                        line: first.startLine ?? 1,
                        column: first.startColumn ?? 1,
                        severity: 'warning',
                        code: 'SE-HINT-ALT-BLOCK-SUGGEST',
                        message: "Found 'else' but no 'alt' block in the file.",
                        hint: "Use: alt Condition … else … end",
                        length: (first.image?.length ?? 4)
                    });
                }
            }
            return warnings;
        }
    });
}
