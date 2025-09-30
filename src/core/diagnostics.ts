import type { ILexingError, IRecognitionException, IToken } from 'chevrotain';
import type { ValidationError } from './types.js';

export function coercePos(line?: number | null, column?: number | null, fallbackLine = 1, fallbackColumn = 1) {
  const ln = Number.isFinite(line as number) && (line as number)! > 0 ? (line as number) : fallbackLine;
  const col = Number.isFinite(column as number) && (column as number)! > 0 ? (column as number) : fallbackColumn;
  return { line: ln, column: col };
}

export function endOfTextPos(text: string) {
  const lines = text.split(/\r?\n/);
  const line = lines.length;
  const last = lines[lines.length - 1] ?? '';
  const column = Math.max(1, last.length + 1);
  return { line, column };
}

export function codeFrame(
  text: string,
  line: number,
  column: number,
  length = 1,
  contextLines = 1
): string {
  const lines = text.split(/\r?\n/);
  const idx = Math.max(0, Math.min(lines.length - 1, line - 1));
  const start = Math.max(0, idx - contextLines);
  const end = Math.min(lines.length - 1, idx + contextLines);
  const numWidth = String(end + 1).length;

  const parts: string[] = [];
  for (let i = start; i <= end; i++) {
    const lno = String(i + 1).padStart(numWidth, ' ');
    parts.push(`${lno} | ${lines[i] ?? ''}`);
    if (i === idx) {
      const caretPad = ' '.repeat(Math.max(0, column - 1));
      const marker = '^'.repeat(Math.max(1, Math.min(length, (lines[i] ?? '').length - column + 1)));
      parts.push(`${' '.repeat(numWidth)} | ${caretPad}${marker}`);
    }
  }
  return parts.join('\n');
}

export function fromLexerError(e: ILexingError): ValidationError {
  const { line, column } = coercePos(e.line, e.column);
  return {
    line,
    column,
    severity: 'error',
    message: e.message,
  };
}

// Helpers
function tokenImage(t?: IToken | null) {
  const img = t?.image ?? '';
  return img === '\n' ? '\\n' : img;
}

function isInRule(err: IRecognitionException, name: string) {
  const stack: string[] | undefined = (err as any)?.context?.ruleStack;
  return Array.isArray(stack) && stack.includes(name);
}

function expecting(err: IRecognitionException, tokenName: string) {
  // Chevrotain does not always expose expected tokens structurally; fall back to message text.
  return (err.message || '').includes(`--> ${tokenName} <--`);
}

function atHeader(err: IRecognitionException) {
  const stack: string[] | undefined = (err as any)?.context?.ruleStack;
  return Array.isArray(stack) && stack.length === 1 && stack[0] === 'diagram';
}

