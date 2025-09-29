# Mermaid Lint

A lightweight Mermaid diagram linter built with Langium that detects common syntax errors in flowchart/graph diagrams.

## Features

This linter specifically checks for:
- **Problematic HTML entities** (`&apos;`) - should use `&#39;` instead
- **Nested unescaped quotes** in node labels
- **Double-encoded HTML entities** (`&amp;#39;`, `&amp;quot;`)
- **Invalid arrow syntax** - missing pipe separators for link text
- **Unclosed subgraphs** - mismatched `subgraph`/`end` keywords
- **Basic structure validation** - ensures diagram starts with `graph` or `flowchart`

## Installation

```bash
cd npm/mermaid-lint
npm install
npm run build
```

## Usage

```bash
# Check a file
node out/cli.js diagram.mmd

# Read from stdin
cat diagram.mmd | node out/cli.js -

# Show help
node out/cli.js --help
```

## Example Output

```
Found 4 issue(s) in test-diagram.mmd:

error: test-diagram.mmd:12:61 - Found '&apos;' HTML entity. Use &#39; or escape quotes properly
warning: test-diagram.mmd:7:34 - Link text must be enclosed in pipes: |text|
```

## Technical Details

This linter uses:
- **Langium** - A language engineering toolkit for creating domain-specific languages
- Custom **Langium grammar** (`src/flowchart.langium`) defining Mermaid flowchart syntax
- **Regex-based validation** for detecting common HTML entity issues
- **TypeScript** for the CLI implementation

The Langium grammar provides basic parsing capabilities for flowchart diagrams, while additional validation rules catch specific issues that commonly cause problems in Mermaid renderers (especially on GitHub).

## Limitations

Currently only supports:
- `graph` and `flowchart` diagram types
- Basic node shapes (square brackets, round brackets, diamonds, etc.)
- Links with arrows (`-->`, `---`, `==>`, etc.)
- Subgraphs
- Comments (`%%`)

Does not yet support:
- Sequence diagrams
- Class diagrams
- State diagrams
- Other Mermaid diagram types

## Development

To modify the grammar:
1. Edit `src/flowchart.langium`
2. Run `npm run langium:generate` to regenerate the parser
3. Run `npm run build` to compile TypeScript

The validation logic is in `src/cli.ts` and can be extended with additional checks.