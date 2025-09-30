# Maid

Fast, accurate Mermaid diagram validator with 100% compatibility with mermaid-cli.

## Why Maid?

Stop pushing broken diagrams to production. This linter catches syntax errors before they break your documentation.

- **🚀 Fast** - Validates diagrams in milliseconds
- **✅ Accurate** - 100% compatibility with official mermaid-cli
- **🎯 Comprehensive** - 30+ test cases covering all edge cases
- **🔧 Developer-friendly** - Clear error messages with line numbers

## Quick Start

```bash
# Install
npm install -D maid

# Validate a diagram
npx maid diagram.mmd

# Validate from stdin
cat diagram.mmd | npx maid -

# Validate a Markdown file with multiple diagrams
npx maid README.md

# Lint all docs in a directory (recursively)
npx maid docs/

Exit codes:
- 0 when no errors are found across all files.
- 1 when any error is found (warnings do not affect the exit code).

### Directory Scans: Includes, Excludes, and .gitignore

By default, Maid respects your repository’s `.gitignore` when scanning a directory. You can tailor which files are checked using glob patterns:

- Include globs: `--include` or `-I` (repeatable or comma-separated)
- Exclude globs: `--exclude` or `-E` (repeatable or comma-separated)
- Disable `.gitignore`: `--no-gitignore`

Examples:

```bash
# Scan docs/, respecting .gitignore (default)
npx maid docs/

# Only Markdown and Mermaid files inside docs/content
npx maid docs/ -I "docs/content/**/*.md,docs/content/**/*.mmd"

# Exclude legacy docs folder and draft files
npx maid docs/ -E "docs/legacy/**" -E "**/*.draft.md"

# Do not respect .gitignore (e.g., scan everything including ignored files)
npx maid docs/ --no-gitignore

# JSON report for CI
npx maid --format json -I "**/*.mdx" -E "**/node_modules/**" docs/
```

# Run tests
npm test
```

## Supported Diagrams

- Flowchart (`flowchart`, `graph`)
- Pie (`pie`)
- Sequence (`sequenceDiagram`)

## What It Catches

### ❌ Common Errors
- Invalid arrow syntax (`->` instead of `-->`)
- Unclosed brackets and mismatched node shapes
- Invalid directions (must be TD, TB, BT, RL, LR)
- Missing diagram type declaration
- Malformed class and subgraph syntax

### ⚠️ Best Practice Warnings
- Link text without proper pipe delimiters
- Empty diagrams
- Problematic HTML entities

## Testing & Validation

We maintain 100% accuracy with mermaid-cli through comprehensive testing:

```bash
# Run test suite
npm test

# Compare with mermaid-cli
npm run test:compare

# Generate visual previews
npm run generate:previews
```

### Test Coverage
- Flowchart: [20 valid](./test-fixtures/flowchart/VALID_DIAGRAMS.md) • [16 invalid](./test-fixtures/flowchart/INVALID_DIAGRAMS.md)
- Pie: [4 valid](./test-fixtures/pie/VALID_DIAGRAMS.md) • [6 invalid](./test-fixtures/pie/INVALID_DIAGRAMS.md)
- Sequence: [13 valid](./test-fixtures/sequence/VALID_DIAGRAMS.md) • [12 invalid](./test-fixtures/sequence/INVALID_DIAGRAMS.md)
- 100% accuracy against mermaid-cli on fixtures

## Diagram Type Coverage (Mermaid vs Maid)

As of 2025-09-29, Mermaid 11.x documents support for the following diagram types. Items marked experimental/beta indicate syntax may change. References: Mermaid docs pages for each diagram type.

