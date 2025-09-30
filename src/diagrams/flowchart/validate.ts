import type { ValidationError, ValidateOptions } from '../../core/types.js';
import { tokenize, InvalidArrow } from './lexer.js';
import { parse } from './parser.js';
import { analyzeFlowchart } from './semantics.js';
import type { IToken } from 'chevrotain';
import { lintWithChevrotain } from '../../core/pipeline.js';
import { coercePos, mapFlowchartParserError } from '../../core/diagnostics.js';
import { detectDoubleInDouble, detectUnclosedQuotesInText } from '../../core/quoteHygiene.js';
import { detectEscapedQuotes } from '../../core/quoteHygiene.js';

export function validateFlowchart(text: string, options: ValidateOptions = {}): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: (cst, tokens) => analyzeFlowchart(cst as any, tokens as IToken[], { strict: !!options.strict }),
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
    postParse: (text, tokens, _cst, prevErrors) => {
      if (prevErrors.some(e => e.code === 'FL-LABEL-ESCAPED-QUOTE')) return [];
      const errs = detectEscapedQuotes(tokens as IToken[], {
        code: 'FL-LABEL-ESCAPED-QUOTE',
        message: 'Escaped quotes (\\") in node labels are not supported by Mermaid. Use &quot; instead.',
        hint: 'Prefer "He said &quot;Hi&quot;".'
      }).concat(
        prevErrors.some(e => e.code === 'FL-LABEL-DOUBLE-IN-DOUBLE') ? [] : detectDoubleInDouble(tokens as IToken[], {
          code: 'FL-LABEL-DOUBLE-IN-DOUBLE',
          message: 'Double quotes inside a double-quoted label are not supported. Use &quot; for inner quotes.',
          hint: 'Example: A["He said &quot;Hi&quot;"]',
          scopeEndTokenNames: [
            'SquareClose','RoundClose','DiamondClose','DoubleSquareClose','DoubleRoundClose','StadiumClose','CylinderClose','HexagonClose'
          ]
        })
      );
      // File-level unclosed quote detection: only if overall quote count is odd (Mermaid treats
      // per-line mismatches as OK as long as the file balances quotes overall).
      const dblEsc = (text.match(/\\\"/g) || []).length;
      const dq = (text.match(/\"/g) || []).length - dblEsc;
      const sq = (text.match(/'/g) || []).length;
      if ((dq % 2 === 1) || (sq % 2 === 1)) {
        errs.push(...detectUnclosedQuotesInText(text, {
          code: 'FL-QUOTE-UNCLOSED',
          message: 'Unclosed quote in node label.',
          hint: 'Close the quote: A["Label"]',
          limitPerFile: 1
        }));
      }
      return errs;
    }
  });
}
