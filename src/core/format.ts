import type { ValidationError } from './types.js';

export type OutputFormat = 'human' | 'json' | 'rust';

export function groupErrors(errors: ValidationError[]) {
  const errs = errors.filter(e => e.severity === 'error');
  const warns = errors.filter(e => e.severity === 'warning');
  return { errs, warns };
}

export function humanReport(filename: string, content: string, errors: ValidationError[]): string {
  const { errs, warns } = groupErrors(errors);
  const lines: string[] = [];
  const printBlock = (kind: 'error' | 'warning', e: ValidationError) => {
    const kindColor = kind === 'error' ? '\x1b[31merror\x1b[0m' : '\x1b[33mwarning\x1b[0m';
    const code = e.code ? `[${e.code}]` : '';
    lines.push(`${kindColor}${code ? code : ''}: ${e.message}`);
    lines.push(`at ${filename}:${e.line}:${e.column}`);
    const allLines = content.split(/\r?\n/);
    const idx = Math.max(0, Math.min(allLines.length - 1, e.line - 1));
    const text = allLines[idx] ?? '';
    lines.push(`  ${text}`);
    const caretPad = ' '.repeat(Math.max(0, e.column - 1));
    const caretLen = Math.max(1, e.length ?? 1);
    lines.push(`  ${caretPad}\x1b[31m${'^'.repeat(caretLen)}\x1b[0m`);
    if (e.hint) lines.push(`hint: ${e.hint}`);
    lines.push('');
  };

  for (const e of errs) printBlock('error', e);
  for (const w of warns) printBlock('warning', w);
  if (errs.length === 0 && warns.length === 0) return 'Valid';
  return lines.join('\n');
}

export function toJsonResult(filename: string, errors: ValidationError[]) {
  const { errs, warns } = groupErrors(errors);
  return {
    file: filename,
    valid: errs.length === 0,
    errorCount: errs.length,
    warningCount: warns.length,
    errors: errs,
    warnings: warns,
  };
}

// Note: there is only one human-friendly format. The previous "rust"-style
// output is removed; --format rust (if provided) is treated as 'human' by the CLI.
