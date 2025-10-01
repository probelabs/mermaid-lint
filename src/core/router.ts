import { ValidationError, DiagramType, ValidateOptions } from './types.js';
import { validateFlowchart } from '../diagrams/flowchart/validate.js';
import { validatePie } from '../diagrams/pie/validate.js';
import { validateSequence } from '../diagrams/sequence/validate.js';
import { validateClass } from '../diagrams/class/validate.js';
import { validateState } from '../diagrams/state/validate.js';

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
  if (/^classDiagram\b/.test(header)) return 'class';
  if (/^stateDiagram(?:-v2)?\b/.test(header)) return 'state';
  return 'unknown';
}

function isOtherMermaidDiagram(headerLine: string | undefined): boolean {
  if (!headerLine) return false;
  const firstWord = /^(\w[\w-]*)/.exec(headerLine)?.[1] || '';
  const t = firstWord; // case-sensitive as many Mermaid headers are camelCase
  const OTHER = new Set([
    'classDiagram',
    'stateDiagram', 'stateDiagram-v2',
    'erDiagram',
    'journey', 'userJourney',
    'gantt',
    'gitGraph',
    'mindmap',
    'timeline',
    'quadrantChart',
    'xychart', 'xychart-beta', 'xyChart',
    'sankey', 'sankey-beta',
    'requirementDiagram',
    'C4Context', 'C4Container', 'C4Component', 'C4Deployment', 'C4Dynamic',
    'block', 'block-beta', 'blockDiagram',
    'treemap', 'treemap-beta',
  ]);
  return OTHER.has(t);
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
    case 'class':
      return { type, errors: validateClass(text, options) };
    case 'state':
      return { type, errors: validateState(text, options) };
    default:
      // Treat other (unsupported) Mermaid diagram types as valid (pass-through).
      const header = firstNonCommentLine(text);
      if (isOtherMermaidDiagram(header)) {
        return { type, errors: [] };
      }
      // Otherwise, surface a header error.
      return {
        type,
        errors: [
          {
            line: 1,
            column: 1,
            message: 'Diagram must start with "graph", "flowchart", "pie", "sequenceDiagram", "classDiagram" or "stateDiagram[-v2]"',
            severity: 'error',
            code: 'GEN-HEADER-INVALID',
            hint: 'Start with: flowchart TD | pie | sequenceDiagram | classDiagram | stateDiagram-v2.'
          },
        ],
      };
  }
}
