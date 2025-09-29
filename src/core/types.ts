export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
  hint?: string;
  length?: number;
}

export type DiagramType = 'flowchart' | 'pie' | 'sequence' | 'unknown';

export interface ValidateOptions {
  strict?: boolean;
}