export function mapFlowchartParserError(err: IRecognitionException, text: string): ValidationError {
  const tok = err.token;
  const posFallback = endOfTextPos(text);
  const { line, column } = coercePos(tok?.startLine ?? null, tok?.startColumn ?? null, posFallback.line, posFallback.column);
  const found = tokenImage(tok);
  const tokType = tok?.tokenType?.name;
  const len = typeof (tok as any)?.image === 'string' && (tok as any).image.length > 0 ? (tok as any).image.length : 1;

  // 1) Direction after header
  if (atHeader(err) && expecting(err, 'Direction')) {
    if (tokType === 'EOF') {
      return {
        line, column, severity: 'error', code: 'FL-DIR-MISSING',
        message: 'Missing direction after diagram header. Use TD, TB, BT, RL, or LR.',
        hint: "Example: 'flowchart TD' for top-down layout.",
        length: 1
      };
    }
    return {
      line, column, severity: 'error', code: 'FL-DIR-INVALID',
      message: `Invalid direction '${found}'. Use one of: TD, TB, BT, RL, LR.`,
      hint: "Try 'TD' (top-down) or 'LR' (left-to-right).",
      length: len
    };
  }

  // 2) Missing arrow between nodes on the same line
  if (isInRule(err, 'nodeStatement') && err.name === 'NoViableAltException') {
    // Common pattern: expecting Newline/EOF but found Identifier
    if ((err.message || '').includes('[Newline') && (err.message || '').includes('[EOF')) {
      return {
        line, column, severity: 'error', code: 'FL-LINK-MISSING',
        message: `Two nodes on one line must be connected with an arrow before '${found}'.`,
        hint: 'Insert --> between nodes, e.g., A --> B.',
        length: len
      };
    }
  }

  // 3) Mixed brackets: opened '(' closed with ']'
  if (isInRule(err, 'nodeShape') && err.name === 'MismatchedTokenException' && tokType === 'SquareClose' && expecting(err, 'RoundClose')) {
    return {
      line, column, severity: 'error', code: 'FL-NODE-MIXED-BRACKETS',
      message: "Mismatched brackets: opened '(' but closed with ']'.",
      hint: "Close with ')' or change the opening bracket to '['.",
      length: len
    };
  }

  // 4) Unclosed/mismatched brackets inside a node
  if (isInRule(err, 'nodeShape') && err.name === 'MismatchedTokenException') {
    if (expecting(err, 'SquareClose')) {
      return { line, column, severity: 'error', code: 'FL-NODE-UNCLOSED-BRACKET', message: "Unclosed '['. Add a matching ']' before the arrow or newline.", hint: "Example: A[Label] --> B", length: 1 };
    }
    if (expecting(err, 'RoundClose')) {
      return { line, column, severity: 'error', code: 'FL-NODE-UNCLOSED-BRACKET', message: "Unclosed '('. Add a matching ')'.", hint: "Example: B(Label)", length: 1 };
    }
    if (expecting(err, 'DiamondClose')) {
      return { line, column, severity: 'error', code: 'FL-NODE-UNCLOSED-BRACKET', message: "Unclosed '{'. Add a matching '}'.", hint: "Example: C{Decision}", length: 1 };
    }
    if (expecting(err, 'DoubleRoundClose')) {
      return { line, column, severity: 'error', code: 'FL-NODE-UNCLOSED-BRACKET', message: "Unclosed '(( '. Add a matching '))'.", hint: "Example: A((Circle))", length: 2 };
    }
    if (expecting(err, 'DoubleSquareClose')) {
      return { line, column, severity: 'error', code: 'FL-NODE-UNCLOSED-BRACKET', message: "Unclosed '[[ '. Add a matching ']]'.", hint: "Example: [[Subroutine]]", length: 2 };
    }
  }

  // 4b) Quotes appear inside an unquoted label content
  if (isInRule(err, 'nodeContent') && err.name === 'MismatchedTokenException' && tokType === 'QuotedString') {
    return {
      line, column, severity: 'error', code: 'FL-LABEL-QUOTE-IN-UNQUOTED',
      message: 'Double quotes inside an unquoted label are not allowed. Wrap the entire label in quotes or use &quot;.',
      hint: 'Example: A["Calls logger.debug(&quot;message&quot;, data)"]',
      length: len
    };
  }

  

  // 5) Invalid/Incomplete class statement
  if (isInRule(err, 'classStatement')) {
    return {
      line, column, severity: 'error', code: 'FL-CLASS-MALFORMED',
      message: 'Invalid class statement. Provide node id(s) then a class name.',
      hint: 'Example: class A,B important',
      length: len
    };
  }

  // 6) Subgraph requires header (id or [Title])
  if (isInRule(err, 'subgraph') && err.name === 'NoViableAltException') {
    return {
      line, column, severity: 'error', code: 'FL-SUBGRAPH-MISSING-HEADER',
      message: 'Subgraph header is missing. Add an ID or a [Title] after the keyword.',
      hint: 'Example: subgraph API [API Layer]',
      length: len
    };
  }

  // 7) Unmatched 'end' with no open subgraph
  if (err.name === 'NotAllInputParsedException' && tokType === 'EndKeyword') {
    return {
      line, column, severity: 'error', code: 'FL-END-WITHOUT-SUBGRAPH',
      message: "'end' without a matching 'subgraph'.",
      hint: 'Remove this end or add a subgraph above.',
      length: len
    };
  }

  // Default: keep original message
  return {
    line,
    column,
    severity: 'error',
    message: err.message || 'Parser error',
    length: len
  };
}

