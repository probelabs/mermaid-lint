"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PieLexer = exports.allTokens = exports.Newline = exports.WhiteSpace = exports.Comment = exports.Text = exports.QuotedString = exports.NumberLiteral = exports.Colon = exports.ShowDataKeyword = exports.TitleKeyword = exports.PieKeyword = void 0;
exports.tokenize = tokenize;
const chevrotain_1 = require("chevrotain");
// Basic tokens reused across simple pie grammar
exports.PieKeyword = (0, chevrotain_1.createToken)({ name: 'PieKeyword', pattern: /pie/ });
exports.TitleKeyword = (0, chevrotain_1.createToken)({ name: 'TitleKeyword', pattern: /title/ });
exports.ShowDataKeyword = (0, chevrotain_1.createToken)({ name: 'ShowDataKeyword', pattern: /showData/ });
exports.Colon = (0, chevrotain_1.createToken)({ name: 'Colon', pattern: /:/ });
exports.NumberLiteral = (0, chevrotain_1.createToken)({ name: 'NumberLiteral', pattern: /-?[0-9]+(\.[0-9]+)?/ });
// Allow escaped characters within quotes (e.g., \" inside "...")
exports.QuotedString = (0, chevrotain_1.createToken)({ name: 'QuotedString', pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ });
// Less greedy text for labels and titles (no colon, pipe, angle, brackets)
// Text: fallback for labels/titles; avoid greed by placing AFTER WhiteSpace and keywords
exports.Text = (0, chevrotain_1.createToken)({ name: 'Text', pattern: /[^:\n\r]+/ });
exports.Comment = (0, chevrotain_1.createToken)({ name: 'Comment', pattern: /%%[^\n\r]*/, group: chevrotain_1.Lexer.SKIPPED });
exports.WhiteSpace = (0, chevrotain_1.createToken)({ name: 'WhiteSpace', pattern: /[ \t]+/, group: chevrotain_1.Lexer.SKIPPED });
exports.Newline = (0, chevrotain_1.createToken)({ name: 'Newline', pattern: /[\n\r]+/, line_breaks: true });
exports.allTokens = [
    // skipped
    exports.Comment,
    // strings
    exports.QuotedString,
    // keywords before text
    exports.PieKeyword,
    exports.TitleKeyword,
    exports.ShowDataKeyword,
    // whitespace should come before Text so it doesn't get swallowed
    exports.WhiteSpace,
    // punctuation and numbers
    exports.Colon,
    exports.NumberLiteral,
    // text last among visible tokens
    exports.Text,
    // newline at the end
    exports.Newline,
];
exports.PieLexer = new chevrotain_1.Lexer(exports.allTokens);
function tokenize(text) {
    return exports.PieLexer.tokenize(text);
}
