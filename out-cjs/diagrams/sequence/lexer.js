"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhiteSpace = exports.Comment = exports.QuotedString = exports.RParen = exports.LParen = exports.Colon = exports.Comma = exports.Minus = exports.Plus = exports.Open = exports.DottedOpen = exports.Cross = exports.DottedCross = exports.Solid = exports.Dotted = exports.Async = exports.DottedAsync = exports.BidirAsync = exports.BidirAsyncDotted = exports.BreakKeyword = exports.LinkKeyword = exports.LinksKeyword = exports.EndKeyword = exports.BoxKeyword = exports.CriticalKeyword = exports.RectKeyword = exports.AndKeyword = exports.ParKeyword = exports.LoopKeyword = exports.OptKeyword = exports.OptionKeyword = exports.ElseKeyword = exports.AltKeyword = exports.DestroyKeyword = exports.CreateKeyword = exports.DeactivateKeyword = exports.ActivateKeyword = exports.OfKeyword = exports.OverKeyword = exports.RightKeyword = exports.LeftKeyword = exports.NoteKeyword = exports.OffKeyword = exports.AutonumberKeyword = exports.AsKeyword = exports.ActorKeyword = exports.ParticipantKeyword = exports.SequenceKeyword = exports.NumberLiteral = exports.Identifier = void 0;
exports.SequenceLexer = exports.allTokens = exports.Text = exports.Newline = void 0;
exports.tokenize = tokenize;
const chevrotain_1 = require("chevrotain");
// Identifiers (actor/participant ids)
// Keep '-' out to avoid consuming the '-' of arrows like A->B
exports.Identifier = (0, chevrotain_1.createToken)({ name: 'Identifier', pattern: /[A-Za-z_][A-Za-z0-9_]*/ });
exports.NumberLiteral = (0, chevrotain_1.createToken)({ name: 'NumberLiteral', pattern: /[0-9]+/ });
// Header
exports.SequenceKeyword = (0, chevrotain_1.createToken)({ name: 'SequenceKeyword', pattern: /sequenceDiagram/, longer_alt: exports.Identifier });
// Keywords (case-insensitive for common ones)
exports.ParticipantKeyword = (0, chevrotain_1.createToken)({ name: 'ParticipantKeyword', pattern: /participant/i, longer_alt: exports.Identifier });
exports.ActorKeyword = (0, chevrotain_1.createToken)({ name: 'ActorKeyword', pattern: /actor/i, longer_alt: exports.Identifier });
exports.AsKeyword = (0, chevrotain_1.createToken)({ name: 'AsKeyword', pattern: /as/i, longer_alt: exports.Identifier });
exports.AutonumberKeyword = (0, chevrotain_1.createToken)({ name: 'AutonumberKeyword', pattern: /autonumber/i, longer_alt: exports.Identifier });
exports.OffKeyword = (0, chevrotain_1.createToken)({ name: 'OffKeyword', pattern: /off/i, longer_alt: exports.Identifier });
exports.NoteKeyword = (0, chevrotain_1.createToken)({ name: 'NoteKeyword', pattern: /note/i, longer_alt: exports.Identifier });
exports.LeftKeyword = (0, chevrotain_1.createToken)({ name: 'LeftKeyword', pattern: /left/i, longer_alt: exports.Identifier });
exports.RightKeyword = (0, chevrotain_1.createToken)({ name: 'RightKeyword', pattern: /right/i, longer_alt: exports.Identifier });
exports.OverKeyword = (0, chevrotain_1.createToken)({ name: 'OverKeyword', pattern: /over/i, longer_alt: exports.Identifier });
exports.OfKeyword = (0, chevrotain_1.createToken)({ name: 'OfKeyword', pattern: /of/i, longer_alt: exports.Identifier });
exports.ActivateKeyword = (0, chevrotain_1.createToken)({ name: 'ActivateKeyword', pattern: /activate/i, longer_alt: exports.Identifier });
exports.DeactivateKeyword = (0, chevrotain_1.createToken)({ name: 'DeactivateKeyword', pattern: /deactivate/i, longer_alt: exports.Identifier });
exports.CreateKeyword = (0, chevrotain_1.createToken)({ name: 'CreateKeyword', pattern: /create/i, longer_alt: exports.Identifier });
exports.DestroyKeyword = (0, chevrotain_1.createToken)({ name: 'DestroyKeyword', pattern: /destroy/i, longer_alt: exports.Identifier });
exports.AltKeyword = (0, chevrotain_1.createToken)({ name: 'AltKeyword', pattern: /alt/i, longer_alt: exports.Identifier });
exports.ElseKeyword = (0, chevrotain_1.createToken)({ name: 'ElseKeyword', pattern: /else/i, longer_alt: exports.Identifier });
exports.OptionKeyword = (0, chevrotain_1.createToken)({ name: 'OptionKeyword', pattern: /option/i, longer_alt: exports.Identifier });
exports.OptKeyword = (0, chevrotain_1.createToken)({ name: 'OptKeyword', pattern: /opt/i, longer_alt: exports.Identifier });
exports.LoopKeyword = (0, chevrotain_1.createToken)({ name: 'LoopKeyword', pattern: /loop/i, longer_alt: exports.Identifier });
exports.ParKeyword = (0, chevrotain_1.createToken)({ name: 'ParKeyword', pattern: /par/i, longer_alt: exports.Identifier });
exports.AndKeyword = (0, chevrotain_1.createToken)({ name: 'AndKeyword', pattern: /and/i, longer_alt: exports.Identifier });
exports.RectKeyword = (0, chevrotain_1.createToken)({ name: 'RectKeyword', pattern: /rect/i, longer_alt: exports.Identifier });
exports.CriticalKeyword = (0, chevrotain_1.createToken)({ name: 'CriticalKeyword', pattern: /critical/i, longer_alt: exports.Identifier });
exports.BoxKeyword = (0, chevrotain_1.createToken)({ name: 'BoxKeyword', pattern: /box/i, longer_alt: exports.Identifier });
exports.EndKeyword = (0, chevrotain_1.createToken)({ name: 'EndKeyword', pattern: /end/i, longer_alt: exports.Identifier });
exports.LinksKeyword = (0, chevrotain_1.createToken)({ name: 'LinksKeyword', pattern: /links/i, longer_alt: exports.Identifier });
exports.LinkKeyword = (0, chevrotain_1.createToken)({ name: 'LinkKeyword', pattern: /link/i, longer_alt: exports.Identifier });
exports.BreakKeyword = (0, chevrotain_1.createToken)({ name: 'BreakKeyword', pattern: /break/i, longer_alt: exports.Identifier });
// Arrows (order matters: longest first)
exports.BidirAsyncDotted = (0, chevrotain_1.createToken)({ name: 'BidirAsyncDotted', pattern: /<<-->>/ });
exports.BidirAsync = (0, chevrotain_1.createToken)({ name: 'BidirAsync', pattern: /<<->>/ });
exports.DottedAsync = (0, chevrotain_1.createToken)({ name: 'DottedAsync', pattern: /-->>/ });
exports.Async = (0, chevrotain_1.createToken)({ name: 'Async', pattern: /->>/ });
exports.Dotted = (0, chevrotain_1.createToken)({ name: 'Dotted', pattern: /-->/ });
exports.Solid = (0, chevrotain_1.createToken)({ name: 'Solid', pattern: /->/ });
exports.DottedCross = (0, chevrotain_1.createToken)({ name: 'DottedCross', pattern: /--x/ });
exports.Cross = (0, chevrotain_1.createToken)({ name: 'Cross', pattern: /-x/ });
exports.DottedOpen = (0, chevrotain_1.createToken)({ name: 'DottedOpen', pattern: /--\)/ });
exports.Open = (0, chevrotain_1.createToken)({ name: 'Open', pattern: /-\)/ });
// Suffix markers on target: + (activate) or - (deactivate)
exports.Plus = (0, chevrotain_1.createToken)({ name: 'Plus', pattern: /\+/ });
exports.Minus = (0, chevrotain_1.createToken)({ name: 'Minus', pattern: /-/ });
// Punctuation
exports.Comma = (0, chevrotain_1.createToken)({ name: 'Comma', pattern: /,/ });
exports.Colon = (0, chevrotain_1.createToken)({ name: 'Colon', pattern: /:/ });
exports.LParen = (0, chevrotain_1.createToken)({ name: 'LParen', pattern: /\(/ });
exports.RParen = (0, chevrotain_1.createToken)({ name: 'RParen', pattern: /\)/ });
// Strings and text
// Allow escaped characters within quotes (e.g., \" inside "...")
exports.QuotedString = (0, chevrotain_1.createToken)({ name: 'QuotedString', pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ });
// Comments and whitespace
exports.Comment = (0, chevrotain_1.createToken)({ name: 'Comment', pattern: /%%[^\n\r]*/, group: chevrotain_1.Lexer.SKIPPED });
exports.WhiteSpace = (0, chevrotain_1.createToken)({ name: 'WhiteSpace', pattern: /[ \t]+/, group: chevrotain_1.Lexer.SKIPPED });
exports.Newline = (0, chevrotain_1.createToken)({ name: 'Newline', pattern: /[\n\r]+/, line_breaks: true });
// Any text until end of line (for message/note bodies)
exports.Text = (0, chevrotain_1.createToken)({ name: 'Text', pattern: /[^\n\r]+/ });
exports.allTokens = [
    // Skip
    exports.Comment,
    // Strings
    exports.QuotedString,
    // Whitespace and newlines first so Text won't eat indentation
    exports.WhiteSpace,
    exports.Newline,
    // Header/Keywords
    exports.SequenceKeyword,
    exports.ParticipantKeyword,
    exports.ActorKeyword,
    exports.AsKeyword,
    exports.AutonumberKeyword,
    exports.OffKeyword,
    exports.NoteKeyword,
    exports.LeftKeyword,
    exports.RightKeyword,
    exports.OverKeyword,
    exports.OfKeyword,
    exports.ActivateKeyword,
    exports.DeactivateKeyword,
    exports.CreateKeyword,
    exports.DestroyKeyword,
    exports.AltKeyword,
    exports.ElseKeyword,
    exports.OptionKeyword,
    exports.OptKeyword,
    exports.LoopKeyword,
    exports.ParKeyword,
    exports.AndKeyword,
    exports.RectKeyword,
    exports.CriticalKeyword,
    exports.BreakKeyword,
    exports.BoxKeyword,
    exports.EndKeyword,
    exports.LinksKeyword,
    exports.LinkKeyword,
    // Arrows
    exports.BidirAsyncDotted,
    exports.BidirAsync,
    exports.DottedAsync,
    exports.Async,
    exports.Dotted,
    exports.Solid,
    exports.DottedCross,
    exports.Cross,
    exports.DottedOpen,
    exports.Open,
    // Punct
    exports.Comma,
    exports.Colon,
    exports.LParen,
    exports.RParen,
    exports.Plus,
    exports.Minus,
    // Values
    exports.NumberLiteral,
    exports.Identifier,
    exports.Text,
];
exports.SequenceLexer = new chevrotain_1.Lexer(exports.allTokens);
function tokenize(text) {
    return exports.SequenceLexer.tokenize(text);
}
