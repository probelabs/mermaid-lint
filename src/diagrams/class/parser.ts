import { CstParser, EOF, type IToken } from 'chevrotain';
import * as t from './lexer.js';

export class ClassParser extends CstParser {
  constructor() {
    super(t.allTokens);
    this.performSelfAnalysis();
  }

  public diagram = this.RULE('diagram', () => {
    this.CONSUME(t.ClassDiagramKeyword);
    this.OPTION(() => this.CONSUME(t.Newline));
    this.MANY(() => this.SUBRULE(this.statement));
  });

  private statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.directionStmt) },
      { ALT: () => this.SUBRULE(this.classLine) },
      { ALT: () => this.SUBRULE(this.relationStmt) },
      { ALT: () => this.SUBRULE(this.memberAssignStmt) },
      { ALT: () => this.CONSUME(t.Newline) },
    ]);
  });

  private directionStmt = this.RULE('directionStmt', () => {
    this.CONSUME(t.DirectionKw);
    this.CONSUME(t.Direction);
    this.OPTION(() => this.CONSUME(t.Newline));
  });

  // Unified class line: either a declaration with optional stereotype/alias or a block
  private classLine = this.RULE('classLine', () => {
    this.CONSUME(t.ClassKw);
    this.SUBRULE(this.classRef);
    this.OR([
      {
        ALT: () => {
          this.CONSUME(t.LCurly);
          this.MANY(() => {
            this.OR2([
              { ALT: () => this.SUBRULE(this.memberLineStmt) },
              { ALT: () => this.CONSUME3(t.Newline) },
            ]);
          });
          this.CONSUME(t.RCurly);
          this.OPTION(() => this.CONSUME(t.Newline));
        }
      },
      {
        ALT: () => {
          this.OPTION1(() => {
            this.CONSUME(t.LTlt);
            this.CONSUME2(t.Identifier);
            this.CONSUME(t.GTgt);
          });
          this.OPTION2(() => {
            this.CONSUME(t.AsKw);
            this.CONSUME3(t.Identifier);
          });
          this.OPTION3(() => this.CONSUME2(t.Newline));
        }
      }
    ]);
  });

  // Foo : +bar()
  private memberAssignStmt = this.RULE('memberAssignStmt', () => {
    this.SUBRULE(this.classRef);
    this.CONSUME(t.Colon);
    this.SUBRULE(this.memberLine);
    this.OPTION(() => this.CONSUME(t.Newline));
  });

  private memberLineStmt = this.RULE('memberLineStmt', () => {
    this.SUBRULE(this.memberLine);
    this.OPTION(() => this.CONSUME(t.Newline));
  });

  private memberLine = this.RULE('memberLine', () => {
    this.OPTION(() => this.CONSUME(t.Visibility));
    // name [ '(' args ')' ] [ ':' type ]
    this.SUBRULE(this.memberName);
    this.OPTION2(() => {
      this.CONSUME(t.LParen);
      this.OPTION3(() => this.SUBRULE(this.argList));
      this.CONSUME(t.RParen);
    });
    this.OPTION4(() => {
      this.CONSUME(t.Colon);
      this.SUBRULE(this.typeRef);
    });
  });

  private memberName = this.RULE('memberName', () => {
    this.OR([
      { ALT: () => this.CONSUME(t.Identifier) },
      { ALT: () => this.CONSUME(t.QuotedString) },
    ]);
  });

  private argList = this.RULE('argList', () => {
    this.SUBRULE(this.typeRef);
    this.MANY(() => {
      this.CONSUME(t.Comma);
      this.SUBRULE2(this.typeRef);
    });
  });

  private typeRef = this.RULE('typeRef', () => {
    this.OR([
      { ALT: () => this.CONSUME(t.Identifier) },
      { ALT: () => this.CONSUME(t.NumberLiteral) },
      { ALT: () => this.CONSUME(t.QuotedString) },
    ]);
  });

  private relationOp = this.RULE('relationOp', () => {
    this.OR([
      { ALT: () => this.CONSUME(t.RelExtends) },
      { ALT: () => this.CONSUME(t.RelComposition) },
      { ALT: () => this.CONSUME(t.RelAggregation) },
      { ALT: () => this.CONSUME(t.RelRealization) },
      { ALT: () => this.CONSUME(t.RelDependency) },
      { ALT: () => this.CONSUME(t.RelAssociation) },
    ]);
  });

  private classRef = this.RULE('classRef', () => {
    this.OR([
      { ALT: () => this.CONSUME(t.Identifier) },
      { ALT: () => this.CONSUME(t.QuotedString) },
      { ALT: () => this.CONSUME(t.BacktickName) },
    ]);
  });

  private labelText = this.RULE('labelText', () => {
    this.OR([
      { ALT: () => this.CONSUME(t.QuotedString) },
      { ALT: () => this.CONSUME(t.Identifier) },
      { ALT: () => this.CONSUME(t.NumberLiteral) },
    ]);
  });

  // Foo <|-- Bar [: Label]
  private relationStmt = this.RULE('relationStmt', () => {
    this.SUBRULE(this.classRef);
    this.SUBRULE(this.relationOp);
    this.SUBRULE2(this.classRef);
    this.OPTION(() => {
      this.CONSUME(t.Colon);
      this.AT_LEAST_ONE_SEP({
        SEP: t.Comma,
        DEF: () => this.SUBRULE(this.labelText),
      });
    });
    this.OPTION2(() => this.CONSUME(t.Newline));
  });
}

export const parserInstance = new ClassParser();
export function parse(tokens: IToken[]) {
  parserInstance.input = tokens;
  const cst = parserInstance.diagram();
  return { cst, errors: parserInstance.errors };
}
