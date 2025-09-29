#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const testFixturesDir = './test-fixtures/flowchart';
const validDir = path.join(testFixturesDir, 'valid');
const invalidDir = path.join(testFixturesDir, 'invalid');

function runValidator(command, file) {
    try {
        execSync(`${command} "${file}"`, { stdio: 'pipe', timeout: 5000 });
        return 'VALID';
    } catch (error) {
        if (error.status === 1) {
            return 'INVALID';
        }
        return 'ERROR';
    }
}

function compareValidators() {
    console.log('=== COMPARING VALIDATORS: CHEVROTAIN vs CURRENT ===\n');
    
    const results = {
        valid: { match: 0, mismatch: [] },
        invalid: { match: 0, mismatch: [] }
    };
    
    // Test valid diagrams
    console.log('Testing VALID diagrams:');
    const validFiles = fs.readdirSync(validDir).filter(f => f.endsWith('.mmd'));
    
    validFiles.forEach(file => {
        const filePath = path.join(validDir, file);
        const chevrotainResult = runValidator('node out/cli-chevrotain-v2.js', filePath);
        const currentResult = runValidator('node out/cli-final.cjs', filePath);
        
        if (chevrotainResult === currentResult && chevrotainResult === 'VALID') {
            results.valid.match++;
            console.log(`  ✅ ${file}: Both say VALID`);
        } else {
            results.valid.mismatch.push({ file, chevrotain: chevrotainResult, current: currentResult });
            console.log(`  ❌ ${file}: Chevrotain=${chevrotainResult}, Current=${currentResult}`);
        }
    });
    
    // Test invalid diagrams
    console.log('\nTesting INVALID diagrams:');
    const invalidFiles = fs.readdirSync(invalidDir).filter(f => f.endsWith('.mmd'));
    
    invalidFiles.forEach(file => {
        const filePath = path.join(invalidDir, file);
        const chevrotainResult = runValidator('node out/cli-chevrotain-v2.js', filePath);
        const currentResult = runValidator('node out/cli-final.cjs', filePath);
        
        if (chevrotainResult === currentResult && chevrotainResult === 'INVALID') {
            results.invalid.match++;
            console.log(`  ✅ ${file}: Both say INVALID`);
        } else {
            results.invalid.mismatch.push({ file, chevrotain: chevrotainResult, current: currentResult });
            console.log(`  ❌ ${file}: Chevrotain=${chevrotainResult}, Current=${currentResult}`);
        }
    });
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Valid diagrams:   ${results.valid.match}/${validFiles.length} match`);
    console.log(`Invalid diagrams: ${results.invalid.match}/${invalidFiles.length} match`);
    
    const totalFiles = validFiles.length + invalidFiles.length;
    const totalMatch = results.valid.match + results.invalid.match;
    const accuracy = (totalMatch / totalFiles * 100).toFixed(1);
    
    console.log(`\nOverall accuracy: ${accuracy}% (${totalMatch}/${totalFiles})`);
    
    if (results.valid.mismatch.length > 0) {
        console.log('\nMismatches in VALID diagrams:');
        results.valid.mismatch.forEach(m => {
            console.log(`  - ${m.file}: Chevrotain=${m.chevrotain}, Current=${m.current}`);
        });
    }
    
    if (results.invalid.mismatch.length > 0) {
        console.log('\nMismatches in INVALID diagrams:');
        results.invalid.mismatch.forEach(m => {
            console.log(`  - ${m.file}: Chevrotain=${m.chevrotain}, Current=${m.current}`);
        });
    }
}

compareValidators();