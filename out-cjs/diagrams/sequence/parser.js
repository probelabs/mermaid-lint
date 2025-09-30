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
exports.parserInstance = exports.SequenceParser = void 0;
exports.parse = parse;
const chevrotain_1 = require("chevrotain");
const t = __importStar(require("./lexer.js"));
class SequenceParser extends chevrotain_1.CstParser {
    constructor() {
        super(t.allTokens);
        this.diagram = this.RULE('diagram', () => {
            this.CONSUME(t.SequenceKeyword);
            this.MANY(() => this.CONSUME(t.Newline));
            this.MANY2(() => {
                this.SUBRULE(this.line);
            });
            this.OPTION(() => this.CONSUME(chevrotain_1.EOF));
        });
        this.line = this.RULE('line', () => {
            this.OR([
                { ALT: () => this.SUBRULE(this.participantDecl) },
                { ALT: () => this.SUBRULE(this.autonumberStmt) },
                { ALT: () => this.SUBRULE(this.noteStmt) },
                { ALT: () => this.SUBRULE(this.activateStmt) },
                { ALT: () => this.SUBRULE(this.deactivateStmt) },
                { ALT: () => this.SUBRULE(this.createStmt) },
                { ALT: () => this.SUBRULE(this.destroyStmt) },
                { ALT: () => this.SUBRULE(this.linkStmt) },
                { ALT: () => this.SUBRULE(this.altBlock) },
                { ALT: () => this.SUBRULE(this.optBlock) },
                { ALT: () => this.SUBRULE(this.loopBlock) },
                { ALT: () => this.SUBRULE(this.parBlock) },
                { ALT: () => this.SUBRULE(this.criticalBlock) },
                { ALT: () => this.SUBRULE(this.breakBlock) },
                { ALT: () => this.SUBRULE(this.rectBlock) },
                { ALT: () => this.SUBRULE(this.boxBlock) },
                { ALT: () => this.SUBRULE(this.messageStmt) },
                { ALT: () => this.SUBRULE(this.blankLine) },
            ]);
        });
        this.blankLine = this.RULE('blankLine', () => {
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
        });
        this.actorRef = this.RULE('actorRef', () => {
            // Accept a sequence of tokens that form the actor name until 'as' or newline/arrow/punct
            this.AT_LEAST_ONE(() => this.OR([
                { ALT: () => this.CONSUME(t.Identifier) },
                { ALT: () => this.CONSUME(t.QuotedString) },
                { ALT: () => this.CONSUME(t.NumberLiteral) },
                { ALT: () => this.CONSUME(t.Text) },
            ]));
        });
        this.participantDecl = this.RULE('participantDecl', () => {
            this.OR([
                { ALT: () => this.CONSUME(t.ParticipantKeyword) },
                { ALT: () => this.CONSUME(t.ActorKeyword) },
            ]);
            this.SUBRULE(this.actorRef);
            this.OPTION(() => {
                this.CONSUME(t.AsKeyword);
                this.SUBRULE2(this.actorRef);
            });
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
        });
        this.autonumberStmt = this.RULE('autonumberStmt', () => {
            this.CONSUME(t.AutonumberKeyword);
            this.OPTION(() => {
                this.OR([
                    { ALT: () => this.CONSUME(t.OffKeyword) },
                    { ALT: () => {
                            this.CONSUME(t.NumberLiteral);
                            this.OPTION2(() => this.CONSUME2(t.NumberLiteral));
                        } },
                ]);
            });
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
        });
        this.noteStmt = this.RULE('noteStmt', () => {
            this.CONSUME(t.NoteKeyword);
            this.OR([
                { ALT: () => {
                        this.OR2([
                            { ALT: () => this.CONSUME(t.LeftKeyword) },
                            { ALT: () => this.CONSUME(t.RightKeyword) },
                        ]);
                        this.CONSUME(t.OfKeyword);
                        this.SUBRULE(this.actorRef);
                    } },
                { ALT: () => {
                        this.CONSUME(t.OverKeyword);
                        this.SUBRULE2(this.actorRef);
                        this.OPTION(() => {
                            this.CONSUME(t.Comma);
                            this.SUBRULE3(this.actorRef);
                        });
                    } }
            ]);
            this.CONSUME(t.Colon);
            this.OPTION2(() => this.SUBRULE(this.lineRemainder));
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
        });
        this.activateStmt = this.RULE('activateStmt', () => {
            this.CONSUME(t.ActivateKeyword);
            this.SUBRULE(this.actorRef);
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
        });
        this.deactivateStmt = this.RULE('deactivateStmt', () => {
            this.CONSUME(t.DeactivateKeyword);
            this.SUBRULE(this.actorRef);
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
        });
        this.createStmt = this.RULE('createStmt', () => {
            this.CONSUME(t.CreateKeyword);
            this.OR([
                { ALT: () => this.CONSUME(t.ParticipantKeyword) },
                { ALT: () => this.CONSUME(t.ActorKeyword) },
            ]);
            this.SUBRULE(this.actorRef);
            this.OPTION(() => {
                this.CONSUME(t.AsKeyword);
                this.OPTION2(() => this.SUBRULE(this.lineRemainder));
            });
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
        });
        this.destroyStmt = this.RULE('destroyStmt', () => {
            this.CONSUME(t.DestroyKeyword);
            this.OPTION(() => {
                this.OR([
                    { ALT: () => this.CONSUME(t.ParticipantKeyword) },
                    { ALT: () => this.CONSUME(t.ActorKeyword) },
                ]);
            });
            this.SUBRULE(this.actorRef);
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
        });
        this.linkStmt = this.RULE('linkStmt', () => {
            this.OR([
                { ALT: () => this.CONSUME(t.LinkKeyword) },
                { ALT: () => this.CONSUME(t.LinksKeyword) },
            ]);
            this.SUBRULE(this.actorRef);
            this.CONSUME(t.Colon);
            this.OPTION(() => this.SUBRULE(this.lineRemainder));
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
        });
        this.messageStmt = this.RULE('messageStmt', () => {
            this.SUBRULE(this.actorRef);
            this.SUBRULE(this.arrow);
            this.OPTION(() => this.OR([
                { ALT: () => this.CONSUME(t.Plus) },
                { ALT: () => this.CONSUME(t.Minus) }
            ]));
            this.SUBRULE2(this.actorRef);
            this.CONSUME(t.Colon);
            this.OPTION2(() => this.SUBRULE(this.lineRemainder));
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
        });
        this.arrow = this.RULE('arrow', () => {
            this.OR([
                { ALT: () => this.CONSUME(t.BidirAsyncDotted) },
                { ALT: () => this.CONSUME(t.BidirAsync) },
                { ALT: () => this.CONSUME(t.DottedAsync) },
                { ALT: () => this.CONSUME(t.Async) },
                { ALT: () => this.CONSUME(t.Dotted) },
                { ALT: () => this.CONSUME(t.Solid) },
                { ALT: () => this.CONSUME(t.DottedCross) },
                { ALT: () => this.CONSUME(t.Cross) },
                { ALT: () => this.CONSUME(t.DottedOpen) },
                { ALT: () => this.CONSUME(t.Open) },
            ]);
        });
        // Blocks
        this.altBlock = this.RULE('altBlock', () => {
            this.CONSUME(t.AltKeyword);
            this.OPTION(() => this.SUBRULE(this.lineRemainder));
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
            this.MANY(() => this.SUBRULE(this.line));
            this.MANY2(() => {
                this.CONSUME(t.ElseKeyword);
                this.OPTION2(() => this.SUBRULE2(this.lineRemainder));
                this.AT_LEAST_ONE2(() => this.CONSUME2(t.Newline));
                this.MANY3(() => this.SUBRULE2(this.line));
            });
            this.CONSUME(t.EndKeyword);
            this.AT_LEAST_ONE3(() => this.CONSUME3(t.Newline));
        });
        this.optBlock = this.RULE('optBlock', () => {
            this.CONSUME(t.OptKeyword);
            this.OPTION(() => this.SUBRULE(this.lineRemainder));
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
            this.MANY(() => this.SUBRULE(this.line));
            this.CONSUME(t.EndKeyword);
            this.AT_LEAST_ONE2(() => this.CONSUME2(t.Newline));
        });
        this.loopBlock = this.RULE('loopBlock', () => {
            this.CONSUME(t.LoopKeyword);
            this.OPTION(() => this.SUBRULE(this.lineRemainder));
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
            this.MANY(() => this.SUBRULE(this.line));
            this.CONSUME(t.EndKeyword);
            this.AT_LEAST_ONE2(() => this.CONSUME2(t.Newline));
        });
        this.parBlock = this.RULE('parBlock', () => {
            this.CONSUME(t.ParKeyword);
            this.OPTION(() => this.SUBRULE(this.lineRemainder));
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
            this.MANY(() => this.SUBRULE(this.line));
            this.MANY2(() => {
                this.CONSUME(t.AndKeyword);
                this.OPTION2(() => this.SUBRULE2(this.lineRemainder));
                this.AT_LEAST_ONE2(() => this.CONSUME2(t.Newline));
                this.MANY3(() => this.SUBRULE2(this.line));
            });
            this.CONSUME(t.EndKeyword);
            this.AT_LEAST_ONE3(() => this.CONSUME3(t.Newline));
        });
        this.criticalBlock = this.RULE('criticalBlock', () => {
            this.CONSUME(t.CriticalKeyword);
            this.OPTION(() => this.SUBRULE(this.lineRemainder));
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
            this.MANY(() => this.SUBRULE(this.line));
            this.MANY2(() => {
                this.CONSUME(t.OptionKeyword);
                this.OPTION2(() => this.SUBRULE2(this.lineRemainder));
                this.AT_LEAST_ONE2(() => this.CONSUME2(t.Newline));
                this.MANY3(() => this.SUBRULE2(this.line));
            });
            this.CONSUME(t.EndKeyword);
            this.AT_LEAST_ONE3(() => this.CONSUME3(t.Newline));
        });
        this.breakBlock = this.RULE('breakBlock', () => {
            this.CONSUME(t.BreakKeyword);
            this.OPTION(() => this.SUBRULE(this.lineRemainder));
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
            this.MANY(() => this.SUBRULE(this.line));
            this.CONSUME(t.EndKeyword);
            this.AT_LEAST_ONE2(() => this.CONSUME2(t.Newline));
        });
        this.rectBlock = this.RULE('rectBlock', () => {
            this.CONSUME(t.RectKeyword);
            this.OPTION(() => this.SUBRULE(this.lineRemainder));
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
            this.MANY(() => this.SUBRULE(this.line));
            this.CONSUME(t.EndKeyword);
            this.AT_LEAST_ONE2(() => this.CONSUME2(t.Newline));
        });
        this.boxBlock = this.RULE('boxBlock', () => {
            this.CONSUME(t.BoxKeyword);
            this.OPTION(() => this.SUBRULE(this.lineRemainder));
            this.AT_LEAST_ONE(() => this.CONSUME(t.Newline));
            this.MANY(() => this.SUBRULE(this.line));
            this.CONSUME(t.EndKeyword);
            this.AT_LEAST_ONE2(() => this.CONSUME2(t.Newline));
        });
        this.lineRemainder = this.RULE('lineRemainder', () => {
            this.AT_LEAST_ONE(() => this.OR([
                { ALT: () => this.CONSUME(t.Identifier) },
                { ALT: () => this.CONSUME(t.NumberLiteral) },
                { ALT: () => this.CONSUME(t.QuotedString) },
                { ALT: () => this.CONSUME(t.Text) },
                { ALT: () => this.CONSUME(t.Plus) },
                { ALT: () => this.CONSUME(t.Minus) },
                { ALT: () => this.CONSUME(t.Comma) },
                { ALT: () => this.CONSUME(t.Colon) },
                { ALT: () => this.CONSUME(t.LParen) },
                { ALT: () => this.CONSUME(t.RParen) },
                // Allow any keywords if they happen to appear in text
                { ALT: () => this.CONSUME(t.AndKeyword) },
                { ALT: () => this.CONSUME(t.ElseKeyword) },
                { ALT: () => this.CONSUME(t.OptKeyword) },
                { ALT: () => this.CONSUME(t.OptionKeyword) },
                { ALT: () => this.CONSUME(t.LoopKeyword) },
                { ALT: () => this.CONSUME(t.ParKeyword) },
                { ALT: () => this.CONSUME(t.RectKeyword) },
                { ALT: () => this.CONSUME(t.CriticalKeyword) },
                { ALT: () => this.CONSUME(t.BreakKeyword) },
                { ALT: () => this.CONSUME(t.BoxKeyword) },
                { ALT: () => this.CONSUME(t.EndKeyword) },
                { ALT: () => this.CONSUME(t.NoteKeyword) },
                { ALT: () => this.CONSUME(t.LeftKeyword) },
                { ALT: () => this.CONSUME(t.RightKeyword) },
                { ALT: () => this.CONSUME(t.OverKeyword) },
                { ALT: () => this.CONSUME(t.OfKeyword) },
                { ALT: () => this.CONSUME(t.AutonumberKeyword) },
                { ALT: () => this.CONSUME(t.OffKeyword) },
                { ALT: () => this.CONSUME(t.LinkKeyword) },
                { ALT: () => this.CONSUME(t.LinksKeyword) },
                { ALT: () => this.CONSUME(t.CreateKeyword) },
                { ALT: () => this.CONSUME(t.DestroyKeyword) },
                { ALT: () => this.CONSUME(t.ParticipantKeyword) },
                { ALT: () => this.CONSUME(t.ActorKeyword) },
                { ALT: () => this.CONSUME(t.ActivateKeyword) },
                { ALT: () => this.CONSUME(t.DeactivateKeyword) },
            ]));
        });
        this.performSelfAnalysis();
    }
}
exports.SequenceParser = SequenceParser;
exports.parserInstance = new SequenceParser();
function parse(tokens) {
    exports.parserInstance.input = tokens;
    const cst = exports.parserInstance.diagram();
    return { cst, errors: exports.parserInstance.errors };
}
