import type { ValidationError } from '../../core/types.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyzePie } from './semantics.js';
import { lintWithChevrotain } from '../../core/pipeline.js';
import { mapPieParserError } from '../../core/diagnostics.js';

export function validatePie(text: string): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: (cst, tokens) => analyzePie(cst as any, tokens),
    mapParserError: (e, t) => mapPieParserError(e, t),
  });
}
