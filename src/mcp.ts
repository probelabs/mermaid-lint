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
const ValidateDiagramSchema = z.object({
  content: z.string().describe('The Mermaid diagram content to validate'),
  strict: z.boolean().optional().describe('Enable strict mode (require quoted labels inside shapes)'),
});

const FixDiagramSchema = z.object({
  content: z.string().describe('The Mermaid diagram content to fix'),
  level: z.enum(['safe', 'all']).optional().describe('Fix level: "safe" (default) applies only safe fixes, "all" applies all fixes including heuristics'),
  strict: z.boolean().optional().describe('Enable strict mode for validation'),
});

const DetectDiagramTypeSchema = z.object({
  content: z.string().describe('The content to analyze for diagram type'),
});

const ValidateMarkdownSchema = z.object({
  content: z.string().describe('Markdown content containing ```mermaid fenced code blocks'),
  strict: z.boolean().optional().describe('Enable strict mode for validation'),
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
          'Validate a Mermaid diagram and return any syntax errors or warnings. ' +
          'Supports flowchart, pie, and sequence diagrams.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The Mermaid diagram content to validate',
            },
            strict: {
              type: 'boolean',
              description: 'Enable strict mode (require quoted labels inside shapes)',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'fix_mermaid',
        description:
          'Automatically fix common syntax errors in a Mermaid diagram. ' +
          'Returns the fixed diagram content along with any remaining errors.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The Mermaid diagram content to fix',
            },
            level: {
              type: 'string',
              enum: ['safe', 'all'],
              description:
                'Fix level: "safe" (default) applies only safe fixes, "all" applies all fixes including heuristics',
            },
            strict: {
              type: 'boolean',
              description: 'Enable strict mode for validation',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'detect_diagram_type',
        description:
          'Detect the type of Mermaid diagram from the content. ' +
          'Returns the diagram type (flowchart, pie, sequence, or unknown).',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content to analyze for diagram type',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'validate_markdown',
        description:
          'Validate all Mermaid diagrams within a Markdown document. ' +
          'Extracts ```mermaid fenced code blocks and validates each one.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Markdown content containing ```mermaid fenced code blocks',
            },
            strict: {
              type: 'boolean',
              description: 'Enable strict mode for validation',
            },
          },
          required: ['content'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'validate_mermaid': {
          const parsed = ValidateDiagramSchema.parse(args);
          const result = validate(parsed.content, { strict: parsed.strict ?? false });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    valid: result.errors.length === 0,
                    diagramType: result.type,
                    errorCount: result.errors.filter((e) => e.severity === 'error').length,
                    warningCount: result.errors.filter((e) => e.severity === 'warning').length,
                    errors: result.errors,
                    formattedErrors: formatErrors(result.errors),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'fix_mermaid': {
          const parsed = FixDiagramSchema.parse(args);
          const level: FixLevel = parsed.level ?? 'safe';
          const { fixed, errors } = autoFixMultipass(
            parsed.content,
            parsed.strict ?? false,
            level
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    fixed,
                    valid: errors.length === 0,
                    errorCount: errors.filter((e) => e.severity === 'error').length,
                    warningCount: errors.filter((e) => e.severity === 'warning').length,
                    errors,
                    formattedErrors: formatErrors(errors),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'detect_diagram_type': {
          const parsed = DetectDiagramTypeSchema.parse(args);
          const diagramType = detectDiagramType(parsed.content);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ diagramType }, null, 2),
              },
            ],
          };
        }

        case 'validate_markdown': {
          const parsed = ValidateMarkdownSchema.parse(args);
          const blocks = extractMermaidBlocks(parsed.content);

          if (blocks.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      valid: true,
                      diagramCount: 0,
                      message: 'No Mermaid diagrams found in the markdown',
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          let allErrors: ValidationError[] = [];
          for (const block of blocks) {
            const { errors: blockErrors } = validate(block.content, {
              strict: parsed.strict ?? false,
            });
            if (blockErrors.length > 0) {
              allErrors = allErrors.concat(offsetErrors(blockErrors, block.startLine - 1));
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
                    formattedErrors: formatErrors(allErrors),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
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