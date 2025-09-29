import { CstParser, type IToken } from 'chevrotain';
import * as t from './lexer.js';

export class PieParser extends CstParser {
  constructor() {
    super(t.allTokens);
    this.performSelfAnalysis();
  }

  public diagram = this.RULE('diagram', () => {
    this.CONSUME(t.PieKeyword);
    this.OPTION(() => this.CONSUME(t.Newline));
    this.MANY(() => this.SUBRULE(this.statement));
  });

  private statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.titleStmt) },
      { ALT: () => this.SUBRULE(this.showDataStmt) },
      { ALT: () => this.SUBRULE(this.sliceStmt) },
      { ALT: () => this.CONSUME(t.Newline) },
    ]);
  });

  private titleStmt = this.RULE('titleStmt', () => {
    this.CONSUME(t.TitleKeyword);
    this.OPTION(() => this.CONSUME(t.Colon));
    this.AT_LEAST_ONE(() => this.OR([
      { ALT: () => this.CONSUME(t.QuotedString) },
      { ALT: () => this.CONSUME(t.Text) },
      { ALT: () => this.CONSUME(t.NumberLiteral) },
    ]));
    this.OPTION2(() => this.CONSUME(t.Newline));
  });

  private showDataStmt = this.RULE('showDataStmt', () => {
    this.CONSUME(t.ShowDataKeyword);
    this.OPTION(() => this.CONSUME(t.Newline));
  });

  private sliceStmt = this.RULE('sliceStmt', () => {
    this.SUBRULE(this.sliceLabel);
    this.OPTION(() => this.CONSUME(t.Colon));
    this.OPTION2(() => this.CONSUME(t.NumberLiteral));
    this.OPTION3(() => this.CONSUME(t.Newline));
  });

  private sliceLabel = this.RULE('sliceLabel', () => {
    this.OR([
      { ALT: () => this.CONSUME(t.QuotedString) },
      { ALT: () => this.AT_LEAST_ONE(() => this.CONSUME(t.Text)) },
    ]);
  });
}

export const parserInstance = new PieParser();

export function parse(tokens: IToken[]) {
  parserInstance.input = tokens;
  const cst = parserInstance.diagram();
  return { cst, errors: parserInstance.errors };
}
