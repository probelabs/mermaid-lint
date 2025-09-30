import type { ValidationError, ValidateOptions } from '../../core/types.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyzePie } from './semantics.js';
import { lintWithChevrotain } from '../../core/pipeline.js';
import type { IToken } from 'chevrotain';
import { detectEscapedQuotes, detectDoubleInDouble, detectUnclosedQuotesInText } from '../../core/quoteHygiene.js';
import { mapPieParserError } from '../../core/diagnostics.js';

export function validatePie(text: string, _options: ValidateOptions = {}): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: (cst, tokens) => analyzePie(cst as any, tokens),
    mapParserError: (e, t) => mapPieParserError(e, t),
    postLex: (text, tokens) => {
      const out = [] as ValidationError[];
      // File-level unclosed quote fallback — helps when parser can’t reach sliceStmt cleanly
      out.push(...detectUnclosedQuotesInText(text, {
        code: 'PI-QUOTE-UNCLOSED',
        message: 'Unclosed quote in slice label.',
        hint: 'Close the quote: "Dogs" : 10',
        limitPerFile: 1
      }));
      // Detect double-in-double only on lines that do NOT contain escaped quotes
      const tokList = tokens as IToken[];
      const escapedLines = new Set<number>();
      for (const tk of tokList) {
        if (typeof tk.image === 'string' && tk.image.includes('\\"')) {
          escapedLines.add(tk.startLine ?? 1);
        }
      }
      const dbl = detectDoubleInDouble(tokList, {
        code: 'PI-LABEL-DOUBLE-IN-DOUBLE',
        message: 'Double quotes inside a double-quoted slice label are not supported. Use &quot; for inner quotes.',
        hint: 'Example: "He said &quot;Hi&quot;" : 1',
        scopeEndTokenNames: ['Colon']
      }).filter(e => !escapedLines.has(e.line));
      out.push(...dbl);
      return out;
    }
  });
}
