"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Comment = exports.MultilineText = exports.QuotedString = exports.Pipe = exports.AngleOpen = exports.DiamondClose = exports.DiamondOpen = exports.RoundClose = exports.RoundOpen = exports.SquareClose = exports.SquareOpen = exports.CylinderClose = exports.CylinderOpen = exports.StadiumClose = exports.StadiumOpen = exports.HexagonClose = exports.HexagonOpen = exports.DoubleRoundClose = exports.DoubleRoundOpen = exports.DoubleSquareClose = exports.DoubleSquareOpen = exports.InvalidArrow = exports.TwoDashes = exports.Line = exports.ThickLine = exports.DottedLine = exports.ArrowLeft = exports.ArrowRight = exports.ThickArrowLeft = exports.ThickArrowRight = exports.DottedArrowLeft = exports.DottedArrowRight = exports.CrossEndLine = exports.CircleEndLine = exports.BiDirectionalArrow = exports.TripleColon = exports.Colon = exports.Semicolon = exports.Comma = exports.Ampersand = exports.ClassDefKeyword = exports.StyleKeyword = exports.ClassKeyword = exports.EndKeyword = exports.SubgraphKeyword = exports.Direction = exports.GraphKeyword = exports.FlowchartKeyword = exports.NumberLiteral = exports.Identifier = void 0;
exports.MermaidLexer = exports.allTokens = exports.Newline = exports.WhiteSpace = exports.Text = exports.ColorValue = void 0;
exports.tokenize = tokenize;
const chevrotain_1 = require("chevrotain");
// Identifiers - define first since used by keywords
exports.Identifier = (0, chevrotain_1.createToken)({
    name: "Identifier",
    pattern: /[a-zA-Z_][a-zA-Z0-9_-]*/
});
// Numbers (for node IDs like node1, node2)
exports.NumberLiteral = (0, chevrotain_1.createToken)({
    name: "NumberLiteral",
    pattern: /[0-9]+/
});
// Keywords
exports.FlowchartKeyword = (0, chevrotain_1.createToken)({
    name: "FlowchartKeyword",
    pattern: /flowchart/,
    longer_alt: exports.Identifier
});
exports.GraphKeyword = (0, chevrotain_1.createToken)({
    name: "GraphKeyword",
    pattern: /graph/,
    longer_alt: exports.Identifier
});
// Direction tokens
exports.Direction = (0, chevrotain_1.createToken)({
    name: "Direction",
    pattern: /TD|TB|BT|RL|LR/,
    longer_alt: exports.Identifier
});
// Subgraph keywords
exports.SubgraphKeyword = (0, chevrotain_1.createToken)({
    name: "SubgraphKeyword",
    pattern: /subgraph/,
    longer_alt: exports.Identifier
});
exports.EndKeyword = (0, chevrotain_1.createToken)({
    name: "EndKeyword",
    pattern: /end/,
    longer_alt: exports.Identifier
});
// Style keywords
exports.ClassKeyword = (0, chevrotain_1.createToken)({
    name: "ClassKeyword",
    pattern: /class/,
    longer_alt: exports.Identifier
});
exports.StyleKeyword = (0, chevrotain_1.createToken)({
    name: "StyleKeyword",
    pattern: /style/,
    longer_alt: exports.Identifier
});
exports.ClassDefKeyword = (0, chevrotain_1.createToken)({
    name: "ClassDefKeyword",
    pattern: /classDef/,
    longer_alt: exports.Identifier
});
// Special operators
exports.Ampersand = (0, chevrotain_1.createToken)({
    name: "Ampersand",
    pattern: /&/
});
exports.Comma = (0, chevrotain_1.createToken)({
    name: "Comma",
    pattern: /,/
});
exports.Semicolon = (0, chevrotain_1.createToken)({
    name: "Semicolon",
    pattern: /;/
});
exports.Colon = (0, chevrotain_1.createToken)({
    name: "Colon",
    pattern: /:/
});
// Triple colon for class annotations (e.g., A:::class)
exports.TripleColon = (0, chevrotain_1.createToken)({
    name: "TripleColon",
    pattern: /:::/
});
// Arrow/Link types - Order matters! More specific first
// Bidirectional and special end markers
exports.BiDirectionalArrow = (0, chevrotain_1.createToken)({
    name: "BiDirectionalArrow",
    pattern: /<-->/
});
exports.CircleEndLine = (0, chevrotain_1.createToken)({
    name: "CircleEndLine",
    pattern: /o--o|o---o|o----o/
});
exports.CrossEndLine = (0, chevrotain_1.createToken)({
    name: "CrossEndLine",
    pattern: /x--x|x---x|x----x/
});
// Dotted arrows with various lengths
exports.DottedArrowRight = (0, chevrotain_1.createToken)({
    name: "DottedArrowRight",
    pattern: /-\.->|-\.\.->|-\.\.\.->/
});
exports.DottedArrowLeft = (0, chevrotain_1.createToken)({
    name: "DottedArrowLeft",
    pattern: /<-\.-|<-\.\.-|<-\.\.\.-/
});
// Thick arrows
exports.ThickArrowRight = (0, chevrotain_1.createToken)({
    name: "ThickArrowRight",
    pattern: /==>|===>|====>/
});
exports.ThickArrowLeft = (0, chevrotain_1.createToken)({
    name: "ThickArrowLeft",
    pattern: /<==|<===|<====/
});
// Regular arrows with various lengths
exports.ArrowRight = (0, chevrotain_1.createToken)({
    name: "ArrowRight",
    pattern: /-->|--->|---->/
});
exports.ArrowLeft = (0, chevrotain_1.createToken)({
    name: "ArrowLeft",
    pattern: /<--|<---|<----/
});
// Lines (no arrows)
exports.DottedLine = (0, chevrotain_1.createToken)({
    name: "DottedLine",
    pattern: /-\.-|-\.\.-|-\.\.\.-/
});
exports.ThickLine = (0, chevrotain_1.createToken)({
    name: "ThickLine",
    pattern: /===|====|=====/
});
exports.Line = (0, chevrotain_1.createToken)({
    name: "Line",
    pattern: /---|----/
});
// Two dashes (for -- text --> pattern)
exports.TwoDashes = (0, chevrotain_1.createToken)({
    name: "TwoDashes",
    pattern: /--/
});
// Invalid single arrow (for error detection)
exports.InvalidArrow = (0, chevrotain_1.createToken)({
    name: "InvalidArrow",
    pattern: /->(?!>)/
});
// Node shapes - Special brackets
exports.DoubleSquareOpen = (0, chevrotain_1.createToken)({ name: "DoubleSquareOpen", pattern: /\[\[/ });
exports.DoubleSquareClose = (0, chevrotain_1.createToken)({ name: "DoubleSquareClose", pattern: /\]\]/ });
exports.DoubleRoundOpen = (0, chevrotain_1.createToken)({ name: "DoubleRoundOpen", pattern: /\(\(/ });
exports.DoubleRoundClose = (0, chevrotain_1.createToken)({ name: "DoubleRoundClose", pattern: /\)\)/ });
exports.HexagonOpen = (0, chevrotain_1.createToken)({ name: "HexagonOpen", pattern: /\{\{/ });
exports.HexagonClose = (0, chevrotain_1.createToken)({ name: "HexagonClose", pattern: /\}\}/ });
// Stadium shape: ([...])
exports.StadiumOpen = (0, chevrotain_1.createToken)({ name: "StadiumOpen", pattern: /\(\[/ });
exports.StadiumClose = (0, chevrotain_1.createToken)({ name: "StadiumClose", pattern: /\]\)/ });
// Database/Cylinder shape: [(...)]
exports.CylinderOpen = (0, chevrotain_1.createToken)({ name: "CylinderOpen", pattern: /\[\(/ });
exports.CylinderClose = (0, chevrotain_1.createToken)({ name: "CylinderClose", pattern: /\)\]/ });
// Trapezoid and Parallelogram shapes - these have complex syntax
// For now, we'll handle them as special text patterns in the parser
// Single character brackets
exports.SquareOpen = (0, chevrotain_1.createToken)({ name: "SquareOpen", pattern: /\[/ });
exports.SquareClose = (0, chevrotain_1.createToken)({ name: "SquareClose", pattern: /\]/ });
exports.RoundOpen = (0, chevrotain_1.createToken)({ name: "RoundOpen", pattern: /\(/ });
exports.RoundClose = (0, chevrotain_1.createToken)({ name: "RoundClose", pattern: /\)/ });
exports.DiamondOpen = (0, chevrotain_1.createToken)({ name: "DiamondOpen", pattern: /\{/ });
exports.DiamondClose = (0, chevrotain_1.createToken)({ name: "DiamondClose", pattern: /\}/ });
exports.AngleOpen = (0, chevrotain_1.createToken)({ name: "AngleOpen", pattern: />/ });
// Link text delimiter
exports.Pipe = (0, chevrotain_1.createToken)({ name: "Pipe", pattern: /\|/ });
// Text content patterns
exports.QuotedString = (0, chevrotain_1.createToken)({
    name: "QuotedString",
    pattern: /"[^"]*"|'[^']*'/
});
exports.MultilineText = (0, chevrotain_1.createToken)({
    name: "MultilineText",
    pattern: /"""[\s\S]*?"""/,
    line_breaks: true
});
// Comments
exports.Comment = (0, chevrotain_1.createToken)({
    name: "Comment",
    pattern: /%%[^\n\r]*/,
    group: chevrotain_1.Lexer.SKIPPED
});
// Style values (colors, etc)
exports.ColorValue = (0, chevrotain_1.createToken)({
    name: "ColorValue",
    pattern: /#[0-9a-fA-F]{3,6}/
});
// General text - must be less greedy
exports.Text = (0, chevrotain_1.createToken)({
    name: "Text",
    pattern: /[^[\](){}|<>\n\r\t &,;:]+/
});
// Whitespace
exports.WhiteSpace = (0, chevrotain_1.createToken)({
    name: "WhiteSpace",
    pattern: /[ \t]+/,
    group: chevrotain_1.Lexer.SKIPPED
});
// Newline
exports.Newline = (0, chevrotain_1.createToken)({
    name: "Newline",
    pattern: /[\n\r]+/,
    line_breaks: true
});
// Token order is CRUCIAL - most specific first
exports.allTokens = [
    // Comments (skipped)
    exports.Comment,
    // Multi-line strings before regular strings
    exports.MultilineText,
    exports.QuotedString,
    // Keywords before identifiers
    exports.FlowchartKeyword,
    exports.GraphKeyword,
    exports.SubgraphKeyword,
    exports.EndKeyword,
    exports.ClassDefKeyword,
    exports.ClassKeyword,
    exports.StyleKeyword,
    exports.Direction,
    // Special multi-char brackets before arrows (some contain > or -)
    exports.DoubleSquareOpen,
    exports.DoubleSquareClose,
    exports.DoubleRoundOpen,
    exports.DoubleRoundClose,
    exports.HexagonOpen,
    exports.HexagonClose,
    exports.StadiumOpen,
    exports.StadiumClose,
    exports.CylinderOpen,
    exports.CylinderClose,
    // Arrows and lines (most specific first)
    exports.BiDirectionalArrow,
    exports.CircleEndLine,
    exports.CrossEndLine,
    exports.DottedArrowRight,
    exports.DottedArrowLeft,
    exports.ThickArrowRight,
    exports.ThickArrowLeft,
    exports.ArrowRight,
    exports.ArrowLeft,
    exports.DottedLine,
    exports.ThickLine,
    exports.Line,
    exports.TwoDashes,
    exports.InvalidArrow,
    // Single char brackets and symbols
    exports.SquareOpen,
    exports.SquareClose,
    exports.RoundOpen,
    exports.RoundClose,
    exports.DiamondOpen,
    exports.DiamondClose,
    exports.AngleOpen,
    exports.Pipe,
    exports.TripleColon,
    exports.Ampersand,
    exports.Comma,
    exports.Semicolon,
    exports.Colon,
    // Values
    exports.ColorValue,
    exports.NumberLiteral,
    // Identifiers and text (most general)
    exports.Identifier,
    exports.Text,
    // Whitespace
    exports.WhiteSpace,
    exports.Newline
];
// Create and export the lexer
exports.MermaidLexer = new chevrotain_1.Lexer(exports.allTokens);
// Helper function to tokenize input
function tokenize(text) {
    const lexResult = exports.MermaidLexer.tokenize(text);
    // Do not log lexer errors directly; callers produce user-facing diagnostics.
    return lexResult;
}
