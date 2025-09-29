import { ValidationError, DiagramType } from './types.js';
import { validateFlowchart } from '../diagrams/flowchart/validate.js';
import { validatePie } from '../diagrams/pie/validate.js';

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

  if (/^(flowchart|graph)\s/i.test(header)) return 'flowchart';
  if (/^pie\b/i.test(header)) return 'pie';
  return 'unknown';
}

export function validate(text: string): { type: DiagramType; errors: ValidationError[] } {
  const type = detectDiagramType(text);
  switch (type) {
    case 'flowchart':
      return { type, errors: validateFlowchart(text) };
    case 'pie':
      return { type, errors: validatePie(text) };
    default:
      return {
        type,
        errors: [
          {
            line: 1,
            column: 1,
            message: 'Diagram must start with "graph", "flowchart", or "pie"',
            severity: 'error',
          },
        ],
      };
  }
}

