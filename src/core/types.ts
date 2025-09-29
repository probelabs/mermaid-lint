export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
  hint?: string;
}

export type DiagramType = 'flowchart' | 'pie' | 'unknown';
