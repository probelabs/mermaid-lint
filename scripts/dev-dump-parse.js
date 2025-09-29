#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy import compiled JS from out/
const flowLexer = await import('../out/diagrams/flowchart/lexer.js');
const flowParser = await import('../out/diagrams/flowchart/parser.js');

function dump(obj) {
  return JSON.stringify(obj, (k, v) => {
    if (k === 'image' && typeof v === 'string' && v.length > 120) {
      return v.slice(0, 120) + '…';
    }
    return v;
  }, 2);
}

function parseFlowchart(text) {
  const lex = flowLexer.MermaidLexer.tokenize(text);
  const res = flowParser.parse(lex.tokens);
  return { lex, res };
}

function main() {
  const rel = process.argv[2];
  if (!rel) {
    console.error('Usage: node scripts/dev-dump-parse.js <file.mmd>');
    process.exit(1);
  }
  const file = path.resolve(__dirname, '..', rel);
  const text = fs.readFileSync(file, 'utf8');
  const { lex, res } = parseFlowchart(text);
  console.log('LEX ERRORS:', lex.errors);
  const parsed = res.errors.map(e => ({
    name: e.name,
    message: e.message,
    token: {
      image: e.token?.image,
      startLine: e.token?.startLine,
      startColumn: e.token?.startColumn,
      tokenType: e.token?.tokenType?.name,
    },
    context: e.context ? {
      ruleStack: Array.isArray(e.context.ruleStack) ? [...e.context.ruleStack] : e.context.ruleStack,
      ruleOccurrenceStack: Array.isArray(e.context.ruleOccurrenceStack) ? [...e.context.ruleOccurrenceStack] : e.context.ruleOccurrenceStack,
      expectedTokens: e.context.expectedTokens ? e.context.expectedTokens.map(t => t.name) : undefined,
    } : undefined
  }));
  console.log('\nPARSE ERRORS JSON:');
  console.log(dump(parsed));
}

main();
