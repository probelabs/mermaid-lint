# @probelabs/maid-mcp

Model Context Protocol (MCP) server for Mermaid diagram validation using [Maid](https://github.com/probelabs/maid).

## Installation

```bash
npm install @probelabs/maid-mcp
```

This package has a peer dependency on `@probelabs/maid`, which you'll need to install separately:

```bash
npm install @probelabs/maid
```

## Usage

### As an MCP Server

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "maid": {
      "command": "npx",
      "args": ["@probelabs/maid-mcp"]
    }
  }
}
```

Or if installed globally:

```bash
npm install -g @probelabs/maid-mcp @probelabs/maid
```

Then use `maid-mcp` as the command in your MCP configuration.

## Features

- **validate_mermaid** tool: Validates and auto-fixes Mermaid diagrams
  - Accepts raw Mermaid syntax or Markdown with code blocks
  - Automatic error detection and fixing
  - Supports flowchart, sequence, pie, class, and state diagrams
  - Returns detailed validation results with line/column positions

## Why a separate package?

The MCP SDK adds ~11 MB to the package size. By splitting MCP functionality into a separate package, users who only need the core Maid validator can avoid this dependency.

## License

ISC
