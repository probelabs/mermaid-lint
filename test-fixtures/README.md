# Mermaid Linter Test Fixtures

This directory contains comprehensive test fixtures for validating the Mermaid linter's behavior against the official mermaid-cli.

## 📊 Visual Previews

View all test fixtures rendered in markdown:

### Flowchart Diagrams
- 📗 [**Valid Flowchart Diagrams**](./flowchart/VALID_DIAGRAMS.md) - 17 diagrams that render correctly on GitHub
- 📕 [**Invalid Flowchart Diagrams**](./flowchart/INVALID_DIAGRAMS.md) - 13 diagrams with documented syntax errors

## Structure

```
test-fixtures/
└── flowchart/
    ├── valid/      # Diagrams that should pass validation
    └── invalid/    # Diagrams that should fail validation
```

## Running Tests

### Quick Test
```bash
# Run the main test suite
npm test

# Compare with official mermaid-cli
npm run test:compare
```

### Individual Tests
```bash
# Test a specific file
node out/cli.js test-fixtures/flowchart/valid/simple-flow.mmd

# Test all valid diagrams
npm run lint:valid

# Test all invalid diagrams (should fail)
npm run lint:invalid
```

## Test Coverage

### Valid Diagrams (17 tests)
- Basic flow connections
- Complex node shapes (Stadium, Database, etc.)
- Multi-directional arrows
- Subgraphs and nesting
- Unicode and special characters
- Multi-line text
- Styling and classes
- Comments

### Invalid Diagrams (13 tests)
- Missing diagram type
- Invalid direction
- Wrong arrow syntax
- Unclosed brackets
- Invalid class syntax
- Duplicate subgraph IDs
- Empty diagrams
- Mismatched brackets

## Accuracy

Current accuracy: **100%**
- Valid diagrams: 17/17 passing
- Invalid diagrams: 13/13 correctly detected

## Adding New Tests

1. Add `.mmd` file to appropriate directory (valid/invalid)
2. Run `npm test` to verify
3. Run `npm run test:compare` to check against mermaid-cli
4. Regenerate preview markdown:
   ```bash
   node scripts/generate-preview.js flowchart
   node scripts/generate-invalid-preview.js flowchart
   ```
5. Commit the updated preview files
