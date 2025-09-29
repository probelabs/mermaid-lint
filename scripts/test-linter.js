#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function testLinter(filepath) {
  try {
    const output = execSync(`node ./out/cli-final.cjs "${filepath}"`, {
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '..'),
      timeout: 5000
    });
    
    // Check for errors or warnings in output
    const hasError = output.includes('error');
    const hasWarning = output.includes('warning');
    
    return { 
      valid: !hasError, 
      hasWarning,
      output: output.trim()
    };
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    const hasError = output.includes('error');
    const hasWarning = output.includes('warning');
    
    return { 
      valid: !hasError,
      hasWarning,
      output: output.trim()
    };
  }
}

async function main() {
  const fixturesDir = path.resolve(__dirname, '..', 'test-fixtures');
  const diagramType = process.argv[2] || 'flowchart';
  const typeDir = path.join(fixturesDir, diagramType);
  
  if (!fs.existsSync(typeDir)) {
    console.error(`No fixtures found for diagram type: ${diagramType}`);
    process.exit(1);
  }
  
  console.log(`${colors.blue}Testing our linter for ${diagramType} diagrams...${colors.reset}`);
  console.log('═'.repeat(50));
  
  let stats = {
    valid: { passed: 0, failed: 0, warnings: 0 },
    invalid: { passed: 0, failed: 0 }
  };
  
  // Test valid diagrams
  const validDir = path.join(typeDir, 'valid');
  if (fs.existsSync(validDir)) {
    console.log(`\n${colors.cyan}Valid diagrams:${colors.reset}`);
    const validFiles = fs.readdirSync(validDir)
      .filter(f => f.endsWith('.mmd'))
      .sort();
    
    for (const file of validFiles) {
      const filepath = path.join(validDir, file);
      const result = testLinter(filepath);
      
      const status = result.valid 
        ? (result.hasWarning ? `${colors.yellow}⚠${colors.reset}` : `${colors.green}✓${colors.reset}`)
        : `${colors.red}✗${colors.reset}`;
      
      console.log(`  ${status} ${file.padEnd(30)} ${result.valid ? 'Valid' : 'Invalid'} ${result.hasWarning ? '(with warnings)' : ''}`);
      
      if (!result.valid || result.hasWarning) {
        const lines = result.output.split('\n').slice(0, 3);
        lines.forEach(line => console.log(`      ${colors.yellow}${line}${colors.reset}`));
      }
      
      if (result.valid) {
        stats.valid.passed++;
        if (result.hasWarning) stats.valid.warnings++;
      } else {
        stats.valid.failed++;
      }
    }
  }
  
  // Test invalid diagrams
  const invalidDir = path.join(typeDir, 'invalid');
  if (fs.existsSync(invalidDir)) {
    console.log(`\n${colors.cyan}Invalid diagrams:${colors.reset}`);
    const invalidFiles = fs.readdirSync(invalidDir)
      .filter(f => f.endsWith('.mmd'))
      .sort();
    
    for (const file of invalidFiles) {
      const filepath = path.join(invalidDir, file);
      const result = testLinter(filepath);
      
      const shouldBeInvalid = !result.valid;
      const status = shouldBeInvalid 
        ? `${colors.green}✓${colors.reset}`
        : `${colors.red}✗${colors.reset}`;
      
      console.log(`  ${status} ${file.padEnd(30)} ${result.valid ? 'Valid (should be invalid!)' : 'Invalid (correct)'}`);
      
      if (result.valid) {
        // This should have been invalid
        stats.invalid.failed++;
      } else {
        stats.invalid.passed++;
        // Show the error
        const lines = result.output.split('\n').slice(0, 2);
        lines.forEach(line => console.log(`      ${colors.yellow}${line}${colors.reset}`));
      }
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`${colors.blue}SUMMARY${colors.reset}`);
  console.log('─'.repeat(50));
  console.log(`Valid diagrams:`);
  console.log(`  Passed: ${stats.valid.passed}/${stats.valid.passed + stats.valid.failed}`);
  console.log(`  With warnings: ${stats.valid.warnings}`);
  console.log(`  Failed: ${stats.valid.failed}`);
  
  console.log(`\nInvalid diagrams:`);
  console.log(`  Correctly detected: ${stats.invalid.passed}/${stats.invalid.passed + stats.invalid.failed}`);
  console.log(`  Missed (false positives): ${stats.invalid.failed}`);
  
  const allPassed = stats.valid.failed === 0 && stats.invalid.failed === 0;
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);