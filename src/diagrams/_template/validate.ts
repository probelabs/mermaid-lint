import type { ValidationError } from '../../core/types.js';
import { lintWithChevrotain } from '../../core/pipeline.js';

// Placeholder imports – replace with your diagram's modules
// import { tokenize } from './lexer.js';
// import { parse } from './parser.js';
// import { analyze } from './semantics.js';
// import { mapParserError } from './map-errors.js';

export function validateTemplateDiagram(_text: string): ValidationError[] {
  // Example wiring – uncomment and adapt when implementing a new diagram:
  // return lintWithChevrotain(text, {
  //   tokenize,
  //   parse,
  //   analyze,
  //   mapParserError,
  //   postLex: (text, tokens) => [],
  //   postParse: (text, tokens, cst, prev) => [],
  // });
  return [];
}

