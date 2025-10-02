import type { CstNode, IToken } from 'chevrotain';
import { tokenize as pieTokenize } from '../diagrams/pie/lexer.js';
import { parserInstance as pieParser } from '../diagrams/pie/parser.js';
import type { PieChartModel } from './pie-types.js';

function unquote(s: string): string {
  if (!s) return s;
  const first = s.charAt(0);
  const last = s.charAt(s.length - 1);
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    const inner = s.slice(1, -1);
    // normalize escaped quotes into plain characters; renderer may later convert to entities
    return inner.replace(/\\(["'])/g, '$1');
  }
  return s;
}

export interface PieBuildResult {
  model: PieChartModel;
  errors: Array<{ line: number; column: number; message: string; code: string; severity: 'error' | 'warning' }>;
}

export function buildPieModel(text: string): PieBuildResult {
  const errors: PieBuildResult['errors'] = [];

  const lex = pieTokenize(text);
  for (const e of lex.errors) {
    errors.push({
      line: e.line ?? 1,
      column: e.column ?? 1,
      message: e.message,
      code: 'PIE_LEX',
      severity: 'error'
    });
  }

  pieParser.reset();
  pieParser.input = lex.tokens;
  const cst = pieParser.diagram();
  for (const e of pieParser.errors) {
    const t = e.token as IToken | undefined;
    errors.push({
      line: t?.startLine ?? 1,
      column: t?.startColumn ?? 1,
      message: e.message,
      code: 'PIE_PARSE',
      severity: 'error'
    });
  }

  const model: PieChartModel = { title: undefined, showData: false, slices: [] };
  if (!cst || !cst.children) return { model, errors };

  // Inline `showData` in header
  if (cst.children.ShowDataKeyword && cst.children.ShowDataKeyword.length > 0) {
    model.showData = true;
  }

  // Walk statements: titleStmt | sliceStmt
  const statements = (cst.children.statement as CstNode[] | undefined) ?? [];
  for (const st of statements) {
    if (st.children?.titleStmt) {
      const tnode = st.children.titleStmt[0] as CstNode;
      const parts: string[] = [];
      const collect = (k: string) => {
        const arr = (tnode.children?.[k] as IToken[] | undefined) ?? [];
        for (const tok of arr) parts.push(unquote(tok.image));
      };
      collect('QuotedString');
      collect('Text');
      collect('NumberLiteral');
      const title = parts.join(' ').trim();
      if (title) model.title = title;
    } else if (st.children?.sliceStmt) {
      const snode = st.children.sliceStmt[0] as CstNode;
      const labelTok = (snode.children?.sliceLabel?.[0] as CstNode | undefined)?.children?.QuotedString?.[0] as IToken | undefined;
      const numTok = snode.children?.NumberLiteral?.[0] as IToken | undefined;
      if (labelTok && numTok) {
        const label = unquote(labelTok.image).trim();
        const value = Number(numTok.image);
        if (!Number.isNaN(value)) {
          model.slices.push({ label, value });
        }
      }
    }
  }

  return { model, errors };
}
