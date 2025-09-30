import type { ValidationError, TextEditLC, FixLevel } from './types.js';
import { insertAt, replaceRange, lineTextAt, inferIndentFromLine } from './edits.js';

// Helpers
function at(e: ValidationError) { return { line: e.line, column: e.column }; }

function is(code: string, e: ValidationError) { return e.code === code; }

export function computeFixes(text: string, errors: ValidationError[], level: FixLevel = 'safe'): TextEditLC[] {
  const edits: TextEditLC[] = [];
  for (const e of errors) {
    // Flowchart fixes
    if (is('FL-ARROW-INVALID', e)) {
      edits.push(replaceRange(text, at(e), e.length ?? 2, '-->'));
      continue;
    }
    if (is('FL-LABEL-ESCAPED-QUOTE', e)) {
      edits.push(replaceRange(text, at(e), e.length ?? 2, '&quot;'));
      continue;
    }
    // Note: '*-LABEL-DOUBLE-IN-DOUBLE' is intentionally not auto-fixed; naive single-char replacement
    // at the second quoted token can corrupt the line. We leave it as a hint-only for now.
    if (is('FL-LABEL-DOUBLE-IN-SINGLE', e)) {
      edits.push(replaceRange(text, at(e), e.length ?? 1, '&quot;'));
      continue;
    }
    if (is('FL-NODE-MIXED-BRACKETS', e)) {
      // replace ']' with ')'
      edits.push(replaceRange(text, at(e), e.length ?? 1, ')'));
      continue;
    }
    if (is('FL-DIR-KW-INVALID', e)) {
      edits.push(replaceRange(text, at(e), e.length ?? 0, 'direction'));
      continue;
    }
    if (is('FL-DIR-MISSING', e)) {
      if (level === 'safe' || level === 'all') {
        // Default to TD
        edits.push(insertAt(text, at(e), ' TD'));
      }
      continue;
    }
    if (is('FL-LINK-MISSING', e)) {
      if (level === 'all') edits.push(insertAt(text, at(e), ' --> '));
      continue;
    }
    if (is('FL-NODE-UNCLOSED-BRACKET', e)) {
      if (level === 'all') {
        const m = e.message || '';
        let closer = ']';
        if (m.includes("'('")) closer = ')';
        if (m.includes("'{'")) closer = '}';
        if (m.includes("'[[ '")) closer = ']]';
        else if (m.includes("'(( '")) closer = '))';
        edits.push(insertAt(text, at(e), closer));
      }
      continue;
    }
        // No flowchart quote-wrapping autofixes (strict/unquoted)


    // Pie fixes
    if (is('PI-LABEL-ESCAPED-QUOTE', e)) {
      edits.push(replaceRange(text, at(e), e.length ?? 1, '&quot;'));
      continue;
    }
    if (is('PI-MISSING-COLON', e)) {
      edits.push(insertAt(text, at(e), ' : '));
      continue;
    }
    if (is('PI-LABEL-REQUIRES-QUOTES', e)) {
      // Wrap label before colon
      const lineText = lineTextAt(text, e.line);
      const colon = lineText.indexOf(':');
      if (colon > 0) {
        const raw = lineText.slice(0, colon);
        const startIdx = raw.search(/\S/);
        const endIdx = raw.replace(/\s+$/,'').length;
        if (startIdx >= 0 && endIdx > startIdx) {
          edits.push(insertAt(text, { line: e.line, column: startIdx + 1 }, '"'));
          edits.push(insertAt(text, { line: e.line, column: endIdx + 1 }, '"'));
        }
      }
      continue;
    }
    if (is('PI-QUOTE-UNCLOSED', e)) {
      if (level === 'all') {
        const lineText = lineTextAt(text, e.line);
        const colon = lineText.indexOf(':');
        const insertCol = colon > 0 ? colon + 1 : (lineText.length + 1);
        edits.push(insertAt(text, { line: e.line, column: insertCol }, '"'));
      }
      continue;
    }

    // Sequence fixes
    if (is('SE-MSG-COLON-MISSING', e)) {
      edits.push(insertAt(text, at(e), ': '));
      continue;
    }
    if (is('SE-NOTE-MALFORMED', e)) {
      // Only safe to insert colon variant when missing colon kind; but we map the colon-missing path with this code
      edits.push(insertAt(text, at(e), ': '));
      continue;
    }
    if (is('SE-ELSE-IN-CRITICAL', e)) {
      edits.push(replaceRange(text, at(e), e.length ?? 4, 'option'));
      continue;
    }
    if (is('SE-BLOCK-MISSING-END', e)) {
      const lineText = lineTextAt(text, e.line);
      const indent = inferIndentFromLine(lineText);
      edits.push(insertAt(text, at(e), `\n${indent}end`));
      continue;
    }
    if (is('SE-AUTONUMBER-EXTRANEOUS', e)) {
      // Place the extraneous token on the next line with same indentation
      const indent = ' '.repeat(Math.max(0, (e.column - 1)));
      edits.push(insertAt(text, at(e), `\n${indent}`));
      continue;
    }
    if (is('SE-AUTONUMBER-MALFORMED', e) || is('SE-AUTONUMBER-NON-NUMERIC', e)) {
      if (level === 'all') {
        const lineText = lineTextAt(text, e.line);
        const idx = lineText.indexOf('autonumber');
        if (idx >= 0) {
          // Replace from start of 'autonumber' to end of line with just 'autonumber'
          edits.push({ start: { line: e.line, column: idx + 1 }, end: { line: e.line, column: lineText.length + 1 }, newText: 'autonumber' });
        }
      }
      continue;
    }
    if (is('SE-LABEL-ESCAPED-QUOTE', e)) {
      edits.push(replaceRange(text, at(e), e.length ?? 1, '&quot;'));
      continue;
    }
    if (is('SE-QUOTE-UNCLOSED', e)) {
      if (level === 'all') {
        const lineText = lineTextAt(text, e.line);
        const insertCol = lineText.length + 1;
        edits.push(insertAt(text, { line: e.line, column: insertCol }, '"'));
      }
      continue;
    }

    // Strict mode quote requirement (apply only in 'all' to stay conservative)
    if (is('FL-STRICT-LABEL-QUOTES-REQUIRED', e)) {
      if (level === 'all') {
        const lineText = lineTextAt(text, e.line);
        const caret = Math.max(0, e.column - 1);
        const before = lineText.slice(0, caret);
        const after = lineText.slice(caret);
        const openIdx = Math.max(before.lastIndexOf('['), before.lastIndexOf('('), before.lastIndexOf('{'));
        if (openIdx >= 0) {
          const openCh = before[openIdx];
          const closeCh = openCh === '[' ? ']' : openCh === '(' ? ')' : '}';
          const closeIdx = lineText.indexOf(closeCh, caret);
          if (closeIdx > openIdx) {
            edits.push(insertAt(text, { line: e.line, column: openIdx + 2 }, '"'));
            edits.push(insertAt(text, { line: e.line, column: closeIdx + 1 }, '"'));
          }
        }
      }
      continue;
    }
  }
  return edits;
}
