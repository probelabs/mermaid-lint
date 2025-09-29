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
