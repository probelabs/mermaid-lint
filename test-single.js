import { execSync } from 'child_process';

const testFile = process.argv[2];
if (!testFile) {
  console.log('Usage: node test-single.js <file>');
  process.exit(1);
}

console.log(`Testing: ${testFile}`);
console.log('-'.repeat(50));

// Test with mermaid-cli
console.log('Mermaid CLI:');
try {
  execSync(`npx @mermaid-js/mermaid-cli -i "${testFile}" -o /tmp/test.svg`, {
    stdio: 'inherit',
    timeout: 5000
  });
  console.log('  ✓ Valid');
} catch (error) {
  console.log('  ✗ Invalid');
}

// Clean up
try { require('fs').unlinkSync('/tmp/test.svg'); } catch {}

// Test with our linter
console.log('\nOur Linter:');
try {
  execSync(`node ./bin/cli.js "${testFile}"`, {
    stdio: 'inherit',
    timeout: 5000
  });
} catch (error) {
  // Linter exits with error code
}