import type { ValidationError, ValidateOptions } from '../../core/types.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyzeSequence } from './semantics.js';
import { mapSequenceParserError } from '../../core/diagnostics.js';
import { lintWithChevrotain } from '../../core/pipeline.js';
import type { IToken } from 'chevrotain';
import * as t from './lexer.js';

export function validateSequence(text: string, _options: ValidateOptions = {}): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: (cst, tokens) => analyzeSequence(cst as any, tokens),
    mapParserError: (e, t) => mapSequenceParserError(e, t),
    postParse: (_text, tokens, _cst, prevErrors) => {
      const warnings: ValidationError[] = [];
      const tokenList = tokens as IToken[];
      const hasPar = tokenList.some(x => x.tokenType === t.ParKeyword);
      const hasAnd = tokenList.some(x => x.tokenType === t.AndKeyword);
      const hasAlt = tokenList.some(x => x.tokenType === t.AltKeyword);
      const hasElse = tokenList.some(x => x.tokenType === t.ElseKeyword);

      // Only add these hints if there were parse errors (to avoid noisy hints on valid files)
      const hadErrors = prevErrors.some(e => e.severity === 'error');
      if (hadErrors) {
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