export function mapPieParserError(err: IRecognitionException, text: string): ValidationError {
  const tok = err.token;
  const posFallback = endOfTextPos(text);
  const { line, column } = coercePos(tok?.startLine ?? null, tok?.startColumn ?? null, posFallback.line, posFallback.column);
  const found = tokenImage(tok);
  const len = typeof (tok as any)?.image === 'string' && (tok as any).image.length > 0 ? (tok as any).image.length : 1;

  // Colon at top-level usually means missing quoted label before it
  if (err.name === 'NotAllInputParsedException' && tok?.tokenType?.name === 'Colon') {
    return {
      line, column, severity: 'error', code: 'PI-LABEL-REQUIRES-QUOTES',
      message: 'Slice labels must be quoted (single or double quotes).',
      hint: 'Example: "Dogs" : 10',
      length: len
    };
  }

  // Unclosed quote: token looks like it starts with a quote but never closed
  if (err.name === 'NotAllInputParsedException' && typeof tok?.image === 'string') {
    const s = tok.image as string;
    if ((s.startsWith('"') && !s.slice(1).includes('"')) || (s.startsWith("'") && !s.slice(1).includes("'"))) {
      return {
        line, column, severity: 'error', code: 'PI-QUOTE-UNCLOSED',
        message: 'Unclosed quote in slice label.',
        hint: 'Close the quote: "Dogs" : 10',
        length: len
      };
    }
  }

  // Missing colon between label and number
  if (expecting(err, 'Colon')) {
    return {
      line, column, severity: 'error', code: 'PI-MISSING-COLON',
      message: 'Missing colon between slice label and value.',
      hint: 'Use: "Label" : 10',
      length: len
    };
  }

  // Missing number after colon
  if (expecting(err, 'NumberLiteral')) {
    return {
      line, column, severity: 'error', code: 'PI-MISSING-NUMBER',
      message: 'Missing numeric value after colon.',
      hint: 'Use a number like 10 or 42.5',
      length: len
    };
  }

  // Unquoted label
  if (expecting(err, 'QuotedString')) {
    return {
      line, column, severity: 'error', code: 'PI-LABEL-REQUIRES-QUOTES',
      message: 'Slice labels must be quoted (single or double quotes).',
      hint: 'Example: "Dogs" : 10',
      length: len
    };
  }

  return { line, column, severity: 'error', message: err.message || 'Parser error', length: len };
}

