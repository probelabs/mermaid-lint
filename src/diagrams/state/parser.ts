import { CstParser, EOF, type IToken } from 'chevrotain';
import * as t from './lexer.js';

export class StateParser extends CstParser {
  constructor() {
    super(t.allTokens);
    this.performSelfAnalysis();
  }

  public diagram = this.RULE('diagram', () => {
    this.OR([
      { ALT: () => this.CONSUME(t.StateDiagramV2) },
      { ALT: () => this.CONSUME(t.StateDiagram) },
    ]);
    this.OPTION(() => this.CONSUME(t.Newline));
    this.MANY(() => this.SUBRULE(this.statement));
  });

  private statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.directionStmt) },
      { ALT: () => this.SUBRULE(this.transitionStmt) },
      { ALT: () => this.SUBRULE(this.stateDecl) },
      { ALT: () => this.SUBRULE(this.stateBlock) },
      { ALT: () => this.SUBRULE(this.noteStmt) },
      { ALT: () => this.CONSUME(t.Newline) },
      { ALT: () => this.CONSUME(EOF as any) },
    ]);
  });

  private directionStmt = this.RULE('directionStmt', () => {
    this.CONSUME(t.DirectionKw);
    this.CONSUME(t.Direction);
    this.OPTION(() => this.CONSUME(t.Newline));
  });

  private actorRef = this.RULE('actorRef', () => {
    this.OR([
      { ALT: () => this.CONSUME(t.Start) },
      { ALT: () => this.CONSUME(t.Identifier) },
      { ALT: () => this.CONSUME(t.QuotedString) },
    ]);
  });

  private labelText = this.RULE('labelText', () => {
    this.OR([
      { ALT: () => this.CONSUME(t.QuotedString) },
      { ALT: () => this.CONSUME(t.Identifier) },
      { ALT: () => this.CONSUME(t.NumberLiteral) },
    ]);
  });

  // A --> B [: label]
  private transitionStmt = this.RULE('transitionStmt', () => {
    this.SUBRULE(this.actorRef);
    this.OR([
      { ALT: () => this.CONSUME(t.Arrow) },
      { ALT: () => this.CONSUME(t.InvalidArrow) },
    ]);
    this.SUBRULE2(this.actorRef);
    this.OPTION(() => {
      this.CONSUME(t.Colon);
      this.AT_LEAST_ONE(() => this.SUBRULE(this.labelText));
    });
    this.OPTION2(() => this.CONSUME(t.Newline));
  });

  // state "desc" as s2   |   s2 : description
  private stateDecl = this.RULE('stateDecl', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(t.StateKw);
          this.CONSUME(t.QuotedString);
          this.CONSUME(t.AsKw);
          this.CONSUME(t.Identifier);
        }
      },
      {
        ALT: () => {
          this.CONSUME2(t.Identifier);
          this.CONSUME(t.Colon);
          this.AT_LEAST_ONE(() => this.SUBRULE(this.labelText));
        }
      }
    ]);
    this.OPTION(() => this.CONSUME(t.Newline));
  });

  // state Foo { ... }
  private stateBlock = this.RULE('stateBlock', () => {
    this.CONSUME(t.StateKw);
    this.OR([
      { ALT: () => this.CONSUME(t.Identifier) },
      { ALT: () => this.CONSUME(t.QuotedString) },
    ]);
    this.CONSUME(t.LCurly);
    this.MANY(() => this.SUBRULE(this.statement));
    this.CONSUME(t.RCurly);
    this.OPTION(() => this.CONSUME(t.Newline));
  });

  private noteStmt = this.RULE('noteStmt', () => {
    this.CONSUME(t.NoteKw);
    this.OR([
      {
        ALT: () => {
          this.CONSUME(t.LeftKw);
          this.CONSUME(t.OfKw);
          this.SUBRULE(this.actorRef);
        }
      },
      {
        ALT: () => {
          this.CONSUME(t.RightKw);
          this.CONSUME2(t.OfKw);
          this.SUBRULE2(this.actorRef);
        }
      },
      {
        ALT: () => {
          this.CONSUME(t.OverKw);
          this.SUBRULE3(this.actorRef);
          this.OPTION(() => { this.CONSUME(t.Comma); this.SUBRULE4(this.actorRef); });
        }
      }
    ]);
    this.CONSUME(t.Colon);
    this.AT_LEAST_ONE(() => this.SUBRULE(this.labelText));
    this.OPTION2(() => this.CONSUME(t.Newline));
  });
}

export const parserInstance = new StateParser();
export function parse(tokens: IToken[]) {
  parserInstance.input = tokens;
  const cst = parserInstance.diagram();
  return { cst, errors: parserInstance.errors };
}
