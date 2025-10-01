import type { ValidationError, ValidateOptions } from '../../core/types.js';
import { lintWithChevrotain } from '../../core/pipeline.js';
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { analyzeClass } from './semantics.js';
import { mapClassParserError } from '../../core/diagnostics.js';
import type { IToken } from 'chevrotain';
import * as t from './lexer.js';

export function validateClass(text: string, _options: ValidateOptions = {}): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: analyzeClass,
    mapParserError: mapClassParserError,
    postLex: (_text, tokens) => {
      const errs: ValidationError[] = [];
      const tokList = tokens as IToken[];
      // CL-NAME-DOUBLE-QUOTED: class followed by QuotedString
      for (let i = 0; i < tokList.length - 1; i++) {
        const a = tokList[i], b = tokList[i + 1];
        if (a.tokenType === t.ClassKw && b.tokenType === t.QuotedString) {
          errs.push({
            line: b.startLine ?? 1,
            column: b.startColumn ?? 1,
            severity: 'error',
            code: 'CL-NAME-DOUBLE-QUOTED',
            message: 'Double-quoted class name is not supported. Use backticks for names with spaces/punctuation, or use a label.',
            hint: 'Example: class `Logger "core"` as L  or  class L["Logger \"core\""]',
            length: (b.image?.length ?? 1)
          });
        }
      }
      // CL-REL-INVALID via InvalidRelArrow token
      for (const tk of tokList) {
        if (tk.tokenType === t.InvalidRelArrow) {
          errs.push({
            line: tk.startLine ?? 1,
            column: tk.startColumn ?? 1,
            severity: 'error',
            code: 'CL-REL-INVALID',
            message: "Invalid relationship operator '->'. Use <|--, *--, o--, --, ..> or ..|>.",
            hint: 'Example: Foo <|-- Bar',
            length: (tk.image?.length ?? 2)
          });
        }
      }
      // CL-REL-MALFORMED: relation operator followed by ':' before any Identifier/QuotedString
      for (let i = 0; i < tokList.length; i++) {
        const tk = tokList[i];
        const isRel = tk.tokenType === t.RelExtends || tk.tokenType === t.RelComposition || tk.tokenType === t.RelAggregation || tk.tokenType === t.RelDependency || tk.tokenType === t.RelRealization || tk.tokenType === t.RelAssociation;
        if (!isRel) continue;
        const line = tk.startLine ?? -1;
        let j = i + 1;
        let sawColon: IToken | null = null;
        let sawName = false;
        while (j < tokList.length) {
          const nx = tokList[j];
          if ((nx.startLine ?? -1) !== line) break;
          if (nx.tokenType === t.Identifier || nx.tokenType === t.QuotedString) { sawName = true; break; }
          if (nx.tokenType === t.Colon) { sawColon = nx; break; }
          j++;
        }
        if (sawColon && !sawName) {
          errs.push({
            line,
            column: sawColon.startColumn ?? 1,
            severity: 'error',
            code: 'CL-REL-MALFORMED',
            message: 'Malformed relationship. Provide a target class before the label.',
            hint: 'Use: A <|-- B : label',
            length: (sawColon.image?.length ?? 1)
          });
        }
      }
      return errs;
    },
    postParse: (src, _tokens, _cst, prev) => {
      const errors: ValidationError[] = [];
      const has = (code: string, line: number) => (prev || []).some(e => e.code === code && e.line === line && e.severity === 'error');
      const lines = src.split(/\r?\n/);
      const classDeclOpen: number[] = [];
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i] || '';
        if (/^\s*class\b.*\{\s*$/.test(raw)) classDeclOpen.push(i + 1);
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
