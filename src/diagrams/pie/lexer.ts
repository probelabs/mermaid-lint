import { createToken, Lexer } from 'chevrotain';

// Basic tokens reused across simple pie grammar
export const PieKeyword = createToken({ name: 'PieKeyword', pattern: /pie/ });
export const TitleKeyword = createToken({ name: 'TitleKeyword', pattern: /title/ });
export const ShowDataKeyword = createToken({ name: 'ShowDataKeyword', pattern: /showData/ });

export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /-?[0-9]+(\.[0-9]+)?/ });
// Allow escaped characters within quotes (e.g., \" inside "...")
export const QuotedString = createToken({ name: 'QuotedString', pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ });
// Less greedy text for labels and titles (no colon, pipe, angle, brackets)
// Text: fallback for labels/titles; avoid greed by placing AFTER WhiteSpace and keywords
export const Text = createToken({ name: 'Text', pattern: /[^:\n\r]+/ });

export const Comment = createToken({ name: 'Comment', pattern: /%%[^\n\r]*/, group: Lexer.SKIPPED });
export const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /[ \t]+/, group: Lexer.SKIPPED });
export const Newline = createToken({ name: 'Newline', pattern: /[\n\r]+/, line_breaks: true });

export const allTokens = [
  // skipped
  Comment,
  // strings
  QuotedString,
  // keywords before text
  PieKeyword,
  TitleKeyword,
  ShowDataKeyword,
  // whitespace should come before Text so it doesn't get swallowed
  WhiteSpace,
  // punctuation and numbers
  Colon,
  NumberLiteral,
  // text last among visible tokens
  Text,
  // newline at the end
  Newline,
];

export const PieLexer = new Lexer(allTokens);

export function tokenize(text: string) {
  return PieLexer.tokenize(text);
}
