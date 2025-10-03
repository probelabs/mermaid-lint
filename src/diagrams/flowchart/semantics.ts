import type { IToken, CstNode } from 'chevrotain';
import { parserInstance } from './parser.js';
import type { ValidationError } from '../../core/types.js';

type Ctx = { errors: ValidationError[]; strict?: boolean };

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
        hint: "Example inside subgraph: 'direction TB'",
        length: (kwTok.image?.length ?? 0)
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
    // typed-shape attr object vs bracket shape conflict
    const hasAttr = Array.isArray((ctx as any).attrObject) && (ctx as any).attrObject.length > 0;
    const hasShape = Array.isArray(ctx.nodeShape) && ctx.nodeShape.length > 0;
    if (hasAttr && hasShape) {
      const tokArr: any[] = (ctx as any).attrObject?.[0]?.children?.attrLCurly || [];
      const tok = tokArr[0];
      this.ctx.errors.push({
        line: tok?.startLine ?? 1,
        column: tok?.startColumn ?? 1,
        severity: 'warning',
        code: 'FL-TYPED-SHAPE-CONFLICT',
        message: "Both bracket shape and '@{ shape: … }' provided. Bracket shape will be used.",
        hint: 'Pick one style: either A[Label] or A@{ shape: rect, label: "Label" }'
      });
    }
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
        message: 'Empty label inside a shape.',
        code: 'FL-NODE-EMPTY',
        hint:
          'Write non-empty text inside the brackets, e.g., A["Start"] or A[Start]. If you want no label, omit the brackets and just use A.'
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
            message: 'Empty label inside a shape (only empty quotes/whitespace).',
            code: 'FL-NODE-EMPTY',
            hint:
              'Provide non-empty text, e.g., A["Start"] or A[Start]. If you want no label, omit the brackets and just use A.'
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
          const innerIdx = s.indexOf('"');
          const col = (q.startColumn ?? 1) + Math.max(0, innerIdx);
          this.ctx.errors.push({
            line: q.startLine ?? 1,
            column: col,
            severity: 'error',
            message: 'Double quotes inside a single-quoted label are not supported by Mermaid. Replace inner " with &quot; or use a double-quoted label with &quot;.',
            code: 'FL-LABEL-DOUBLE-IN-SINGLE',
            hint: 'Change to "She said &quot;Hello&quot;" or replace inner " with &quot;.',
            length: 1
          });
        }
      }
    }
  }

  private checkDoubleInDoubleQuoted(contentNodes: CstNode[] | undefined) {
    if (!contentNodes) return;
    for (const cn of contentNodes) {
      const ch: any = (cn as any).children || {};
      const qs: IToken[] = ch.QuotedString || [];
      if (qs.length >= 2) {
        const q2 = qs[1];
        this.ctx.errors.push({
          line: q2.startLine ?? 1,
          column: q2.startColumn ?? 1,
          severity: 'error',
          code: 'FL-LABEL-DOUBLE-IN-DOUBLE',
          message: 'Double quotes inside a double-quoted label are not supported. Use &quot; for inner quotes.',
          hint: 'Example: A["He said &quot;Hi&quot;"]',
          length: 1
        });
      }
    }
  }

  private warnParensInUnquoted(contentNodes: CstNode[] | undefined) {
    if (!contentNodes) return;
    for (const cn of contentNodes) {
      const ch: any = (cn as any).children || {};
      const hasQuoted: boolean = Array.isArray(ch.QuotedString) && ch.QuotedString.length > 0;
      if (hasQuoted) continue; // wrapped, fine
      const opens: IToken[] = ch.RoundOpen || [];
      const closes: IToken[] = ch.RoundClose || [];
      const offenders = [...opens, ...closes];
      if (offenders.length > 0) {
        const t = offenders[0];
        this.ctx.errors.push({
          line: t.startLine ?? 1,
          column: t.startColumn ?? 1,
          severity: 'warning',
          code: 'FL-LABEL-PARENS-UNQUOTED',
          message: 'Parentheses inside an unquoted label may be ambiguous. Wrap the label in quotes.',
          hint: 'Example: A["Calls func(arg)"]'
        });
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
      // Mermaid accepts backslash-escaped quotes inside labels; do not flag as error.
      this.checkDoubleInSingleQuoted(contentNodes);
      this.warnParensInUnquoted(contentNodes);

      // Strict mode: require quoted labels inside shapes
      if (this.ctx.strict) {
        let quoted = false;
        let firstContentTok: IToken | undefined;
        for (const cn of contentNodes) {
          const ch: any = (cn as any).children || {};
          if ((ch.QuotedString && ch.QuotedString.length) || (ch.MultilineText && ch.MultilineText.length)) {
            quoted = true;
            break;
          }
          // track first token as pointer
          const candidates: IToken[] = ([] as IToken[])
            .concat(ch.Identifier || [])
            .concat(ch.Text || [])
            .concat(ch.NumberLiteral || [])
            .concat(ch.RoundOpen || [])
            .concat(ch.RoundClose || [])
            .concat(ch.Comma || [])
            .concat(ch.Colon || [])
            .concat(ch.Pipe || []);
          if (!firstContentTok && candidates.length) firstContentTok = candidates[0];
        }
        if (contentNodes.length > 0 && !quoted) {
          const p = firstContentTok ?? openTok;
          this.ctx.errors.push({
            line: p.startLine ?? 1,
            column: p.startColumn ?? 1,
            severity: 'error',
            code: 'FL-STRICT-LABEL-QUOTES-REQUIRED',
            message: 'Strict mode: Node label must be quoted (use double quotes and &quot; inside).',
            hint: 'Example: A["Label with &quot;quotes&quot; and (parens)"]'
          });
        }
      }
    }
  }
}

export function analyzeFlowchart(cst: CstNode, _tokens: IToken[], opts?: { strict?: boolean }): ValidationError[] {
  const ctx: Ctx = { errors: [], strict: opts?.strict };
  const v = new FlowSemanticsVisitor(ctx);
  v.visit(cst);
  return ctx.errors;
}
