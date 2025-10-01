import type { ValidationError, ValidateOptions } from '../../core/types.js';
import { lintWithChevrotain } from '../../core/pipeline.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyzeClass } from './semantics.js';
import { mapClassParserError } from '../../core/diagnostics.js';

export function validateClass(text: string, _options: ValidateOptions = {}): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: analyzeClass,
    mapParserError: mapClassParserError,
    postParse: (src, _tokens, _cst, prev) => {
      const errors: ValidationError[] = [];
      const has = (code: string, line: number) => (prev || []).some(e => e.code === code && e.line === line && e.severity === 'error') || errors.some(e => e.code === code && e.line === line);
      const lines = src.split(/\r?\n/);
      const classDeclOpen: number[] = [];
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i] || '';
        const ln = i + 1;
        if (/^\s*class\b.*\{\s*$/.test(raw)) classDeclOpen.push(ln);
        // Detect wrong relation operator '->' between tokens on the same line
        const mArrow = /(^|[^-])->(?!>)/.exec(raw);
        if (mArrow && !has('CL-REL-INVALID', ln)) {
          const arrowIdx = mArrow.index + (mArrow[1] ? mArrow[1].length : 0);
          const left = raw.slice(0, arrowIdx).trimEnd();
          const right = raw.slice(arrowIdx + 2).trimStart();
          if (left.length > 0 && right.length > 0) {
            const col = arrowIdx + 1;
            errors.push({ line: ln, column: col, severity: 'error', code: 'CL-REL-INVALID', message: "Invalid relationship operator '->'. Use <|--, *--, o--, --, ..> or ..|>.", hint: 'Example: Foo <|-- Bar', length: 2 });
          }
        }
        // Detect missing target before ':' after a valid relation operator
        const opMatch = raw.match(/(<\|--|\*--|o--|\.\.\|>|\.\.>|--)/);
        if (opMatch && !has('CL-REL-MALFORMED', ln)) {
          const after = raw.slice((opMatch.index ?? 0) + opMatch[0].length);
          const colonPos = after.indexOf(':');
          if (colonPos >= 0) {
            const between = after.slice(0, colonPos);
            if (!/\w/.test(between)) {
              const col = (opMatch.index ?? 0) + opMatch[0].length + colonPos + 1;
              errors.push({ line: ln, column: col, severity: 'error', code: 'CL-REL-MALFORMED', message: 'Malformed relationship. Provide a target class before the label.', hint: 'Use: A <|-- B : label', length: 1 });
            }
          }
        }
      }
      // Unclosed class blocks (best-effort): any opener without a later closing brace
      if (classDeclOpen.length > 0) {
        const hasClose = lines.some(l => /\}/.test(l));
        if (!hasClose && !has('CL-BLOCK-MISSING-RBRACE', Math.max(1, lines.length))) {
          const last = classDeclOpen[classDeclOpen.length - 1];
          errors.push({ line: Math.max(1, lines.length), column: 1, severity: 'error', code: 'CL-BLOCK-MISSING-RBRACE', message: "Missing '}' to close class block.", hint: "Close the block: class Foo { ... }" });
        }
      }
      return errors;
    }
  });
}
