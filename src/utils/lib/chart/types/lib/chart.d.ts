export interface ChartMargin {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Dimensions {
  width: number;
  height: number;
  margin?: ChartMargin;
}

export interface Coordinate2D {
  x: number;
  y: number;
}

export type PartialCoordinate2D = Partial<Coordinate2D>;

export interface Coordinate3D {
  x: number;
  y: number;
  z: number;
}

export type PartialCoordinate3D = Partial<Coordinate3D>;

export interface BezierCoordinate {
  coordinate: Coordinate2D;
  cpLeft?: Coordinate2D;
  cpRight?: Coordinate2D;
}