export function mapSequenceParserError(err: IRecognitionException, text: string): ValidationError {
  const tok = err.token;
  const posFallback = endOfTextPos(text);
  const { line, column } = coercePos(tok?.startLine ?? null, tok?.startColumn ?? null, posFallback.line, posFallback.column);
  const found = tokenImage(tok);
  const tokType = tok?.tokenType?.name;
  const len = typeof (tok as any)?.image === 'string' && (tok as any).image.length > 0 ? (tok as any).image.length : 1;

  const inRule = (name: string) => isInRule(err, name);
  const exp = (name: string) => expecting(err, name);
  const atHeader = (err as any)?.context?.ruleStack?.[0] === 'diagram' && ((err as any)?.context?.ruleStack?.length === 1);

  // Header must be 'sequenceDiagram'
  if (atHeader && exp('SequenceKeyword')) {
    return { line, column, severity: 'error', code: 'SE-HEADER-MISSING', message: "Missing 'sequenceDiagram' header.", hint: "Start with: sequenceDiagram", length: len };
  }

  // Message syntax requires colon before message text
  if (inRule('messageStmt') && err.name === 'MismatchedTokenException' && exp('Colon')) {
    return { line, column, severity: 'error', code: 'SE-MSG-COLON-MISSING', message: 'Missing colon after target actor in message.', hint: 'Use: A->>B: Message text', length: len };
  }

  // Unknown/invalid arrow token
  if (inRule('arrow') && err.name === 'NoViableAltException') {
    return { line, column, severity: 'error', code: 'SE-ARROW-INVALID', message: `Invalid sequence arrow near '${found}'.`, hint: 'Use ->, -->, ->>, -->>, -x, --x, -), --), <<->>, or <<-->>', length: len };
  }

  // Note forms
  if (inRule('noteStmt')) {
    if (err.name === 'MismatchedTokenException' && exp('Colon')) {
      return { line, column, severity: 'error', code: 'SE-NOTE-MALFORMED', message: 'Malformed note: missing colon before the note text.', hint: 'Example: Note right of Alice: Hello', length: len };
    }
    if (err.name === 'NoViableAltException') {
      return { line, column, severity: 'error', code: 'SE-NOTE-MALFORMED', message: 'Malformed note statement. Use left|right of X or over X[,Y]: text', hint: 'Examples: Note over A,B: hi', length: len };
    }
  }

  // 'else' inside a 'critical' block is invalid (should use 'option')
  if (tokType === 'ElseKeyword' && isInRule(err, 'criticalBlock')) {
    return {
      line, column, severity: 'error', code: 'SE-ELSE-IN-CRITICAL',
      message: "'else' is not allowed inside a 'critical' block. Use 'option' or close the block with 'end'.",
      hint: "Replace with: option <label>\nExample:\noption Retry",
      length: len
    };
  }

  // Missing 'end' inside a block (alt/opt/loop/par/rect/critical/break/box)
  const blockRules: Array<{ rule: string; label: string }> = [
    { rule: 'altBlock', label: 'alt' },
    { rule: 'optBlock', label: 'opt' },
    { rule: 'loopBlock', label: 'loop' },
    { rule: 'parBlock', label: 'par' },
    { rule: 'rectBlock', label: 'rect' },
    { rule: 'criticalBlock', label: 'critical' },
    { rule: 'breakBlock', label: 'break' },
    { rule: 'boxBlock', label: 'box' },
  ];
  if (err.name === 'MismatchedTokenException' && exp('EndKeyword')) {
    const blk = blockRules.find(b => isInRule(err, b.rule));
    if (blk) {
      // Place caret at end of previous non-empty line if current is blank
      const lines = text.split(/\r?\n/);
      let caretLine = line;
      // Walk up to the nearest non-empty line to anchor the caret meaningfully
      while (caretLine > 1 && (lines[caretLine - 1] ?? '').trim() === '') {
        caretLine--;
      }
      const caretCol = Math.max(1, ((lines[caretLine - 1] ?? '').length + 1));
      return {
        line: caretLine,
        column: caretCol,
        severity: 'error',
        code: 'SE-BLOCK-MISSING-END',
        message: `Missing 'end' to close a '${blk.label}' block.`,
        hint: "Add 'end' on a new line after the block contents.",
        length: 1
      };
    }
  }

  // Block control keywords outside blocks
  if ((err.name === 'NoViableAltException' || err.name === 'NotAllInputParsedException') && tokType === 'ElseKeyword') {
    return { line, column, severity: 'error', code: 'SE-ELSE-OUTSIDE-ALT', message: "'else' is only allowed inside 'alt' blocks.", hint: 'Start with: alt Condition ... else ... end', length: len };
  }
  if ((err.name === 'NoViableAltException' || err.name === 'NotAllInputParsedException') && tokType === 'AndKeyword') {
    return { line, column, severity: 'error', code: 'SE-AND-OUTSIDE-PAR', message: "'and' is only allowed inside 'par' blocks.", hint: 'Example: par … and … end (parallel branches).', length: len };
  }
  if ((err.name === 'NoViableAltException' || err.name === 'NotAllInputParsedException') && tokType === 'EndKeyword') {
    return { line, column, severity: 'error', code: 'SE-END-WITHOUT-BLOCK', message: "'end' without an open block (alt/opt/loop/par/rect/critical/break/box).", hint: 'Add a block above (e.g., par … end | alt … end) or remove this end.', length: len };
  }

  // Autonumber malformed / specific cases
  if (inRule('autonumberStmt')) {
    // Non-numeric step value
    if (tokType === 'Identifier') {
      return { line, column, severity: 'error', code: 'SE-AUTONUMBER-NON-NUMERIC', message: `Autonumber values must be numbers. Found '${found}'.`, hint: 'Use numbers: autonumber 10 or autonumber 10 10 (start and step).', length: len };
    }
    // Participant/actor where a number or newline is expected
    if (tokType === 'ParticipantKeyword' || tokType === 'ActorKeyword') {
      return { line, column, severity: 'error', code: 'SE-AUTONUMBER-EXTRANEOUS', message: "Unexpected token after 'autonumber'. Put 'autonumber' on its own line.", hint: 'Example:\nautonumber 10 10\nparticipant A', length: len };
    }
    if (err.name === 'NoViableAltException' || err.name === 'MismatchedTokenException' || err.name === 'NotAllInputParsedException') {
      return { line, column, severity: 'error', code: 'SE-AUTONUMBER-MALFORMED', message: 'Malformed autonumber statement.', hint: 'Use: autonumber | autonumber off | autonumber 10 10', length: len };
    }
  }

  // Create/destroy malformed
  if (inRule('createStmt') && (err.name === 'MismatchedTokenException' || err.name === 'NoViableAltException')) {
    return {
      line, column, severity: 'error', code: 'SE-CREATE-MALFORMED',
      message: "After 'create', specify 'participant' or 'actor' before the name.",
      hint: "Examples:\ncreate participant B\ncreate actor D as Donald",
      length: len
    };
  }
  if (inRule('createStmt') && (tokType === 'Newline' || tokType === 'EOF')) {
    return {
      line, column, severity: 'error', code: 'SE-CREATE-MISSING-NAME',
      message: "Missing name after 'create'.",
      hint: "Use: create participant A  or  create actor B",
      length: len
    };
  }
  if (inRule('destroyStmt') && err.name === 'MismatchedTokenException') {
    return { line, column, severity: 'error', code: 'SE-DESTROY-MALFORMED', message: "After 'destroy', specify 'participant' or 'actor' and a name.", hint: 'Examples:\ndestroy participant A\ndestroy actor B', length: len };
  }
  if (inRule('destroyStmt') && (tokType === 'Newline' || tokType === 'EOF')) {
    return {
      line, column, severity: 'error', code: 'SE-DESTROY-MISSING-NAME',
      message: "Missing name after 'destroy'.",
      hint: "Use: destroy participant A  or  destroy actor B",
      length: len
    };
  }

  return { line, column, severity: 'error', message: err.message || 'Parser error', length: len };
}
