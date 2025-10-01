// Lazy-loading browser entry point - loads diagram validators on demand
// This provides the smallest initial bundle size

export type { ValidationError, DiagramType, ValidateOptions } from './core/types.js';

// Always include the router for diagram detection
import { detectDiagramType } from './core/router.js';
export { detectDiagramType };

// Lazy-load validation based on diagram type
export async function validate(text: string, options?: any) {
  const type = detectDiagramType(text);

  switch (type) {
    case 'flowchart': {
      const { validateFlowchart } = await import('./diagrams/flowchart/validate.js');
      return {
        type: 'flowchart' as const,
        errors: validateFlowchart(text, options)
      };
    }
    case 'sequence': {
      const { validateSequence } = await import('./diagrams/sequence/validate.js');
      return {
        type: 'sequence' as const,
        errors: validateSequence(text, options)
      };
    }
    case 'pie': {
      const { validatePie } = await import('./diagrams/pie/validate.js');
      return {
        type: 'pie' as const,
        errors: validatePie(text, options)
      };
    }
    default:
      return {
        type: 'unknown' as const,
        errors: []
      };
  }
}

// Lazy-load renderer
export async function renderMermaid(text: string, options?: any) {
  const { renderMermaid: render } = await import('./renderer/index.js');
  return render(text, options);
}

// Lazy-load fixer
export async function fixText(text: string, options?: any) {
  const [
    { validate: validateSync },
    { computeFixes },
    { applyEdits }
  ] = await Promise.all([
    import('./core/router.js'),
    import('./core/fixes.js'),
    import('./core/edits.js')
  ]);

  const level = options?.level || 'safe';
  let current = text;

  for (let i = 0; i < 5; i++) {
    const res = validateSync(current, options);
    const edits = computeFixes(current, res.errors, level);
    if (edits.length === 0) return { fixed: current, errors: res.errors };
    const next = applyEdits(current, edits);
    if (next === current) return { fixed: current, errors: res.errors };
    current = next;
  }

  const finalRes = validateSync(current, options);
  return { fixed: current, errors: finalRes.errors };
}