- Flowchart — stable. We support now. [Docs]
- Sequence diagram — stable. We support now. [Docs]
- Class diagram — stable. Planned. [Docs]
- State diagram — stable. Planned. [Docs]
- Entity Relationship (ER) — experimental. Planned. [Docs]
- Gantt — stable. Planned. [Docs]
- User Journey — stable. Planned. [Docs]
- GitGraph — stable. Planned. [Docs]
- Pie chart — stable. We support now. [Docs]
- Mindmap — stable (icon integration experimental). Planned. [Docs]
- Timeline — stable (icon integration experimental). Planned. [Docs]
- Quadrant Chart — stable. Planned. [Docs]
- XY Chart (bar, line) — stable in 11.x. Planned. [Docs]
- Requirement Diagram — stable (SysML v1.6). Planned. [Docs]
- C4 — experimental/subject to change. Planned. [Docs]
- Sankey — experimental. Planned. [Docs]
- Block Diagram — new. Planned. [Docs]
- Treemap — beta/new. Planned. [Docs]

Notes
- We validate against `@mermaid-js/mermaid-cli` v11.12.0 (see `package.json`).
- When Mermaid returns an “error SVG” instead of a non‑zero exit code, our preview scripts detect and surface the actual error text for parity.

[Docs]: https://mermaid.js.org/

## Testing / CI

- Baseline tests (flowchart): a fast harness that runs Maid over curated valid/invalid fixtures and expects 100% pass/fail parity with our intended behavior. In CI this step is labeled “Run linter tests (flowchart baseline)”.
  - Command: `npm test` (runs `scripts/test-chevrotain.js`).

- Error-code assertions (all types): verifies that each invalid fixture surfaces the expected stable error codes across flowchart, pie, and sequence.
  - Command: `npm run test:errors:all`.

- Compare with mermaid-cli: runs mermaid-cli on all fixtures and checks overall VALID/INVALID parity with Maid. This intentionally prints differences but does not fail the job.
  - Commands: `node scripts/compare-linters.js flowchart|pie|sequence`.

These layers give confidence in correctness (baseline), diagnostic quality (error codes), and compatibility with the reference renderer (mermaid-cli comparison).

## Error Codes

Diagnostics include stable error codes and hints for quick fixes. See the full list in [docs/errors.md](./docs/errors.md).

### CLI Output Formats

- Text (default): caret-underlined snippet style with codes, hints, and precise spans.
- JSON: machine-readable report for editors/CI.

```bash
# Text (default)
npx maid diagram.mmd

# JSON
npx maid --format json diagram.mmd
```

### Strict Mode

Enable strict mode to require quoted labels inside shapes (e.g., `[ ... ]`, `{ ... }`, `( ... )`).

```bash
npx maid --strict diagram.mmd
```

In strict mode, unquoted labels are flagged with `FL-STRICT-LABEL-QUOTES-REQUIRED`. Use double quotes and `&quot;` for inner quotes.

## Scanning Markdown and Directories

Maid validates:
- Standalone Mermaid files (`.mmd`, `.mermaid`).
- Markdown files with one or more Mermaid code fences (```mermaid, ```mmd, or ~~~mermaid).
- Entire directories (recursively), finding Markdown/Mermaid files and validating all embedded diagrams.

Behavior
- Keeps precise line/column positions relative to the original Markdown file by offsetting diagnostics from each fenced block.
- “No Mermaid diagrams found” is considered success (exit code 0). Text mode prints a short note; JSON includes `diagramCount: 0`.
- Exit code is 1 only when errors are present. Warnings do not fail.

### CLI Options

- `--format`, `-f` text|json
  - text: human-readable snippets with carets (default)
  - json: machine-readable output for CI/editors
- `--strict`, `-s`
  - Require quoted labels inside shapes; emits `FL-STRICT-LABEL-QUOTES-REQUIRED` when violated.
- Directory scan flags:
  - `--include`, `-I` Glob(s) to include (repeatable or comma‑separated)
  - `--exclude`, `-E` Glob(s) to exclude (repeatable or comma‑separated)
  - `--no-gitignore` Do not respect `.gitignore` (default is to respect it)

Examples

```bash
# Validate Markdown containing multiple diagrams
npx maid README.md

# Lint all docs, respecting .gitignore
npx maid docs/

# Only Markdown/Mermaid under docs/content
npx maid docs/ -I "docs/content/**/*.md,docs/content/**/*.mmd"

# Exclude legacy docs and any *.draft.md files
npx maid docs/ -E "docs/legacy/**" -E "**/*.draft.md"

# Disable .gitignore filtering
npx maid docs/ --no-gitignore

# JSON report for CI
npx maid --format json docs/
```

