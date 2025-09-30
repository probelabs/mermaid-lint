import type { CstNode, IToken } from 'chevrotain';
import type { ValidationError } from '../../core/types.js';

// Minimal placeholder: we can add semantic checks later (e.g., duplicate class names)
export function analyzeClass(_cst: CstNode, _tokens: IToken[]): ValidationError[] {
  return [];
}

