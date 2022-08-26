import type { CoordinatesObject } from "../types/calculations";

export function calculateAngleBetweenPoints(
  origin: CoordinatesObject,
  pointB: CoordinatesObject
) {
  const y = pointB.y - origin.y;
  const x = pointB.x - origin.x;

  return -(Math.atan2(y, x) * (180 / Math.PI));
}

export function calculateDistance(
  pointA: CoordinatesObject,
  pointB: CoordinatesObject
) {
  return {
    horizontalDistance: Math.abs(pointA.x - pointB.x),
    verticalDistance: Math.abs(pointA.y - pointB.y),
    euclideanDistance: Math.sqrt(
      Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2)
    ),
  };
}
