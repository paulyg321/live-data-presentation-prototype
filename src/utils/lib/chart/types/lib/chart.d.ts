export interface ChartMargin {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  margin?: ChartMargin;
}

export interface LinePoint {
  x: number;
  y: number;
}
