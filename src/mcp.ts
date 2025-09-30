#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { validate, detectDiagramType } from './core/router.js';
import { extractMermaidBlocks, offsetErrors } from './core/markdown.js';
import { computeFixes } from './core/fixes.js';
import { applyEdits } from './core/edits.js';
import type { ValidationError, FixLevel } from './core/types.js';

/**
 * MCP Server for Mermaid diagram validation
 * Provides tools for validating and fixing Mermaid diagrams
 */

// Input schemas using Zod
const ValidateMermaidSchema = z.object({
  text: z.string().describe('The Mermaid diagram text to validate, or Markdown content with ```mermaid blocks'),
  autofix: z.boolean().optional().describe('If true, automatically fix errors and return the corrected diagram'),
});

/**
 * Multi-pass auto-fix function
 */
function autoFixMultipass(
  text: string,
  strict: boolean,
  level: FixLevel
): { fixed: string; errors: ValidationError[] } {
  let current = text;
  for (let i = 0; i < 5; i++) {
    const res = validate(current, { strict });
    const edits = computeFixes(current, res.errors, level);
    if (edits.length === 0) return { fixed: current, errors: res.errors };
    const next = applyEdits(current, edits);
    if (next === current) return { fixed: current, errors: res.errors };
    current = next;
  }
  const finalRes = validate(current, { strict });
  return { fixed: current, errors: finalRes.errors };
}

/**
 * Format validation errors for display
 */
function formatErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return 'No errors found';

  return errors
    .map((err) => {
      const pos = `Line ${err.line}, Col ${err.column}`;
      const code = err.code ? `${err.code}: ` : '';
      return `[${err.severity.toUpperCase()}] ${code}${err.message} (${pos})`;
    })
    .join('\n');
}

/**
 * Start the MCP server
 */
async function startServer() {
  const server = new Server(
    {
      name: '@probelabs/maid',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'validate_mermaid',
        description:
          'Validate and auto-fix Mermaid diagrams before showing them to the user. Always use autofix=true to provide ' +
          'corrected diagrams proactively. Accepts raw Mermaid diagram text (e.g., "flowchart TD\\nA-->B") or ' +
          'Markdown with ```mermaid code blocks. Returns validation results with errors/warnings and the fixed diagram. ' +
          'Supports flowchart, sequence, and pie diagrams. Use this whenever users create, edit, or ask about Mermaid diagrams ' +
          'to ensure they see error-free, properly formatted diagrams.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Mermaid diagram text or Markdown content with ```mermaid blocks',
            },
            autofix: {
              type: 'boolean',
              description: 'Set to true to automatically fix syntax errors and return corrected diagram (recommended: always use true)',
            },
          },
          required: ['text'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'validate_mermaid') {
        const parsed = ValidateMermaidSchema.parse(args);
        const text = parsed.text;
        const autofix = parsed.autofix ?? false;

        // Check if input contains markdown blocks
        const blocks = extractMermaidBlocks(text);
        const isMarkdown = blocks.length > 0;

        if (isMarkdown) {
          // Handle Markdown with multiple diagrams
          if (autofix) {
            // Fix each block and reassemble
            const lines = text.split(/\r?\n/);
            let accLines = [...lines];
            for (const b of blocks) {
              const { fixed: fixedBlock } = autoFixMultipass(b.content, false, 'safe');
              if (fixedBlock !== b.content) {
                const realStart = b.startLine - 1;
                const realEnd = b.endLine - 2;
                const before = accLines.slice(0, realStart);
                const after = accLines.slice(realEnd + 1);
                const fixedLines = fixedBlock.split('\n');
                accLines = before.concat(fixedLines, after);
              }
            }
            const fixedText = accLines.join('\n');

            // Validate fixed content
            const newBlocks = extractMermaidBlocks(fixedText);
            let allErrors: ValidationError[] = [];
            for (const b of newBlocks) {
              const { errors: blockErrors } = validate(b.content, { strict: false });
              if (blockErrors.length > 0) {
                allErrors = allErrors.concat(offsetErrors(blockErrors, b.startLine - 1));
              }
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      fixed: fixedText,
                      valid: allErrors.length === 0,
                      diagramCount: newBlocks.length,
                      errorCount: allErrors.filter((e) => e.severity === 'error').length,
                      warningCount: allErrors.filter((e) => e.severity === 'warning').length,
                      errors: allErrors,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } else {
            // Just validate
            let allErrors: ValidationError[] = [];
            for (const b of blocks) {
              const { errors: blockErrors } = validate(b.content, { strict: false });
              if (blockErrors.length > 0) {
                allErrors = allErrors.concat(offsetErrors(blockErrors, b.startLine - 1));
              }
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      valid: allErrors.length === 0,
                      diagramCount: blocks.length,
                      errorCount: allErrors.filter((e) => e.severity === 'error').length,
                      warningCount: allErrors.filter((e) => e.severity === 'warning').length,
                      errors: allErrors,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }
        } else {
          // Handle single diagram
          const diagramType = detectDiagramType(text);

          if (autofix) {
            const { fixed, errors } = autoFixMultipass(text, false, 'safe');

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      fixed,
                      valid: errors.length === 0,
                      diagramType,
                      errorCount: errors.filter((e) => e.severity === 'error').length,
                      warningCount: errors.filter((e) => e.severity === 'warning').length,
                      errors,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } else {
            const result = validate(text, { strict: false });

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      valid: result.errors.length === 0,
                      diagramType: result.type,
                      errorCount: result.errors.filter((e) => e.severity === 'error').length,
                      warningCount: result.errors.filter((e) => e.severity === 'warning')
                        .length,
                      errors: result.errors,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }
        }
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid arguments: ${error.message}`);
      }
      throw error;
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr to avoid interfering with stdio transport
  console.error('Maid MCP server started');
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});