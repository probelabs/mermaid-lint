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

function runMermaidCli(filepath) {
  try {
    execSync(`npx @mermaid-js/mermaid-cli -i "${filepath}" -o /tmp/test.svg`, {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 5000
    });
    return { valid: true, error: null };
  } catch (error) {
    return { 
      valid: false, 
      error: error.stderr || error.message 
    };
  } finally {
    // Clean up generated file if it exists
    try {
      fs.unlinkSync('/tmp/test.svg');
    } catch {}
  }
}

function runOurLinter(filepath) {
  try {
    execSync(`node ./out/cli.js "${filepath}"`, {
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '..'),
      timeout: 5000
    });
    return { valid: true, error: null };
  } catch (error) {
    const output = (error.stdout || '') + (error.stderr || '');
    return { 
      valid: false,
      error: output || error.message
    };
  }
}

function compareResults(file, mermaidResult, ourResult) {
  const filename = path.basename(file);
  const category = path.basename(path.dirname(file));
  
  console.log(`\n${colors.cyan}Testing: ${category}/${filename}${colors.reset}`);
  console.log('─'.repeat(50));
  
  const match = mermaidResult.valid === ourResult.valid;
  
  if (match) {
    console.log(`${colors.green}✓ MATCH${colors.reset} - Both linters agree: ${mermaidResult.valid ? 'VALID' : 'INVALID'}`);
  } else {
    console.log(`${colors.red}✗ MISMATCH${colors.reset}`);
    console.log(`  Mermaid CLI: ${mermaidResult.valid ? 'VALID' : 'INVALID'}`);
    console.log(`  Our Linter:  ${ourResult.valid ? 'VALID' : 'INVALID'}`);
    
    if (mermaidResult.error) {
      console.log(`${colors.yellow}  Mermaid error:${colors.reset}`);
      console.log('    ' + mermaidResult.error.split('\n').join('\n    '));
    }
    
    if (ourResult.error) {
      console.log(`${colors.yellow}  Our linter output:${colors.reset}`);
      console.log('    ' + ourResult.error.split('\n').join('\n    '));
    }
  }
  
  return match;
}

async function main() {
  const fixturesDir = path.resolve(__dirname, '..', 'test-fixtures');
  const diagramType = process.argv[2] || 'flowchart';
  const typeDir = path.join(fixturesDir, diagramType);
  
  if (!fs.existsSync(typeDir)) {
    console.error(`No fixtures found for diagram type: ${diagramType}`);
    process.exit(1);
  }
  
  console.log(`${colors.blue}Comparing linters for ${diagramType} diagrams...${colors.reset}`);
  console.log('═'.repeat(50));
  
  let totalTests = 0;
  let matchingResults = 0;
  let results = {
    valid: { matches: 0, mismatches: 0, files: [] },
    invalid: { matches: 0, mismatches: 0, files: [] }
  };
  
  // Test valid diagrams
  const validDir = path.join(typeDir, 'valid');
  if (fs.existsSync(validDir)) {
    const validFiles = fs.readdirSync(validDir)
      .filter(f => f.endsWith('.mmd'))
      .map(f => path.join(validDir, f));
    
    for (const file of validFiles) {
      totalTests++;
      const mermaidResult = runMermaidCli(file);
      const ourResult = runOurLinter(file);
      const match = compareResults(file, mermaidResult, ourResult);
      
      if (match) {
        matchingResults++;
        results.valid.matches++;
      } else {
        results.valid.mismatches++;
        results.valid.files.push(path.basename(file));
      }
    }
  }
  
  // Test invalid diagrams
  const invalidDir = path.join(typeDir, 'invalid');
  if (fs.existsSync(invalidDir)) {
    const invalidFiles = fs.readdirSync(invalidDir)
      .filter(f => f.endsWith('.mmd'))
      .map(f => path.join(invalidDir, f));
    
    for (const file of invalidFiles) {
      totalTests++;
      const mermaidResult = runMermaidCli(file);
      const ourResult = runOurLinter(file);
      const match = compareResults(file, mermaidResult, ourResult);
      
      if (match) {
        matchingResults++;
        results.invalid.matches++;
      } else {
        results.invalid.mismatches++;
        results.invalid.files.push(path.basename(file));
      }
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`${colors.blue}SUMMARY${colors.reset}`);
  console.log('─'.repeat(50));
  console.log(`Total tests: ${totalTests}`);
  console.log(`Matching results: ${matchingResults}/${totalTests} (${Math.round(matchingResults/totalTests*100)}%)`);
  
  if (results.valid.matches + results.valid.mismatches > 0) {
    console.log(`\nValid diagrams:`);
    console.log(`  Matches: ${results.valid.matches}`);
    if (results.valid.mismatches > 0) {
      console.log(`  Mismatches: ${results.valid.mismatches} (${results.valid.files.join(', ')})`);
    }
  }
  
  if (results.invalid.matches + results.invalid.mismatches > 0) {
    console.log(`\nInvalid diagrams:`);
    console.log(`  Matches: ${results.invalid.matches}`);
    if (results.invalid.mismatches > 0) {
      console.log(`  Mismatches: ${results.invalid.mismatches} (${results.invalid.files.join(', ')})`);
    }
  }
  
  process.exit(matchingResults === totalTests ? 0 : 1);
}

main().catch(console.error);
