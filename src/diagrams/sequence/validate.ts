import type { ValidationError, ValidateOptions } from '../../core/types.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyzeSequence } from './semantics.js';
import { mapSequenceParserError } from '../../core/diagnostics.js';
import { lintWithChevrotain } from '../../core/pipeline.js';
import type { IToken } from 'chevrotain';
import * as t from './lexer.js';
import { detectEscapedQuotes, detectDoubleInDouble, detectUnclosedQuotesInText } from '../../core/quoteHygiene.js';

export function validateSequence(text: string, _options: ValidateOptions = {}): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: (cst, tokens) => analyzeSequence(cst as any, tokens),
    mapParserError: (e, t) => mapSequenceParserError(e, t),
    postLex: (_text, tokens) => {
      const tokList = tokens as IToken[];
      // Global: escaped quotes detection (pre-parse so it always triggers even on parse failures)
      const errs = detectEscapedQuotes(tokList, {
        code: 'SE-LABEL-ESCAPED-QUOTE',
        message: 'Escaped quotes (\\") in names or labels are not supported by Mermaid. Use &quot; instead.',
        hint: 'Example: participant "Logger &quot;debug&quot;" as L'
      });
      // Heuristic for double quotes inside double-quoted names/labels on a single line
      const byLine = new Map<number, IToken[]>();
      for (const tk of tokList) {
        const ln = tk.startLine ?? 1;
        if (!byLine.has(ln)) byLine.set(ln, []);
        byLine.get(ln)!.push(tk);
      }
      const escapedLines = new Set(errs.map(e => e.line));
      const dbl = detectDoubleInDouble(tokList, {
          code: 'SE-LABEL-DOUBLE-IN-DOUBLE',
          message: 'Double quotes inside a double-quoted name/label are not supported. Use &quot; for inner quotes.',
          hint: 'Example: participant "Logger &quot;debug&quot;" as L',
          scopeEndTokenNames: ['Newline']
        }).filter(e => !escapedLines.has(e.line));
      errs.push(...dbl);
      return errs;
    },
    postParse: (text, tokens, _cst, prevErrors) => {
      const warnings: ValidationError[] = [];
      const tokenList = tokens as IToken[];
      const hasPar = tokenList.some(x => x.tokenType === t.ParKeyword);
      const hasAnd = tokenList.some(x => x.tokenType === t.AndKeyword);
      const hasAlt = tokenList.some(x => x.tokenType === t.AltKeyword);
      const hasElse = tokenList.some(x => x.tokenType === t.ElseKeyword);

      // Only add these hints if there were parse errors (to avoid noisy hints on valid files)
      const hadErrors = prevErrors.some(e => e.severity === 'error');
      if (hadErrors) {
        // Shared: unclosed quotes detection (fallback)
        if (!prevErrors.some(e => e.code === 'SE-QUOTE-UNCLOSED')) {
          const unc = detectUnclosedQuotesInText(text, {
            code: 'SE-QUOTE-UNCLOSED',
            message: 'Unclosed quote in participant/actor name.',
            hint: 'Close the quote: participant "Bob"  or  participant Alice as "Alias"',
            limitPerFile: 1
          });
          if (unc.length) warnings.push(...unc);
        }
        const hasAndOutsideParErr = prevErrors.some(e => e.code === 'SE-AND-OUTSIDE-PAR');
        const hasElseOutsideAltErr = prevErrors.some(e => e.code === 'SE-ELSE-OUTSIDE-ALT');

        if (hasAnd && !hasPar && !hasAndOutsideParErr) {
          const first = tokenList.find(x => x.tokenType === t.AndKeyword)!;
          warnings.push({
            line: first.startLine ?? 1,
            column: first.startColumn ?? 1,
            severity: 'warning',
            code: 'SE-HINT-PAR-BLOCK-SUGGEST',
            message: "Found 'and' but no 'par' block in the file.",
            hint: "Start a parallel section with: par … and … end",
            length: (first.image?.length ?? 3)
          });
        }
        if (hasElse && !hasAlt && !hasElseOutsideAltErr) {
          const first = tokenList.find(x => x.tokenType === t.ElseKeyword)!;
          warnings.push({
            line: first.startLine ?? 1,
            column: first.startColumn ?? 1,
            severity: 'warning',
            code: 'SE-HINT-ALT-BLOCK-SUGGEST',
            message: "Found 'else' but no 'alt' block in the file.",
            hint: "Use: alt Condition … else … end",
            length: (first.image?.length ?? 4)
          });
        }
      }
      return warnings;
    }
  });
}
