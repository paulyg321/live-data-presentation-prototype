import type { RequiredCoordinate2D } from "../../../chart";

export interface MultiHandednessObject {
  index: number;
  score: number;
  label: "Left" | "Right";
  displayName: undefined;
}

export interface ParsedLandmarksObject {
  [key: number]: RequiredCoordinate2D;
}
