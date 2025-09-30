# Development Guide

This guide covers all development workflows for the Maid project.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Testing Workflows](#testing-workflows)
4. [Linter Comparison Process](#linter-comparison-process)
5. [Adding New Test Cases](#adding-new-test-cases)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Release Process](#release-process)

## Architecture Overview

```
maid/
├── src/
│   ├── core/
│   │   ├── router.ts          # Detects diagram type and routes
│   │   └── types.ts           # Shared types
│   ├── diagrams/
│   │   ├── flowchart/         # Flowchart lexer/parser/validate
│   │   └── pie/               # Pie lexer/parser/validate
│   └── cli.ts                 # CLI implementation
├── out/                       # Compiled output (gitignored)
├── test-fixtures/             # Test cases
│   ├── flowchart/
│   │   ├── valid/             # Should pass validation
│   │   ├── invalid/           # Should fail validation
│   │   ├── VALID_DIAGRAMS.md  # Visual preview of valid
│   │   └── INVALID_DIAGRAMS.md# Visual preview of invalid
│   └── pie/
│       ├── valid/
│       └── invalid/
└── scripts/
    ├── test-chevrotain.js     # Test runner (flowchart)
    ├── compare-linters.js     # mermaid-cli comparison
    ├── generate-preview.js    # Generate markdown previews
    └── generate-invalid-preview.js
```

## Development Setup

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/probelabs/maid.git
cd maid

# Install dependencies
npm install

# Build the project
npm run build
```

### Build Process

Build and type-check TypeScript sources:

```bash
npm run build
```

This compiles `src/*.ts` to `out/*.js` (ESM) and generates type maps.

## Testing Workflows

### Quick Test

Run the standard test suite:
```bash
npm test
```

This runs `scripts/test-linter.js` which:
- Tests all valid fixtures (should pass)
- Tests all invalid fixtures (should fail)
- Reports accuracy percentage

### Individual File Testing

Test a single diagram:
```bash
node out/cli.js test-fixtures/flowchart/valid/simple-flow.mmd
```

Expected output for valid:
```
Valid
```

Expected output for invalid:
```
Found 1 error(s) in test-fixtures/flowchart/invalid/missing-arrow.mmd:

error: test-fixtures/flowchart/invalid/missing-arrow.mmd:2:1 - Missing arrow between nodes
```

### Batch Testing

Test all valid diagrams:
```bash
npm run lint:valid
```

Test all invalid diagrams:
```bash
npm run lint:invalid
```

## Linter Comparison Process

### Overview

We maintain 100% compatibility with mermaid-cli through automated comparison testing.

### Running Comparison

```bash
npm run test:compare
```

This executes `scripts/compare-linters.js` which:

1. **For each test fixture:**
   - Runs mermaid-cli (official)
   - Runs our linter
   - Compares results

2. **Output format:**
   ```
   Testing: valid/simple-flow.mmd
   ──────────────────────────────
   ✓ MATCH - Both linters agree: VALID
   
   Testing: invalid/missing-arrow.mmd
   ──────────────────────────────
   ✓ MATCH - Both linters agree: INVALID
   ```

3. **Mismatch handling:**
   ```
   ✗ MISMATCH
   Mermaid CLI: VALID
   Our Linter:  INVALID
   Mermaid error: [error details]
   Our linter output: [output details]
   ```

### Comparison Algorithm

```javascript
// Simplified comparison logic
function compareResults(file, mermaidResult, ourResult) {
  const match = mermaidResult.valid === ourResult.valid;
  
  if (match) {
    console.log('✓ MATCH - Both agree:', mermaidResult.valid ? 'VALID' : 'INVALID');
  } else {
    console.log('✗ MISMATCH');
    // Show detailed differences
  }
  
  return match;
}
```

### Understanding Mismatches

Common reasons for mismatches:

1. **mermaid-cli quirks:**
   - Escaped quotes (`\"`) not supported in node labels
   - Auto-creates undefined nodes
   - Allows nodes without connections

2. **Version differences:**
   - Different mermaid-cli versions may have different validation

3. **Timeout issues:**
   - mermaid-cli uses Puppeteer which can hang

## Adding New Test Cases

### Step 1: Create the Test File

Add `.mmd` file to appropriate directory:
```bash
# For valid diagram
echo "flowchart TD\n    A --> B" > test-fixtures/flowchart/valid/new-test.mmd

# For invalid diagram  
echo "flowchart XY\n    A --> B" > test-fixtures/flowchart/invalid/bad-direction.mmd
```

### Step 2: Test Locally

```bash
# Test with our linter
node out/cli.js test-fixtures/flowchart/valid/new-test.mmd

# Test with mermaid-cli
npx @mermaid-js/mermaid-cli -i test-fixtures/flowchart/valid/new-test.mmd -o /tmp/test.svg
```

### Step 3: Run Comparison

```bash
npm run test:compare
```

### Step 4: Update Documentation

Regenerate preview files:
```bash
npm run generate:previews
```

This updates:
- `test-fixtures/flowchart/VALID_DIAGRAMS.md`
- `test-fixtures/flowchart/INVALID_DIAGRAMS.md`

### Step 5: Verify Accuracy

```bash
npm test
```

Ensure we maintain 100% accuracy.

## CI/CD Pipeline

### GitHub Actions Workflow

Located in `.github/workflows/test.yml`

#### Test Matrix

Runs on:
- Node.js: 18.x, 20.x, 22.x
- OS: Ubuntu latest

#### Pipeline Steps

1. **Setup**
   ```yaml
   - uses: actions/checkout@v4
   - uses: actions/setup-node@v4
   ```

2. **Build**
   ```yaml
   - run: npm ci
   - run: npm run build
   ```

3. **Test**
   ```yaml
   - run: npm test
   - run: Test individual fixtures
   ```

4. **Optional Comparison**
   ```yaml
   - run: npm run test:compare
     continue-on-error: true
   ```

### Running CI Locally

Simulate CI environment:
```bash
# Clean install
rm -rf node_modules out/
npm ci

# Full build
npm run build

# Run all tests
npm test
npm run lint:valid
npm run lint:invalid
```

## Debugging

### Common Issues

#### 1. Build Failures

```bash
# Clean generated files
rm -rf src/generated out/

# Rebuild
npm run build
```

#### 2. Test Failures

Check specific file:
```bash
# See exact output
node out/cli.js test-fixtures/flowchart/valid/problem-file.mmd

# Compare with mermaid-cli
npx @mermaid-js/mermaid-cli -i test-fixtures/flowchart/valid/problem-file.mmd -o /tmp/test.svg
```

#### 3. TypeScript Errors

```bash
# Type check only
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/cli.ts
```

### Debugging Tips

1. **Test regex patterns:**
   ```bash
   node -e "console.log('flowchart TD'.match(/^\s*(graph|flowchart)\s/))"
   ```

## Performance Testing

### Benchmark Suite

```bash
# Time single file
time node out/cli.js test-fixtures/flowchart/valid/complex-shapes.mmd

# Time all files
time npm test

# Compare with mermaid-cli
time npx @mermaid-js/mermaid-cli -i test-fixtures/flowchart/valid/complex-shapes.mmd -o /tmp/test.svg
```

### Expected Performance

- Single file: < 50ms
- Full test suite: < 1s
- mermaid-cli comparison: 10-20s (due to Puppeteer)

## Release Process

### Version Bump

```bash
# Patch release (1.0.0 -> 1.0.1)
npm version patch

# Minor release (1.0.0 -> 1.1.0)
npm version minor

# Major release (1.0.0 -> 2.0.0)
npm version major
```

### Pre-release Checklist

- [ ] All tests pass: `npm test`
- [ ] 100% accuracy: Check test output
- [ ] Documentation updated: README.md, DEVELOPMENT.md
- [ ] Preview files current: `npm run generate:previews`
- [ ] CI passing: Check GitHub Actions

### Publish

```bash
npm publish
```

## Contributing

### Code Style

- Use TypeScript for new features
- CommonJS for CLI implementation
- ES modules for scripts
- Clear error messages with line/column

### Commit Convention

```
feat: Add new validation rule
fix: Correct bracket matching logic
docs: Update development guide
test: Add edge case for unicode
ci: Update Node.js versions
```

### PR Requirements

1. All tests must pass
2. Maintain 100% accuracy
3. Update test fixtures if needed
4. Regenerate previews
5. Update documentation

## Support

- GitHub Issues: Bug reports and features
- Discussions: Questions and ideas
- PR Reviews: Usually within 48 hours

---

Last updated: 2024
