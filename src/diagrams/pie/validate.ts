import type { ValidationError, ValidateOptions } from '../../core/types.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyzePie } from './semantics.js';
import { lintWithChevrotain } from '../../core/pipeline.js';
import type { IToken } from 'chevrotain';
import { detectEscapedQuotes } from '../../core/quoteHygiene.js';
import { mapPieParserError } from '../../core/diagnostics.js';

export function validatePie(text: string, _options: ValidateOptions = {}): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: (cst, tokens) => analyzePie(cst as any, tokens),
    mapParserError: (e, t) => mapPieParserError(e, t),
    postLex: (_text, tokens) => {
      const out = detectEscapedQuotes(tokens as IToken[], {
        code: 'PI-LABEL-ESCAPED-QUOTE',
        message: 'Escaped quotes (\\") in slice labels are not supported by Mermaid. Use &quot; instead.',
        hint: 'Example: "He said &quot;Hi&quot;" : 1'
      });
      // Heuristic for double quotes inside a double-quoted label: same line has a QuotedString and Text containing '"'
      const toks = tokens as IToken[];
      const byLine = new Map<number, IToken[]>();
      for (const tk of toks) {
        const ln = tk.startLine ?? 1;
        if (!byLine.has(ln)) byLine.set(ln, []);
        byLine.get(ln)!.push(tk);
      }
      for (const [ln, arr] of byLine) {
        const hasQ = arr.some(t => (t as IToken).tokenType?.name === 'QuotedString');
        const txtWithQuote = arr.find(t => (t as IToken).tokenType?.name === 'Text' && typeof t.image === 'string' && t.image.includes('"')) as IToken | undefined;
        const hasColon = arr.some(t => (t as IToken).tokenType?.name === 'Colon');
        if (hasQ && txtWithQuote && hasColon) {
          out.push({
            line: ln,
            column: (txtWithQuote.startColumn ?? 1) + (txtWithQuote.image?.indexOf('"') ?? 0),
            severity: 'error',
            code: 'PI-LABEL-DOUBLE-IN-DOUBLE',
            message: 'Double quotes inside a double-quoted slice label are not supported. Use &quot; for inner quotes.',
            hint: 'Example: "He said &quot;Hi&quot;" : 1',
            length: 1
          });
          break;
        }
      }
      return out;
    }
  });
}
