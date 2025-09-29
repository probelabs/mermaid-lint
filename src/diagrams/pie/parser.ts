import { CstParser, type IToken } from 'chevrotain';
import * as t from './lexer.js';

export class PieParser extends CstParser {
  constructor() {
    super(t.allTokens);
    this.performSelfAnalysis();
  }

  public diagram = this.RULE('diagram', () => {
    this.CONSUME(t.PieKeyword);
    // Optional inline flag: `pie showData`
    this.OPTION(() => this.CONSUME(t.ShowDataKeyword));
    this.OPTION2(() => this.CONSUME(t.Newline));
    this.MANY(() => this.SUBRULE(this.statement));
  });

  private statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.titleStmt) },
      { ALT: () => this.SUBRULE(this.sliceStmt) },
      { ALT: () => this.CONSUME(t.Newline) },
    ]);
  });

  private titleStmt = this.RULE('titleStmt', () => {
    this.CONSUME(t.TitleKeyword);
    this.AT_LEAST_ONE(() => this.OR([
      { ALT: () => this.CONSUME(t.QuotedString) },
      { ALT: () => this.CONSUME(t.Text) },
      { ALT: () => this.CONSUME(t.NumberLiteral) },
    ]));
    this.OPTION2(() => this.CONSUME(t.Newline));
  });

  private sliceStmt = this.RULE('sliceStmt', () => {
    this.SUBRULE(this.sliceLabel);
    this.CONSUME(t.Colon);
    this.CONSUME(t.NumberLiteral);
    this.OPTION3(() => this.CONSUME(t.Newline));
  });

  private sliceLabel = this.RULE('sliceLabel', () => {
    // Mermaid requires labels to be quoted (single or double quotes)
    this.CONSUME(t.QuotedString);
  });
}

export const parserInstance = new PieParser();

export function parse(tokens: IToken[]) {
  parserInstance.input = tokens;
  const cst = parserInstance.diagram();
  return { cst, errors: parserInstance.errors };
}
