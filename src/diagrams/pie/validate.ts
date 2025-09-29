import type { ValidationError } from '../../core/types.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyzePie } from './semantics.js';
import type { ILexingError, IRecognitionException } from 'chevrotain';

export function validatePie(text: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lexResult = tokenize(text);

  // Lexer errors
  if (lexResult.errors.length > 0) {
    lexResult.errors.forEach((error: ILexingError) => {
      errors.push({
        line: error.line ?? 1,
        column: error.column ?? 1,
        message: error.message,
        severity: 'error',
      });
    });
  }

  if (errors.filter((e) => e.severity === 'error').length === 0) {
    const parseResult = parse(lexResult.tokens);
    if (parseResult.errors.length > 0) {
      parseResult.errors.forEach((error: IRecognitionException) => {
        const token = error.token;
        errors.push({
          line: token?.startLine ?? 1,
          column: token?.startColumn ?? 1,
          message: error.message || 'Parser error',
          severity: 'error',
        });
      });
    }
    // Minimal semantic pass (currently no additional rules to keep mermaid parity)
    try {
      const semanticErrors = analyzePie(parseResult.cst as any, lexResult.tokens);
      errors.push(...semanticErrors);
    } catch (e) {
      errors.push({
        line: 1,
        column: 1,
        severity: 'error',
        message: `Internal semantic analysis error: ${(e as Error).message}`,
      });
    }
  }

  // Keep semantics minimal; rely on parser structure for now
  return errors;
}
