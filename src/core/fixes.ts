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
      const lineText = lineTextAt(text, e.line);
      const caret0 = Math.max(0, e.column - 1);
      const q1 = lineText.lastIndexOf("'", caret0);
      const q2 = lineText.indexOf("'", Math.max(caret0 + 1, q1 + 1));
      if (q1 !== -1 && q2 !== -1 && q2 > q1) {
        const inner = lineText.slice(q1 + 1, q2);
        const replaced = inner.split('&quot;').join('\u0000').split('"').join('&quot;').split('\u0000').join('&quot;');
        if (replaced !== inner) {
          const start = { line: e.line, column: q1 + 2 };
          const end = { line: e.line, column: q2 + 1 };
          edits.push({ start, end, newText: replaced });
          continue;
        }
      }
      // Fallback: replace the current character only
      edits.push(replaceRange(text, at(e), e.length ?? 1, '&quot;'));
      continue;
    }
    if (is('FL-NODE-MIXED-BRACKETS', e)) {
      // replace ']' with ')'
      edits.push(replaceRange(text, at(e), e.length ?? 1, ')'));
      continue;
    }
    if (is('FL-NODE-EMPTY', e)) {
      // Remove empty square-bracket shape like A[""], A[" "], or A[] → keep just the node id (A)
      const lineText = lineTextAt(text, e.line);
      const caret0 = Math.max(0, e.column - 1);
      // Find nearest '[' before caret if caret is at '"'
      let openIdx = lineText[caret0] === '[' ? caret0 : lineText.lastIndexOf('[', caret0);
      if (openIdx >= 0) {
        const closeIdx = lineText.indexOf(']', Math.max(openIdx + 1, caret0));
        if (closeIdx !== -1) {
          const start = { line: e.line, column: openIdx + 1 };
          const len = closeIdx - openIdx + 1;
          edits.push(replaceRange(text, start, len, ''));
        }
      }
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
    if (is('FL-QUOTE-UNCLOSED', e)) {
      // Heuristic: if line has an odd number of double quotes and a closing bracket ahead,
      // insert a closing quote just before the nearest bracket. Conservative → only under --fix=all.
      if (level === 'all') {
        const lineText = lineTextAt(text, e.line);
        const caret0 = Math.max(0, e.column - 1);
        const withoutEsc = lineText.replace(/\\\"/g, '');
        const dq = (withoutEsc.match(/\"/g) || []).length;
        if (dq % 2 === 1) {
          // candidates of bracket closers after caret
          const candidates: Array<{idx:number}> = [];
          const pushIdx = (i:number) => { if (i >= 0) candidates.push({ idx: i }); };
          pushIdx(lineText.indexOf(']]', caret0));
          pushIdx(lineText.indexOf('))', caret0));
          pushIdx(lineText.indexOf('}', caret0));
          pushIdx(lineText.indexOf(']', caret0));
          pushIdx(lineText.indexOf(')', caret0));
          if (candidates.length) {
            const ins = candidates.reduce((a,b)=> a.idx !== -1 && a.idx <= b.idx ? a : b);
            const col = (ins.idx >= 0 ? ins.idx : lineText.length) + 1; // 1-based
            edits.push(insertAt(text, { line: e.line, column: col }, '"'));
          }
        }
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
      // Insert 'end' aligned with the opening block's indentation, before the next outdented line.
      const lines = text.split(/\r?\n/);
      const curIdx = Math.max(0, e.line - 1);
      // Find the opening block line upwards
      const openerRe = /^(\s*)(alt\b|opt\b|loop\b|par\b|rect\b|critical\b|break\b|box\b)/;
      let openIdx = -1;
      let openIndent = '';
      for (let i = curIdx; i >= 0; i--) {
        const m = openerRe.exec(lines[i] || '');
        if (m) { openIdx = i; openIndent = m[1] || ''; break; }
      }
      if (openIdx === -1) {
        // Fallback: align with current line's indent and insert at start of current line
        const indent = inferIndentFromLine(lines[curIdx] || '');
        edits.push(insertAt(text, { line: curIdx + 1, column: 1 }, `${indent}end\n`));
        continue;
      }
      // Walk forward to find first non-empty line whose indent <= openIndent → insert before it
      let insIdx = lines.length; // default append at EOF
      for (let i = openIdx + 1; i < lines.length; i++) {
        const raw = lines[i] || '';
        if (raw.trim() === '') continue;
        const ind = inferIndentFromLine(raw);
        if (ind.length <= openIndent.length) { insIdx = i; break; }
      }
      const insertLine = insIdx; // insert before this line (0-based)
      edits.push(insertAt(text, { line: insertLine + 1, column: 1 }, `${openIndent}end\n`));
      continue;
    }
    if (is('SE-AUTONUMBER-EXTRANEOUS', e)) {
      // Move the rest of the line (starting at the extraneous token) to the next line.
      const lineText = lineTextAt(text, e.line);
      const lineLen = lineText.length;
      const indent = inferIndentFromLine(lineText); // preserve original line indentation only
      const startCol = e.column; // 1-based column of the extraneous token
      // Trim any spaces immediately before the extraneous token to avoid trailing spaces at EOL
      const left = lineText.slice(0, Math.max(0, startCol - 1));
      const leftTrimmed = left.replace(/\s+$/, '');
      const startCol2 = leftTrimmed.length + 1;
      const tail = lineText.slice(Math.max(0, startCol - 1)).replace(/^\s+/, '');
      edits.push({ start: { line: e.line, column: startCol2 }, end: { line: e.line, column: lineLen + 1 }, newText: `\n${indent}${tail}` });
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
    if (is('SE-LABEL-DOUBLE-IN-DOUBLE', e)) {
      // Safer targeted fix for participant/actor lines: replace inner quotes within the outer name quotes
      const lineText = lineTextAt(text, e.line);
      const ts = lineText.trimStart();
      if (/^(participant|actor)\b/.test(ts)) {
        const kwIdx = lineText.indexOf('participant');
        const kwIdx2 = kwIdx === -1 ? lineText.indexOf('actor') : kwIdx;
        const startSearch = kwIdx2 >= 0 ? kwIdx2 : 0;
        const q1 = lineText.indexOf('"', startSearch);
        if (q1 !== -1) {
          // If ' as ' exists after q1, close at the last quote before ' as '; else use last quote in line
          const asIdx = lineText.indexOf(' as ', q1 + 1);
          const q2 = asIdx !== -1 ? lineText.lastIndexOf('"', asIdx - 1) : lineText.lastIndexOf('"');
          if (q2 > q1) {
            const inner = lineText.slice(q1 + 1, q2);
            const replaced = inner.split('&quot;').join('\u0000').split('"').join('&quot;').split('\u0000').join('&quot;');
            if (replaced !== inner) {
              const start = { line: e.line, column: q1 + 2 };
              const end = { line: e.line, column: q2 + 1 };
              edits.push({ start, end, newText: replaced });
            }
          }
        }
      }
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
