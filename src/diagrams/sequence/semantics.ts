import type { CstNode, IToken } from 'chevrotain';
import type { ValidationError } from '../../core/types.js';
import { parserInstance } from './parser.js';
import * as t from './lexer.js';

// Minimal semantic pass scaffold (hooks for future rules)
const BaseVisitor: any = (parserInstance as any).getBaseCstVisitorConstructorWithDefaults();

class SequenceSemanticsVisitor extends BaseVisitor {
  constructor(private ctx: { tokens: IToken[] }) {
    super();
    this.validateVisitor();
  }
}

export function analyzeSequence(_cst: CstNode, _tokens: IToken[]): ValidationError[] {
  const ctx = { tokens: _tokens };
  const v = new SequenceSemanticsVisitor(ctx);
  // Temporary CLI-parity checks: current mermaid-cli rejects meta/properties/details lines
  const errs: ValidationError[] = [];
  // Determine the first token on each line (after skipping whitespace/comments in lexer)
  const firstByLine = new Map<number, IToken>();
  for (const tk of _tokens) {
    const ln = tk.startLine ?? 1;
    const col = tk.startColumn ?? 1;
    const prev = firstByLine.get(ln);
    if (!prev || (prev.startColumn ?? Infinity) > col) firstByLine.set(ln, tk);
  }
  for (const tok of _tokens) {
    if (tok.tokenType === t.TitleKeyword || tok.tokenType === t.AccTitleKeyword || tok.tokenType === t.AccDescrKeyword) {
      // Only treat as meta header when token starts the line (avoid catching '... Accessible Title')
      const isLineStart = firstByLine.get(tok.startLine ?? 1) === tok;
      if (isLineStart) errs.push({
        line: tok.startLine ?? 1,
        column: tok.startColumn ?? 1,
        severity: 'error',
        code: 'SE-META-UNSUPPORTED',
        message: 'Title/accTitle/accDescr are not accepted by current Mermaid CLI for sequence diagrams.',
        hint: "Remove this line (e.g., 'title …') to match mermaid-cli.",
        length: (tok.image?.length ?? 5)
      });
    }
    if (tok.tokenType === t.PropertiesKeyword && firstByLine.get(tok.startLine ?? 1) === tok) {
      errs.push({
        line: tok.startLine ?? 1,
        column: tok.startColumn ?? 1,
        severity: 'error',
        code: 'SE-PROPERTIES-UNSUPPORTED',
        message: "'properties' is not accepted by current Mermaid CLI for sequence diagrams.",
        hint: "Remove the 'properties:' line to match mermaid-cli.",
        length: (tok.image?.length ?? 10)
      });
    }
    if (tok.tokenType === t.DetailsKeyword && firstByLine.get(tok.startLine ?? 1) === tok) {
      errs.push({
        line: tok.startLine ?? 1,
        column: tok.startColumn ?? 1,
        severity: 'error',
        code: 'SE-DETAILS-UNSUPPORTED',
        message: "'details' is not accepted by current Mermaid CLI for sequence diagrams.",
        hint: "Remove the 'details:' line to match mermaid-cli.",
        length: (tok.image?.length ?? 7)
      });
    }
  }
  return errs;
}
