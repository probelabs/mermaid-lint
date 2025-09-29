import type { IToken, CstNode } from 'chevrotain';
import { parserInstance } from './parser.js';
import type { ValidationError } from '../../core/types.js';

// Minimal semantic pass scaffold for pie diagrams.
// Mermaid is permissive; we currently emit no errors to preserve parity.

type Ctx = { errors: ValidationError[] };
const BaseVisitor: any = (parserInstance as any).getBaseCstVisitorConstructorWithDefaults();

class PieSemanticsVisitor extends BaseVisitor {
  private ctx: Ctx;
  constructor(ctx: Ctx) {
    super();
    this.validateVisitor();
    this.ctx = ctx;
  }
  diagram(ctx: any) {
    if (ctx.statement) ctx.statement.forEach((s: CstNode) => this.visit(s));
  }
  statement(ctx: any) {
    // No-op: visit children to keep structure future-proof
    for (const k of Object.keys(ctx)) {
      const arr = (ctx as any)[k];
      if (Array.isArray(arr)) {
        arr.forEach((n) => {
          if (n && typeof (n as any).name === 'string') this.visit(n);
        });
      }
    }
  }
}

export function analyzePie(cst: CstNode, _tokens: IToken[]): ValidationError[] {
  const ctx: Ctx = { errors: [] };
  const v = new PieSemanticsVisitor(ctx);
  v.visit(cst);
  return ctx.errors;
}

