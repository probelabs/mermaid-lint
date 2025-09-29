import type { IToken, CstNode } from 'chevrotain';
import { parserInstance } from './parser.js';
import type { ValidationError } from '../../core/types.js';

type Ctx = { errors: ValidationError[] };

// Build a CST visitor base from the parser instance
const BaseVisitor: any = (parserInstance as any).getBaseCstVisitorConstructorWithDefaults();

class FlowSemanticsVisitor extends BaseVisitor {
  private ctx: Ctx;

  constructor(ctx: Ctx) {
    super();
    this.validateVisitor();
    this.ctx = ctx;
  }

  // Entry point
  diagram(ctx: any) {
    // Visit all statements
    if (ctx.statement) ctx.statement.forEach((s: CstNode) => this.visit(s));
  }

  statement(ctx: any) {
    // delegate to child rules only (skip token arrays)
    for (const k of Object.keys(ctx)) {
      const arr = (ctx as any)[k];
      if (Array.isArray(arr)) {
        arr.forEach((n) => {
          if (n && typeof (n as any).name === 'string') this.visit(n);
        });
      }
    }
  }

  subgraph(ctx: any) {
    if (ctx.subgraphStatement) ctx.subgraphStatement.forEach((s: CstNode) => this.visit(s));
  }

  subgraphStatement(ctx: any) {
    // visit nested rules inside subgraph body
    for (const k of Object.keys(ctx)) {
      const arr = (ctx as any)[k];
      if (Array.isArray(arr)) {
        arr.forEach((n) => {
          if (n && typeof (n as any).name === 'string') this.visit(n);
        });
      }
    }
  }

  directionStatement(ctx: any) {
    const kwTok = ctx.dirKw?.[0] as IToken | undefined;
    if (kwTok && kwTok.image !== 'direction') {
      this.ctx.errors.push({
        line: kwTok.startLine ?? 1,
        column: kwTok.startColumn ?? 1,
        severity: 'error',
        code: 'FL-DIR-KW-INVALID',
        message: `Unknown keyword '${kwTok.image}' before direction. Use 'direction TB' / 'LR' / etc.`,
        hint: "Example inside subgraph: 'direction TB'"
      });
    }
  }

  nodeStatement(ctx: any) {
    if (ctx.nodeOrParallelGroup) ctx.nodeOrParallelGroup.forEach((n: CstNode) => this.visit(n));
    // links are syntactic; semantic link warnings stay outside for now
  }

  nodeOrParallelGroup(ctx: any) {
    if (ctx.node) ctx.node.forEach((n: CstNode) => this.visit(n));
  }

  node(ctx: any) {
    // only shape/content semantics live here
    if (ctx.nodeShape) ctx.nodeShape.forEach((n: CstNode) => this.visit(n));
  }

  private checkEmptyContent(openTok: IToken, contentNodes: CstNode[] | undefined) {
    // No content nodes at all
    if (!contentNodes || contentNodes.length === 0) {
      this.ctx.errors.push({
        line: openTok.startLine ?? 1,
        column: openTok.startColumn ?? 1,
        severity: 'error',
        message: 'Empty node content is not allowed. Add a label inside the shape.',
        code: 'FL-NODE-EMPTY',
        hint: 'Put some text inside [], (), {}, etc. For example: A[Start]'
      });
      return;
    }
    // content exists – check quoted empty strings
    for (const cn of contentNodes) {
      const ch: any = (cn as any).children || {};
      const qs: IToken[] = ([] as IToken[])
        .concat(ch.QuotedString || [])
        .concat(ch.MultilineText || []);
      for (const q of qs) {
        const img = q.image;
        if (!img) continue;
        // remove wrappers
        const text = img.startsWith('"') || img.startsWith("'") ? img.slice(1, -1) : img;
        if (text.trim().length === 0) {
          this.ctx.errors.push({
            line: q.startLine ?? 1,
            column: q.startColumn ?? 1,
            severity: 'error',
            message: 'Empty node content is not allowed. Label cannot be just empty quotes.',
            code: 'FL-NODE-EMPTY',
            hint: 'Use non-empty quoted text, e.g. "Start" or remove the quotes.'
          });
        }
      }
    }
  }

  private checkEscapedQuotes(contentNodes: CstNode[] | undefined) {
    if (!contentNodes) return;
    for (const cn of contentNodes) {
      const ch: any = (cn as any).children || {};
      const tokens: IToken[] = ([] as IToken[])
        .concat(ch.QuotedString || [])
        .concat(ch.Text || [])
        .concat(ch.Identifier || [])
        .concat(ch.NumberLiteral || []);
      for (const t of tokens) {
        if (t.image && t.image.includes('\\"')) {
          this.ctx.errors.push({
            line: t.startLine ?? 1,
            column: t.startColumn ?? 1,
            severity: 'error',
            message: 'Escaped quotes (\\") in node labels are not supported by Mermaid. Use &quot; instead.',
            code: 'FL-LABEL-ESCAPED-QUOTE',
            hint: 'Prefer "He said &quot;Hi&quot;".'
          });
        }
      }
    }
  }

  private checkDoubleInSingleQuoted(contentNodes: CstNode[] | undefined) {
    if (!contentNodes) return;
    for (const cn of contentNodes) {
      const ch: any = (cn as any).children || {};
      const qs: IToken[] = ch.QuotedString || [];
      for (const q of qs) {
        const s = q.image || '';
        if (s.startsWith("'") && s.endsWith("'") && s.includes('"')) {
          this.ctx.errors.push({
            line: q.startLine ?? 1,
            column: q.startColumn ?? 1,
            severity: 'error',
            message: 'Double quotes inside a single-quoted label are not supported by Mermaid. Replace inner " with &quot; or use a double-quoted label with &quot;.',
            code: 'FL-LABEL-DOUBLE-IN-SINGLE',
            hint: 'Change to "She said &quot;Hello&quot;" or replace inner " with &quot;.'
          });
        }
      }
    }
  }

  nodeShape(ctx: any) {
    // Determine shape and collect the corresponding content node array key
    const openTok: IToken | undefined =
      (ctx.SquareOpen && ctx.SquareOpen[0]) ||
      (ctx.DoubleSquareOpen && ctx.DoubleSquareOpen[0]) ||
      (ctx.RoundOpen && ctx.RoundOpen[0]) ||
      (ctx.DoubleRoundOpen && ctx.DoubleRoundOpen[0]) ||
      (ctx.DiamondOpen && ctx.DiamondOpen[0]) ||
      (ctx.HexagonOpen && ctx.HexagonOpen[0]) ||
      (ctx.StadiumOpen && ctx.StadiumOpen[0]) ||
      (ctx.CylinderOpen && ctx.CylinderOpen[0]);

    // Gather any of nodeContentX properties
    const contentNodes: CstNode[] = [];
    for (const key of Object.keys(ctx)) {
      if (key.startsWith('nodeContent')) {
        const arr = (ctx as any)[key];
        if (Array.isArray(arr)) contentNodes.push(...arr);
      }
    }

    if (openTok) {
      this.checkEmptyContent(openTok, contentNodes.length ? contentNodes : undefined);
      this.checkEscapedQuotes(contentNodes);
      this.checkDoubleInSingleQuoted(contentNodes);
    }
  }
}

export function analyzeFlowchart(cst: CstNode, _tokens: IToken[]): ValidationError[] {
  const ctx: Ctx = { errors: [] };
  const v = new FlowSemanticsVisitor(ctx);
  v.visit(cst);
  return ctx.errors;
}
