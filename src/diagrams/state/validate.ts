import type { ValidationError, ValidateOptions } from '../../core/types.js';
import { lintWithChevrotain } from '../../core/pipeline.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyzeState } from './semantics.js';
import { mapStateParserError } from '../../core/diagnostics.js';

export function validateState(text: string, _options: ValidateOptions = {}): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: analyzeState,
    mapParserError: mapStateParserError,
    postParse: (src, _tokens, _cst, prev) => {
      const errors: ValidationError[] = [];
      const has = (code: string, line: number) => (prev || []).some(e => e.code === code && e.line === line && e.severity === 'error') || errors.some(e => e.code === code && e.line === line);
      const lines = src.split(/\r?\n/);
      const stateOpen: number[] = [];
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i] || '';
        const ln = i + 1;
        if (/^\s*state\b.*\{\s*$/.test(raw)) stateOpen.push(ln);
        const mArrow = /(^|[^-])->(?!>)/.exec(raw);
        if (mArrow && !has('ST-ARROW-INVALID', ln)) {
          const arrowIdx = mArrow.index + (mArrow[1] ? mArrow[1].length : 0);
          const left = raw.slice(0, arrowIdx).trimEnd();
          const right = raw.slice(arrowIdx + 2).trimStart();
          if (left.length > 0 && right.length > 0) {
            errors.push({ line: ln, column: arrowIdx + 1, severity: 'error', code: 'ST-ARROW-INVALID', message: "Invalid arrow '->'. Use '-->' in state transitions.", hint: 'Example: A --> B : event', length: 2 });
          }
        }
        // Note missing colon fallback (case-insensitive 'Note')
        if (/^\s*Note\b/i.test(raw) && !/:/.test(raw)) {
          const idx = raw.length - (raw.trimStart().length);
          const afterHeader = raw.replace(/^\s*Note\s+(left|right)\s+of\s+[^:]+/i, '').replace(/^\s*Note\s+over\s+[^:]+/i, '');
          if (afterHeader === raw) {
            // not matched header; skip
          } else {
            const insertCol = raw.indexOf(':');
            if (insertCol === -1) {
              // place caret near end of header
              const m1 = /(Note\s+(left|right)\s+of\s+[^:]+|Note\s+over\s+[^:]+)/i.exec(raw);
              const caret = m1 ? (m1.index + (m1[0]?.length || 0) + 1) : 1;
              if (!has('ST-NOTE-MALFORMED', ln)) errors.push({ line: ln, column: caret, severity: 'error', code: 'ST-NOTE-MALFORMED', message: 'Malformed note: missing colon before note text.', hint: 'Example: Note right of A: message' });
            }
          }
        }
      }
      // Missing closing brace for any state block
      if (stateOpen.length > 0) {
        const hasClose = lines.some(l => /\}/.test(l));
        if (!hasClose && !has('ST-BLOCK-MISSING-RBRACE', Math.max(1, lines.length))) {
          errors.push({ line: Math.max(1, lines.length), column: 1, severity: 'error', code: 'ST-BLOCK-MISSING-RBRACE', message: "Missing '}' to close a state block.", hint: "Close the block: state Foo { ... }" });
        }
      }
      return errors;
    }
  });
}
