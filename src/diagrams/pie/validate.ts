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
      const out = detectEscapedQuotes(tokens as IToken[], {
        code: 'PI-LABEL-ESCAPED-QUOTE',
        message: 'Escaped quotes (\\") in slice labels are not supported by Mermaid. Use &quot; instead.',
        hint: 'Example: "He said &quot;Hi&quot;" : 1'
      });
      // Shared: unclosed quote fallback — helps when parser can’t reach sliceStmt cleanly
      out.push(...detectUnclosedQuotesInText(text, {
        code: 'PI-QUOTE-UNCLOSED',
        message: 'Unclosed quote in slice label.',
        hint: 'Close the quote: "Dogs" : 10',
        limitPerFile: 1
      }));
      // Double quotes inside a double-quoted label
      out.push(
        ...detectDoubleInDouble(tokens as IToken[], {
          code: 'PI-LABEL-DOUBLE-IN-DOUBLE',
          message: 'Double quotes inside a double-quoted slice label are not supported. Use &quot; for inner quotes.',
          hint: 'Example: "He said &quot;Hi&quot;" : 1',
          scopeEndTokenNames: ['Colon']
        })
      );
      return out;
    }
  });
}
