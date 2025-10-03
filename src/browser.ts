// Browser-specific entry point with minimal exports
// This reduces bundle size by only including what's needed for web usage

// Core types
export type {
  ValidationError,
  DiagramType,
  ValidateOptions,
  FixLevel,
} from './core/types.js';

// Main validation and fixing
export { validate, detectDiagramType } from './core/router.js';

// Auto-fixes - main browser use case
export { computeFixes } from './core/fixes.js';
export { applyEdits } from './core/edits.js';

// Renderer for browser
export { MermaidRenderer, renderMermaid } from './renderer/index.js';
export type { RenderOptions, RenderResult } from './renderer/index.js';
export type { Graph, Node, Edge, NodeShape, ArrowType, Direction } from './renderer/types.js';

// Mermaid.js-compatible API (drop-in replacement)
export { createMermaidAPI } from './mermaid-compat.js';
export type { MermaidAPI } from './mermaid-compat.js';

// Convenience function for browser - simplified version
import type { FixLevel, ValidateOptions as Opts, ValidationError } from './core/types.js';
import { validate as _validate } from './core/router.js';
import { computeFixes as _computeFixes } from './core/fixes.js';
import { applyEdits as _applyEdits } from './core/edits.js';

/**
 * Browser-friendly validation and auto-fix in one call
 */
export function fixText(text: string, options: Opts & { level?: FixLevel } = {}): { fixed: string; errors: ValidationError[] } {
  const { strict = false, level = 'safe' } = options as Opts & { level: FixLevel };
  let current = text;
  for (let i = 0; i < 5; i++) {
    const res = _validate(current, { strict });
    const edits = _computeFixes(current, res.errors, level);
    if (edits.length === 0) return { fixed: current, errors: res.errors };
    const next = _applyEdits(current, edits);
    if (next === current) return { fixed: current, errors: res.errors };
    current = next;
  }
  const finalRes = _validate(current, { strict });
  return { fixed: current, errors: finalRes.errors };
}

// Excluded from browser bundle:
// - textReport, toJsonResult (CLI formatting)
// - extractMermaidBlocks, offsetErrors (markdown processing - not needed in browser)
// - validateFlowchart, validatePie, validateSequence (internal, use validate() instead)
// - posToOffset, lineTextAt, inferIndentFromLine (editor utilities)