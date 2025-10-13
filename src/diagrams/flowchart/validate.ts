import type { ValidationError, ValidateOptions } from '../../core/types.js';
import { tokenize, InvalidArrow } from './lexer.js';
import { parse } from './parser.js';
import { analyzeFlowchart } from './semantics.js';
import type { IToken } from 'chevrotain';
import { lintWithChevrotain } from '../../core/pipeline.js';
import { coercePos, mapFlowchartParserError } from '../../core/diagnostics.js';
import { detectDoubleInDouble, detectUnclosedQuotesInText } from '../../core/quoteHygiene.js';
import { detectEscapedQuotes } from '../../core/quoteHygiene.js';

export function validateFlowchart(text: string, options: ValidateOptions = {}): ValidationError[] {
  return lintWithChevrotain(text, {
    tokenize,
    parse,
    analyze: (cst, tokens) => analyzeFlowchart(cst as any, tokens as IToken[], { strict: !!options.strict }),
    mapParserError: (e, t) => mapFlowchartParserError(e, t),
    postLex: (_text, tokens) => {
      const errs: ValidationError[] = [];
      for (const token of tokens as IToken[]) {
        if (token.tokenType === InvalidArrow) {
          errs.push({
            line: token.startLine ?? 1,
            column: token.startColumn ?? 1,
            message: 'Invalid arrow syntax: -> (use --> instead)',
            severity: 'error',
            code: 'FL-ARROW-INVALID',
            hint: 'Replace -> with -->, or use -- text --> for inline labels.',
            length: (token.image?.length ?? 2)
          });
        }
      }
      return errs;
    },
    postParse: (text, tokens, _cst, prevErrors) => {
      // Heuristic scan: quotes inside unquoted square-bracket labels even when parse failed earlier
      // This catches cases like: A[... "text" ...] alongside unrelated parse errors (e.g., subgraph title).
      if (!(prevErrors || []).some((e: any) => e.code === 'FL-LABEL-QUOTE-IN-UNQUOTED')) {
        const tks = tokens as IToken[];
        for (let i = 0; i < tks.length; i++) {
          const t = tks[i];
          if (t.tokenType?.name === 'SquareOpen') {
            const start = i;
            let j = i + 1;
            let foundQuote: IToken | null = null;
            while (j < tks.length) {
              const tt = tks[j];
              if (tt.tokenType?.name === 'SquareClose') break;
              if (tt.tokenType?.name === 'QuotedString' && typeof tt.image === 'string' && tt.image.startsWith('"')) { foundQuote = tt; break; }
              j++;
            }
            if (foundQuote) {
              const img = String(foundQuote.image || '');
              const inner = img.startsWith('"') && img.endsWith('"') ? img.slice(1, -1) : img;
              if (inner.trim().length === 0) { i = j; continue; }
              const exists = (prevErrors || []).some((e: any) => e.code === 'FL-LABEL-QUOTE-IN-UNQUOTED' && e.line === (foundQuote.startLine ?? t.startLine ?? 1));
              if (!exists) {
                prevErrors.push({
                line: foundQuote.startLine ?? t.startLine ?? 1,
                column: foundQuote.startColumn ?? 1,
                severity: 'error',
                code: 'FL-LABEL-QUOTE-IN-UNQUOTED',
                message: 'Quotes are not allowed inside unquoted node labels. Use &quot; for quotes or wrap the entire label in quotes.',
                hint: 'Example: I[Log &quot;processing N items&quot;] or I["Log \\"processing N items\\""]',
                length: (foundQuote.image?.length ?? 1)
              } as ValidationError);
              }
              // Skip to after this bracket to avoid duplicate reports
              i = j;
            }
          }
        }
      }
      // Flowchart: unsupported meta headers (title)
      {
        const tks = tokens as IToken[];
        const firstByLine = new Map<number, IToken>();
        for (const tk of tks) {
          const ln = tk.startLine ?? 1;
          const col = tk.startColumn ?? 1;
          const prev = firstByLine.get(ln);
          if (!prev || (prev.startColumn ?? Infinity) > col) firstByLine.set(ln, tk);
        }
        for (const tk of tks) {
          if (tk.image === 'title' && firstByLine.get(tk.startLine ?? 1) === tk) {
            prevErrors.push({
              line: tk.startLine ?? 1,
              column: tk.startColumn ?? 1,
              severity: 'error',
              code: 'FL-META-UNSUPPORTED',
              message: "'title' is not supported in flowcharts by the current Mermaid CLI.",
              hint: 'Use a Markdown heading above the code block, or draw a labeled node at the top (e.g., T["Dependency Relationship"]).',
              length: (tk.image?.length ?? 5)
            } as ValidationError);
          }
        }
      }
      // Mermaid accepts backslash-escaped quotes inside quoted labels.
      // Emit as a warning (not an error) so --fix can normalize to &quot; if desired.
      const escWarn = detectEscapedQuotes(tokens as IToken[], {
        code: 'FL-LABEL-ESCAPED-QUOTE',
        message: 'Escaped quotes (\\") in node labels are accepted by Mermaid, but using &quot; is preferred for portability.',
        hint: 'Prefer &quot; inside quoted labels, e.g., A["He said &quot;Hi&quot;"]'
      }).map(e => ({ ...e, severity: 'warning' } as ValidationError));
      // Detect double-in-double for lines not already reported by the parser mapping
      const seenDoubleLines = new Set(
        prevErrors.filter(e => e.code === 'FL-LABEL-DOUBLE-IN-DOUBLE').map(e => e.line)
      );
      // Avoid reporting when a properly escaped quote appears on the same line
      const escapedLinesAll = new Set(detectEscapedQuotes(tokens as IToken[], { code: 'x' }).map(e => e.line));
      const dbl = detectDoubleInDouble(tokens as IToken[], {
        code: 'FL-LABEL-DOUBLE-IN-DOUBLE',
        message: 'Double quotes inside a double-quoted label are not supported. Use &quot; for inner quotes.',
        hint: 'Example: A["He said &quot;Hi&quot;"]',
        scopeEndTokenNames: [
          'SquareClose','RoundClose','DiamondClose','DoubleSquareClose','DoubleRoundClose','StadiumClose','CylinderClose','HexagonClose'
        ],
        scopeStartTokenNames: [
          'SquareOpen','RoundOpen','DiamondOpen','DoubleSquareOpen','DoubleRoundOpen','StadiumOpen','CylinderOpen','HexagonOpen'
        ]
      }).filter(e => !seenDoubleLines.has(e.line) && !escapedLinesAll.has(e.line));
      const errs = escWarn.concat(dbl);
      // Heuristic: map generic parser error for two identifiers on one line (missing arrow)
      const generic = (prevErrors || []).filter(e => e.severity === 'error' && !('code' in e) && typeof e.message === 'string');
      for (const ge of generic) {
        const msg = String((ge as any).message || '');
        if (msg.includes('Newline') && msg.includes('EOF')) {
          errs.push({
            line: (ge as any).line ?? 1,
            column: (ge as any).column ?? 1,
            severity: 'error',
            code: 'FL-LINK-MISSING',
            message: "Two nodes on one line must be connected with an arrow.",
            hint: 'Insert --> between nodes, e.g., A --> B.'
          });
        }
      }
      // Heuristic: explicit missing arrow when two node-like refs are on one line with only whitespace between
      {
        const lines = text.split(/\r?\n/);
        const nodeRef = String.raw`[A-Za-z0-9_]+(?:\[[^\]]*\]|\([^\)]*\)|\{[^}]*\}|\[\[[^\]]*\]\]|\(\([^\)]*\)\))?`;
        const re = new RegExp(String.raw`^\s*(${nodeRef})\s+(${nodeRef})\s*;?\s*$`);
        const skipStart = /^(?:\s*)(style|classDef|class|click|linkStyle|subgraph|end|graph|flowchart|direction)\b/;
        for (let i = 0; i < lines.length; i++) {
          const raw = lines[i] || '';
          const ln = i + 1;
          if (!raw.trim()) continue;
          if (skipStart.test(raw)) continue;
          const m = re.exec(raw);
          if (m) {
            const idxSecond = raw.indexOf(m[2]);
            const col = idxSecond >= 0 ? (idxSecond + 1) : 1;
            errs.push({
              line: ln,
              column: col,
              severity: 'error',
              code: 'FL-LINK-MISSING',
              message: 'Two nodes on one line must be connected with an arrow.',
              hint: 'Insert --> between nodes, e.g., A --> B.'
            });
          }
        }
      }

      // File-level unclosed quote detection: only if overall quote count is odd (Mermaid treats
        // per-line mismatches as OK as long as the file balances quotes overall).
      const dblEsc = (text.match(/\\\"/g) || []).length;
      const dq = (text.match(/\"/g) || []).length - dblEsc;
      const sq = (text.match(/'/g) || []).length;
      if ((dq % 2 === 1) || (sq % 2 === 1)) {
        errs.push(...detectUnclosedQuotesInText(text, {
          code: 'FL-QUOTE-UNCLOSED',
          message: 'Unclosed quote in node label.',
          hint: 'Close the quote: A["Label"]',
          limitPerFile: 1
        }));
      }
      return errs;
    }
  });
}
