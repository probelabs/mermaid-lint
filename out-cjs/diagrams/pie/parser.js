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
exports.parserInstance = exports.PieParser = void 0;
exports.parse = parse;
const chevrotain_1 = require("chevrotain");
const t = __importStar(require("./lexer.js"));
class PieParser extends chevrotain_1.CstParser {
    constructor() {
        super(t.allTokens);
        this.diagram = this.RULE('diagram', () => {
            this.CONSUME(t.PieKeyword);
            // Optional inline flag: `pie showData`
            this.OPTION(() => this.CONSUME(t.ShowDataKeyword));
            this.OPTION2(() => this.CONSUME(t.Newline));
            this.MANY(() => this.SUBRULE(this.statement));
        });
        this.statement = this.RULE('statement', () => {
            this.OR([
                { ALT: () => this.SUBRULE(this.titleStmt) },
                { ALT: () => this.SUBRULE(this.sliceStmt) },
                { ALT: () => this.CONSUME(t.Newline) },
            ]);
        });
        this.titleStmt = this.RULE('titleStmt', () => {
            this.CONSUME(t.TitleKeyword);
            this.AT_LEAST_ONE(() => this.OR([
                { ALT: () => this.CONSUME(t.QuotedString) },
                { ALT: () => this.CONSUME(t.Text) },
                { ALT: () => this.CONSUME(t.NumberLiteral) },
            ]));
            this.OPTION2(() => this.CONSUME(t.Newline));
        });
        this.sliceStmt = this.RULE('sliceStmt', () => {
            this.SUBRULE(this.sliceLabel);
            this.CONSUME(t.Colon);
            this.CONSUME(t.NumberLiteral);
            this.OPTION3(() => this.CONSUME(t.Newline));
        });
        this.sliceLabel = this.RULE('sliceLabel', () => {
            // Mermaid requires labels to be quoted (single or double quotes)
            this.CONSUME(t.QuotedString);
        });
        this.performSelfAnalysis();
    }
}
exports.PieParser = PieParser;
exports.parserInstance = new PieParser();
function parse(tokens) {
    exports.parserInstance.input = tokens;
    const cst = exports.parserInstance.diagram();
    return { cst, errors: exports.parserInstance.errors };
}