### JSON Output

Single file (diagram or Markdown):

```json
{
  "file": "README.md",
  "valid": false,
  "errorCount": 1,
  "warningCount": 0,
  "diagramCount": 1,
  "errors": [
    { "line": 12, "column": 3, "severity": "error", "code": "SE-AND-OUTSIDE-PAR", "message": "…" }
  ],
  "warnings": []
}
```

Directory scan:

```json
{
  "valid": false,
  "errorCount": 2,
  "warningCount": 1,
  "diagramCount": 5,
  "files": [
    { "file": "docs/good.md", "valid": true,  "errorCount": 0, "warningCount": 0, "errors": [], "warnings": [] },
    { "file": "docs/bad.md",  "valid": false, "errorCount": 2, "warningCount": 1, "errors": [ … ], "warnings": [ … ] }
  ]
}
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Validate Mermaid Diagrams
  run: |
    npm install -D maid
    find . -name "*.mmd" -exec npx maid {} \;
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit
files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.mmd$')
if [ -n "$files" ]; then
  for file in $files; do
    npx maid "$file" || exit 1
  done
fi
```

## Architecture

Built with modern tooling for reliability and performance:

- **[Chevrotain](https://chevrotain.io/)** - Fast, flexible tokenizer and parser for accurate syntax validation
- **TypeScript** - Type-safe implementation with great IDE support
- **Automated Testing** - GitHub Actions CI on every commit

### Project Structure
```
├── src/
│   ├── core/
│   │   ├── router.ts         # Detects diagram type and routes
│   │   └── types.ts          # Shared types
│   ├── diagrams/
│   │   ├── flowchart/        # Flowchart lexer/parser/validation
│   │   └── pie/              # Pie lexer/parser/validation
│   └── cli.ts                # CLI implementation
├── test-fixtures/
│   ├── flowchart/
│   │   ├── valid/
│   │   └── invalid/
│   └── pie/
│       └── valid/
└── scripts/
    ├── test-chevrotain.js    # Test runner
    ├── test-linter.js        # Alternate test runner
    └── compare-linters.js    # mermaid-cli comparison
```

## Development

### Build from Source

```bash
# Clone repository
git clone https://github.com/yourusername/maid.git
cd maid

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

### Extending the Linter

1. Add a new module: `src/diagrams/<type>/{lexer.ts,parser.ts,validate.ts}`
2. Register in `src/core/router.ts` via header detection
3. Add fixtures under `test-fixtures/<type>/{valid,invalid}`
4. Build and verify: `npm run build && node scripts/compare-linters.js <type>`
5. Regenerate previews: `node scripts/generate-preview.js <type>`

## Roadmap

- [x] Support for pie charts
- [ ] Support for sequence diagrams
- [ ] Support for class diagrams
- [ ] Support for state diagrams
- [ ] VS Code extension
- [ ] ESLint plugin
- [ ] Online playground

## Edge Cases Covered

- Flowchart:
  - Escaped quotes in labels (rejected)
  - Double quotes inside single-quoted labels (rejected, mermaid-compat)
  - Mismatched quotes inside labels (accepted, mermaid-compat)
  - Link text outside pipes triggers warnings
- Pie:
  - Labels must be quoted (single or double quotes)
  - Colon and numeric value are required for each slice
  - `title` without colon is accepted (e.g., `title "Pets"`); `title:` is rejected by current mermaid-cli
  - Current mermaid-cli may emit an error SVG instead of failing the process; our preview scripts detect this and surface the error text

## Contributing

We welcome contributions! Please ensure:

1. All tests pass: `npm test`
2. 100% mermaid-cli compatibility: `npm run test:compare`
3. Update test fixtures if needed
4. Regenerate previews: `npm run generate:previews`

## License

MIT

---

Built with ❤️ for developers who care about documentation quality.
