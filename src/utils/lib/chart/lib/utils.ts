import { calculateDistance } from "../../calculations";
import type { Coordinate2D } from "../types";

export function distanceBetweenPoints(
  initialPosition: Coordinate2D[],
  newPosition: Coordinate2D[]
) {
  if (initialPosition.length !== newPosition.length) {
    throw new Error(
      "distanceDiff - please ensure coordinate arrays have equal length"
    );
  }

  return initialPosition.map((position: Coordinate2D, index: number) => {
    return calculateDistance(position, newPosition[index]);
  });
}
