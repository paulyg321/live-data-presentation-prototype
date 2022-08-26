import type { CoordinatesObject } from "../../calculations";

export interface MultiHandednessObject {
  index: number;
  score: number;
  label: "Left" | "Right";
  displayName: undefined;
}

export interface ParsedLandmarksObject {
  [key: number]: CoordinatesObject;
}
