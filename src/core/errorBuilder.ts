import type { IToken } from 'chevrotain';
import type { ValidationError } from './types.js';
import { coercePos } from './diagnostics.js';

type Common = {
  code?: string;
  hint?: string;
  length?: number;
};

export function errorAt(line: number | null | undefined, column: number | null | undefined, message: string, extra: Common = {}): ValidationError {
  const pos = coercePos(line ?? null, column ?? null, 1, 1);
  return { line: pos.line, column: pos.column, message, severity: 'error', ...extra };
}

export function errorAtToken(tok: IToken | undefined | null, message: string, extra: Common = {}): ValidationError {
  return errorAt(tok?.startLine, tok?.startColumn, message, extra);
}

export function warningAt(line: number | null | undefined, column: number | null | undefined, message: string, extra: Omit<Common, 'code'> & { code?: string } = {}): ValidationError {
  const pos = coercePos(line ?? null, column ?? null, 1, 1);
  return { line: pos.line, column: pos.column, message, severity: 'warning', ...extra } as ValidationError;
}

