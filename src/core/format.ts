import type { ValidationError } from './types.js';
import { codeFrame } from './diagnostics.js';

export type OutputFormat = 'human' | 'json';

export function groupErrors(errors: ValidationError[]) {
  const errs = errors.filter(e => e.severity === 'error');
  const warns = errors.filter(e => e.severity === 'warning');
  return { errs, warns };
}

export function humanReport(filename: string, content: string, errors: ValidationError[]): string {
  const { errs, warns } = groupErrors(errors);
  const lines: string[] = [];
  if (errs.length > 0) {
    lines.push(`Found ${errs.length} error(s) in ${filename}:\n`);
    for (const error of errs) {
      const code = error.code ? ` [${error.code}]` : '';
      lines.push(`\x1b[31merror\x1b[0m: ${filename}:${error.line}:${error.column}${code} - ${error.message}`);
      if (error.hint) lines.push(`        hint: ${error.hint}`);
      try {
        const frame = codeFrame(content, error.line, error.column, Math.max(1, error.length ?? 1));
        lines.push(frame.split('\n').map(l => '        ' + l).join('\n'));
      } catch {}
    }
  }
  if (warns.length > 0) {
    lines.push(`\nFound ${warns.length} warning(s) in ${filename}:\n`);
    for (const w of warns) {
      const code = w.code ? ` [${w.code}]` : '';
      lines.push(`\x1b[33mwarning\x1b[0m: ${filename}:${w.line}:${w.column}${code} - ${w.message}`);
      if (w.hint) lines.push(`        hint: ${w.hint}`);
      try {
        const frame = codeFrame(content, w.line, w.column, Math.max(1, w.length ?? 1));
        lines.push(frame.split('\n').map(l => '        ' + l).join('\n'));
      } catch {}
    }
  }
  if (errs.length === 0 && warns.length === 0) {
    lines.push('Valid');
  }
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

