// Types for Pie chart rendering

export interface PieSlice {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartModel {
  title?: string;
  showData: boolean;
  slices: PieSlice[];
}

export interface PieRenderOptions {
  width?: number;
  height?: number;
  rimStroke?: string;
  rimStrokeWidth?: string | number;
}
