import type { ValidationError } from './types.js';

export type OutputFormat = 'text' | 'json';

export function groupErrors(errors: ValidationError[]) {
  const errs = errors.filter(e => e.severity === 'error');
  const warns = errors.filter(e => e.severity === 'warning');
  return { errs, warns };
}

export function textReport(filename: string, content: string, errors: ValidationError[]): string {
  const { errs, warns } = groupErrors(errors);
  // Suppress generic parser errors when a specific coded error exists at the same spot.
  const filteredErrs: ValidationError[] = [];
  for (const e of errs) {
    if (!e.code) {
      const nearby = errs.find(o => o !== e && !!o.code && o.line === e.line && Math.abs((o.column || 1) - (e.column || 1)) <= 2);
      if (nearby) continue;
    }
    filteredErrs.push(e);
  }
  const lines: string[] = [];
  const printBlock = (kind: 'error' | 'warning', e: ValidationError) => {
    const kindColor = kind === 'error' ? '\x1b[31merror\x1b[0m' : '\x1b[33mwarning\x1b[0m';
    const code = e.code ? `[${e.code}]` : '';
    lines.push(`${kindColor}${code ? code : ''}: ${e.message}`);
    lines.push(`at ${filename}:${e.line}:${e.column}`);
    const allLines = content.split(/\r?\n/);
    const total = allLines.length;
    const numWidth = String(total).length;
    const fmtNum = (n: number) => String(n).padStart(numWidth, ' ');
    const idx = Math.max(0, Math.min(allLines.length - 1, e.line - 1));
    const prev = idx > 0 ? allLines[idx - 1] : undefined;
    const text = allLines[idx] ?? '';
    const next = idx + 1 < allLines.length ? allLines[idx + 1] : undefined;

    // Special snippets for structural insertions: show header context and explicit insertion line
    if (e.code === 'SE-BLOCK-MISSING-END' || e.code === 'SE-ELSE-IN-CRITICAL' || e.code === 'CL-BLOCK-MISSING-RBRACE' || e.code === 'ST-BLOCK-MISSING-RBRACE') {
      // Find nearest block header upwards
      const headerRe = e.code?.startsWith('CL-')
        ? /^(?:\s*)class\b.*\{\s*$/i
        : e.code?.startsWith('ST-')
          ? /^(?:\s*)state\b.*\{\s*$/i
          : /^(?:\s*)(alt|opt|loop|par|rect|critical|break|box)\b/i;
      let headerIdx = -1;
      for (let i = idx; i >= 0 && i >= idx - 100; i--) {
        if (headerRe.test(allLines[i] ?? '')) { headerIdx = i; break; }
      }
      let blockName = e.code?.startsWith('CL-') ? 'class' : (e.code?.startsWith('ST-') ? 'state' : 'block');
      if (!e.code?.startsWith('CL-') && !e.code?.startsWith('ST-')) {
        const m1 = /Missing 'end' to close a '([^']+)' block\./.exec(e.message || '');
        if (m1 && m1[1]) blockName = m1[1];
        const m2 = /inside a '([^']+)' block/.exec(e.message || '');
        if (m2 && m2[1]) blockName = m2[1];
      }
      if (headerIdx >= 0) {
        const headerNo = headerIdx + 1;
        lines.push(`  ${fmtNum(headerNo)} | ${allLines[headerIdx]}  \x1b[2m\u2190 start of '${blockName}'\x1b[0m`);
        if (headerIdx < idx - 1) {
          lines.push(`  ${' '.repeat(numWidth)} | \u2026`);
        }
      } else if (typeof prev === 'string') {
        const prevNo = idx; // previous line number
        lines.push(`  ${fmtNum(prevNo)} | ${prev}`);
      }
      const lineNo = idx + 1;
      lines.push(`  ${fmtNum(lineNo)} | ${text}`);
      // For both cases, show explicit suggested insertion line.
      let nextContentIdx = -1;
      for (let i = idx + 1; i < allLines.length; i++) {
        if ((allLines[i] ?? '').trim() !== '') { nextContentIdx = i; break; }
      }
      const insertionLine = (nextContentIdx >= 0) ? (nextContentIdx + 1) : (lineNo + 1);
      const indent = (text.match(/^\s*/)?.[0] ?? '');
      const insertToken = e.code?.startsWith('CL-') || e.code === 'ST-BLOCK-MISSING-RBRACE' ? '}' : 'end';
      lines.push(`  ${fmtNum(insertionLine)} | ${indent}${insertToken}  \x1b[2m\u2190 insert '${insertToken}' here\x1b[0m`);
      // Skip printing next to keep the snippet tight and focused
    } else {
      if (typeof prev === 'string') lines.push(`  ${fmtNum(e.line - 1)} | ${prev}`);
      lines.push(`  ${fmtNum(e.line)} | ${text}`);
      const caretPad = ' '.repeat(Math.max(0, e.column - 1));
      const caretLen = Math.max(1, e.length ?? 1);
      lines.push(`  ${' '.repeat(numWidth)} | ${caretPad}\x1b[31m${'^'.repeat(caretLen)}\x1b[0m`);
      if (typeof next === 'string') lines.push(`  ${fmtNum(e.line + 1)} | ${next}`);
    }
    if (e.hint) {
      const hintLines = String(e.hint).split(/\r?\n/);
      if (hintLines.length === 1) {
        lines.push(`hint: ${hintLines[0]}`);
      } else {
        // Print first line after 'hint:', then indent subsequent lines
        lines.push(`hint: ${hintLines[0]}`);
        for (let i = 1; i < hintLines.length; i++) {
          lines.push(`  ${hintLines[i]}`);
        }
      }
    }
    lines.push('');
  };

  for (const e of filteredErrs) printBlock('error', e);
  for (const w of warns) printBlock('warning', w);
  if (filteredErrs.length === 0 && warns.length === 0) return 'Valid';
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

// Single text format for humans; JSON is intended for tooling.
