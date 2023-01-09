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

export interface Coordinate {
  x: number;
  y: number;
}

export interface BezierCoordinate {
  coordinate: Coordinate;
  cpLeft?: {
    x: number;
    y: number;
  };
  cpRight?: {
    x: number;
    y: number;
  };
}
