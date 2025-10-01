export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
  hint?: string;
  length?: number;
}

export type DiagramType = 'flowchart' | 'pie' | 'sequence' | 'class' | 'state' | 'unknown';

export interface ValidateOptions {
  strict?: boolean;
}

// Text edits for autofix
export interface PositionLC { line: number; column: number }
export interface TextEditLC {
  // Inclusive start at 1-based line/column; if end is omitted, this is an insertion
  start: PositionLC;
  end?: PositionLC; // exclusive end; if provided, replaced with newText
  newText: string;
}

export type FixLevel = 'safe' | 'all';
