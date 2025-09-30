import type { ILexingError, IRecognitionException, IToken } from 'chevrotain';
import type { ValidationError } from './types.js';
import { fromLexerError } from './diagnostics.js';

export interface LintAdapters {
  tokenize: (text: string) => { tokens: IToken[]; errors: ILexingError[] };
  parse: (tokens: IToken[]) => { cst: any; errors: IRecognitionException[] };
  analyze: (cst: any, tokens: IToken[]) => ValidationError[];
  mapParserError: (err: IRecognitionException, text: string) => ValidationError;
  postLex?: (text: string, tokens: IToken[]) => ValidationError[];
  postParse?: (text: string, tokens: IToken[], cst: any, prevErrors: ValidationError[]) => ValidationError[];
}

export function lintWithChevrotain(text: string, adapters: LintAdapters): ValidationError[] {
  const errors: ValidationError[] = [];

  // Lexing
  const lex = adapters.tokenize(text);
  if (lex.errors.length > 0) {
    errors.push(...lex.errors.map(fromLexerError));
  }

  // Diagram-specific token checks
  if (adapters.postLex) {
    try { errors.push(...(adapters.postLex(text, lex.tokens) || [])); } catch {}
  }

  // Parsing (only if no fatal lexer errors)
  let cst: any | null = null;
  if (lex.errors.length === 0) {
    const parseRes = adapters.parse(lex.tokens);
    cst = parseRes.cst;
    if (parseRes.errors.length > 0) {
      errors.push(...parseRes.errors.map((e) => adapters.mapParserError(e, text)));
    }
  }

  // Semantics
  if (cst) {
    try { errors.push(...(adapters.analyze(cst, lex.tokens) || [])); } catch (e) {
      errors.push({ line: 1, column: 1, severity: 'error', message: `Internal semantic analysis error: ${(e as Error).message}` });
    }
  }

  // Post-parse hooks: run even when parsing errored (cst may be null) so we can add
  // cross-line diagnostics based on tokens and already-mapped parser errors.
  if (adapters.postParse) {
    try { errors.push(...(adapters.postParse(text, lex.tokens, cst, errors) || [])); } catch {}
  }

  return errors;
}
