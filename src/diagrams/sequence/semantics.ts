import type { CstNode, IToken } from 'chevrotain';
import type { ValidationError } from '../../core/types.js';
import { parserInstance } from './parser.js';

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
  // No-op for now; parser structure already guards most syntax. Add checks here later.
  return [];
}

