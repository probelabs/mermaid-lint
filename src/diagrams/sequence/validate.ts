import type { ValidationError, ValidateOptions } from '../../core/types.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyzeSequence } from './semantics.js';
import { mapSequenceParserError } from '../../core/diagnostics.js';
import { lintWithChevrotain } from '../../core/pipeline.js';

export function validateSequence(text: string, _options: ValidateOptions = {}): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: (cst, tokens) => analyzeSequence(cst as any, tokens),
    mapParserError: (e, t) => mapSequenceParserError(e, t),
  });
}
