import type { ValidationError } from '../../core/types.js';
import { tokenize, InvalidArrow } from './lexer.js';
import { parse } from './parser.js';
import { analyzeFlowchart } from './semantics.js';
import type { ILexingError, IRecognitionException, IToken } from 'chevrotain';

export function validateFlowchart(text: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = text.split('\n');

  // Tokenize
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

  // Invalid arrow check (flowchart-specific)
  lexResult.tokens.forEach((token: IToken) => {
    if (token.tokenType === InvalidArrow) {
      errors.push({
        line: token.startLine ?? 1,
        column: token.startColumn ?? 1,
        message: 'Invalid arrow syntax: -> (use --> instead)',
        severity: 'error',
        code: 'FL-ARROW-INVALID',
        hint: 'Replace -> with -->, or use -- text --> for inline labels.'
      });
    }
  });

  // Parse if no critical lexer errors
  let parseResult: { cst: any; errors: any[] } | null = null;
  if (errors.filter((e) => e.severity === 'error').length === 0) {
    parseResult = parse(lexResult.tokens);

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
  }

  // Semantic pass: CST visitor for confident checks (no regex)
  if (parseResult) {
    try {
      const semanticErrors = analyzeFlowchart(parseResult.cst as any, lexResult.tokens);
      errors.push(...semanticErrors);
    } catch (e) {
      // Defensive: never crash; surface a single error if semantic pass fails
      errors.push({
        line: 1,
        column: 1,
        severity: 'error',
        message: `Internal semantic analysis error: ${(e as Error).message}`,
      });
    }
  }

  // Link best-practice checks are token-aware and handled in the CST visitor when needed.

  return errors;
}
