// Graph model types for renderer

export interface NodeStyle {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}

export interface Node {
  id: string;
  label: string;
  shape: NodeShape;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  style?: NodeStyle;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type: ArrowType;
  markerStart?: 'none' | 'arrow' | 'circle' | 'cross';
  markerEnd?: 'none' | 'arrow' | 'circle' | 'cross';
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
  direction: Direction;
  subgraphs?: Subgraph[];
}

export interface Subgraph {
  id: string;
  label?: string;
  nodes: string[]; // node IDs
  parent?: string; // parent subgraph ID
}

export type NodeShape =
  | 'rectangle'     // [text]
  | 'round'         // (text)
  | 'stadium'       // ([text])
  | 'cylinder'      // [(text)]
  | 'circle'        // ((text))
  | 'diamond'       // {text}
  | 'hexagon'       // {{text}}
  | 'parallelogram' // [/text/]
  | 'trapezoid'     // [/text\] (top narrow)
  | 'trapezoidAlt'  // [\text/] (bottom narrow)
  | 'double'        // [[[text]]]
  | 'subroutine';   // [[text]]

export type ArrowType =
  | 'arrow'         // -->
  | 'open'          // ---
  | 'dotted'        // -.->
  | 'thick'         // ==>
  | 'invisible';    // ~~~

export type Direction = 'TB' | 'TD' | 'BT' | 'RL' | 'LR';

// Layout result after positioning
export interface LayoutNode extends Node {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge extends Edge {
  points: Array<{ x: number; y: number }>;
}

export interface LayoutSubgraph {
  id: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parent?: string;
}

export interface Layout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
  subgraphs?: LayoutSubgraph[];
}
