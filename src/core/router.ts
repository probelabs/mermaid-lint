import { ValidationError, DiagramType, ValidateOptions } from './types.js';
import { validateFlowchart } from '../diagrams/flowchart/validate.js';
import { validatePie } from '../diagrams/pie/validate.js';
import { validateSequence } from '../diagrams/sequence/validate.js';

function firstNonCommentLine(text: string): string | undefined {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('%%')) continue; // Mermaid comment
    return t;
  }
  return undefined;
}

export function detectDiagramType(text: string): DiagramType {
  const header = firstNonCommentLine(text);
  if (!header) return 'unknown';

  if (/^(flowchart|graph)\b/i.test(header)) return 'flowchart';
  if (/^pie\b/i.test(header)) return 'pie';
  if (/^sequenceDiagram\b/i.test(header)) return 'sequence';
  return 'unknown';
}

export function validate(text: string, options: ValidateOptions = {}): { type: DiagramType; errors: ValidationError[] } {
  const type = detectDiagramType(text);
  switch (type) {
    case 'flowchart':
      return { type, errors: validateFlowchart(text, options) };
    case 'pie':
      return { type, errors: validatePie(text, options) };
    case 'sequence':
      return { type, errors: validateSequence(text, options) };
    default:
      return {
        type,
        errors: [
          {
            line: 1,
            column: 1,
            message: 'Diagram must start with "graph", "flowchart", "pie", or "sequenceDiagram"',
            severity: 'error',
            code: 'GEN-HEADER-INVALID',
            hint: 'Start your diagram with e.g. "flowchart TD", "pie", or "sequenceDiagram".'
          },
        ],
      };
  }
}
