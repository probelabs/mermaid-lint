import type { ValidationError, ValidateOptions } from '../../core/types.js';
import { lintWithChevrotain } from '../../core/pipeline.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyzeClass } from './semantics.js';
import { mapClassParserError } from '../../core/diagnostics.js';

export function validateClass(text: string, _options: ValidateOptions = {}): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: analyzeClass,
    mapParserError: mapClassParserError,
  });
}

