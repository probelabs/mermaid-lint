// Public SDK surface for programmatic use
// Re-export core types
export type {
  ValidationError,
  DiagramType,
  ValidateOptions,
  PositionLC,
  TextEditLC,
  FixLevel,
} from './core/types.js';

// Core validators and helpers
export { validate, detectDiagramType } from './core/router.js';
export { validateFlowchart } from './diagrams/flowchart/validate.js';
export { validatePie } from './diagrams/pie/validate.js';
export { validateSequence } from './diagrams/sequence/validate.js';

// Markdown utilities
export type { MermaidBlock } from './core/markdown.js';
export { extractMermaidBlocks, offsetErrors } from './core/markdown.js';

// Formatting and edits
export { textReport, toJsonResult } from './core/format.js';
export { applyEdits, posToOffset, lineTextAt, inferIndentFromLine } from './core/edits.js';

// Auto-fixes
export { computeFixes } from './core/fixes.js';

// Convenience: multi-pass fix for a single diagram string
import type { FixLevel, ValidateOptions as Opts, ValidationError } from './core/types.js';
import { validate as _validate } from './core/router.js';
import { computeFixes as _computeFixes } from './core/fixes.js';
import { applyEdits as _applyEdits } from './core/edits.js';

/**
 * Run validation and repeatedly apply computed fixes until stable (max 5 passes).
 * Returns the final fixed text and the remaining diagnostics after fixes.
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

