import type { IToken } from 'chevrotain';
import type { ValidationError } from './types.js';
import { coercePos } from './diagnostics.js';

export function detectEscapedQuotes(tokens: IToken[], opts: { code: string; message?: string; hint?: string }): ValidationError[] {
  const out: ValidationError[] = [];
  const code = opts.code;
  const message = opts.message || 'Escaped quotes (\\") are not supported by Mermaid. Use &quot; instead.';
  const hint = opts.hint || 'Use &quot; for inner quotes, e.g., "He said &quot;Hi&quot;".';
  for (const tok of tokens) {
    if (typeof tok.image === 'string') {
      const idx = tok.image.indexOf('\\"');
      if (idx !== -1) {
        const col = (tok.startColumn ?? 1) + idx;
        const { line, column } = coercePos(tok.startLine ?? null, col, 1, 1);
        out.push({ line, column, severity: 'error', code, message, hint, length: 2 });
        // Report first occurrence per line to avoid noise
      }
    }
  }
  return out;
}

