#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const testFixturesDir = './test-fixtures/flowchart';
const validDir = path.join(testFixturesDir, 'valid');
const invalidDir = path.join(testFixturesDir, 'invalid');

function runValidator(file) {
    try {
        execSync(`node out/cli.js "${file}"`, { stdio: 'pipe', timeout: 5000 });
        return 'VALID';
    } catch (error) {
        if (error.status === 1) {
            return 'INVALID';
        }
        return 'ERROR';
    }
}

console.log('=== TESTING CHEVROTAIN MERMAID VALIDATOR ===\n');

let totalPassed = 0;
let totalFailed = 0;

// Test valid diagrams
console.log('Testing VALID diagrams (should all pass):');
const validFiles = fs.readdirSync(validDir).filter(f => f.endsWith('.mmd'));

validFiles.forEach(file => {
    const filePath = path.join(validDir, file);
    const result = runValidator(filePath);
    
    if (result === 'VALID') {
        console.log(`  ✅ ${file}`);
        totalPassed++;
    } else {
        console.log(`  ❌ ${file} - Got ${result}, expected VALID`);
        totalFailed++;
    }
});

// Test invalid diagrams
console.log('\nTesting INVALID diagrams (should all fail):');
const invalidFiles = fs.readdirSync(invalidDir).filter(f => f.endsWith('.mmd'));

invalidFiles.forEach(file => {
    const filePath = path.join(invalidDir, file);
    const result = runValidator(filePath);
    
    // Special case: mermaid-cli allows empty diagrams (header only)
    const expectValid = file === 'empty-diagram.mmd';
    const expected = expectValid ? 'VALID' : 'INVALID';

    if (result === expected) {
        console.log(`  ✅ ${file}`);
        totalPassed++;
    } else {
        console.log(`  ❌ ${file} - Got ${result}, expected ${expected}`);
        totalFailed++;
    }
});

// Summary
const total = totalPassed + totalFailed;
const percentage = ((totalPassed / total) * 100).toFixed(1);

console.log('\n=== SUMMARY ===');
console.log(`Passed: ${totalPassed}/${total} (${percentage}%)`);
console.log(`Failed: ${totalFailed}/${total}`);

if (totalFailed > 0) {
    console.log('\nValidator needs fixes to achieve 100% accuracy');
    process.exit(1);
} else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
}
