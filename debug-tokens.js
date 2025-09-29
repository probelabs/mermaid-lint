#!/usr/bin/env node
import { tokenize } from './out/chevrotain-lexer.js';
import fs from 'fs';

const file = process.argv[2];
const content = fs.readFileSync(file, 'utf8');
const result = tokenize(content);

console.log('TOKENS:');
result.tokens.forEach((token, i) => {
    console.log(`${i}: ${token.tokenType.name.padEnd(20)} | Line ${token.startLine}:${token.startColumn} | "${token.image}"`);
});

if (result.errors.length > 0) {
    console.log('\nLEXER ERRORS:');
    result.errors.forEach(err => {
        console.log(err);
    });
}