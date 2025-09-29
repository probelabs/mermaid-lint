import type { ValidationError } from '../../core/types.js';
import { tokenize, InvalidArrow } from './lexer.js';
import { parse } from './parser.js';
import { analyzeFlowchart } from './semantics.js';
import type { IToken } from 'chevrotain';
import { lintWithChevrotain } from '../../core/pipeline.js';
import { coercePos, mapFlowchartParserError } from '../../core/diagnostics.js';

export function validateFlowchart(text: string): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: (cst, tokens) => analyzeFlowchart(cst as any, tokens as IToken[]),
    mapParserError: (e, t) => mapFlowchartParserError(e, t),
    postLex: (_text, tokens) => {
      const errs: ValidationError[] = [];
      for (const token of tokens as IToken[]) {
        if (token.tokenType === InvalidArrow) {
          errs.push({
            line: token.startLine ?? 1,
            column: token.startColumn ?? 1,
            message: 'Invalid arrow syntax: -> (use --> instead)',
            severity: 'error',
            code: 'FL-ARROW-INVALID',
            hint: 'Replace -> with -->, or use -- text --> for inline labels.',
            length: (token.image?.length ?? 2)
          });
        }
      }
      return errs;
    },
    postParse: (_text, tokens, _cst, prevErrors) => {
      // Token-level fallback: detect backslash-escaped quotes if not already reported
      if (prevErrors.some(e => e.code === 'FL-LABEL-ESCAPED-QUOTE')) return [];
      for (const tok of tokens as IToken[]) {
        if (typeof tok.image === 'string' && tok.image.includes('\\"')) {
          const idx = tok.image.indexOf('\\"');
          const col = (tok.startColumn ?? 1) + Math.max(0, idx);
          const { line, column } = coercePos(tok.startLine ?? null, col, 1, 1);
          return [{
            line, column, severity: 'error', code: 'FL-LABEL-ESCAPED-QUOTE',
            message: 'Escaped quotes (\\") in node labels are not supported by Mermaid. Use &quot; instead.',
            hint: 'Prefer "He said &quot;Hi&quot;".',
            length: 2
          }];
        }
      }
      return [];
    }
  });
}
