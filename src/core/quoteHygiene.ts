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

export function detectDoubleInDouble(tokens: IToken[], opts: { code: string; message: string; hint: string }): ValidationError[] {
  const out: ValidationError[] = [];
  const byLine = new Map<number, IToken[]>();
  for (const tk of tokens) {
    const ln = tk.startLine ?? 1;
    if (!byLine.has(ln)) byLine.set(ln, []);
    byLine.get(ln)!.push(tk);
  }
  for (const [ln, arr] of byLine) {
    const quoted = arr.filter(t => t.tokenType?.name === 'QuotedString');
    if (quoted.length >= 2) {
      const second = quoted[1];
      const { line, column } = coercePos(second.startLine ?? null, second.startColumn ?? null, ln, 1);
      out.push({ line, column, severity: 'error', code: opts.code, message: opts.message, hint: opts.hint, length: 1 });
      continue;
    }
    const textWithQuote = arr.find(t => t.tokenType?.name === 'Text' && typeof t.image === 'string' && t.image.includes('"'));
    if (quoted.length >= 1 && textWithQuote) {
      const idx = (textWithQuote.image as string).indexOf('"');
      const col = (textWithQuote.startColumn ?? 1) + (idx >= 0 ? idx : 0);
      const { line, column } = coercePos(textWithQuote.startLine ?? null, col, ln, 1);
      out.push({ line, column, severity: 'error', code: opts.code, message: opts.message, hint: opts.hint, length: 1 });
    }
  }
  return out;
}
