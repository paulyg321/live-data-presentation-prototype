import type { CoordinatesObject } from "../types/lib/calculations";

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

export function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function generateLineData(minY: number, maxY: number) {
  return new Array(100)
    .fill(0)
    .map((val, index) => ({ x: index, y: getRandomArbitrary(minY, maxY) }));
}

export function keepBetween({
  value,
  range,
  roundValue,
}: {
  value: number;
  range: { start: number; end: number };
  roundValue: boolean;
}) {
  if (range.start > range.end) throw new Error("Invalid range");

  let output = value;
  if (roundValue) {
    output = Math.round(value);
  }

  if (output > range.end) {
    return range.end;
  } else if (output < range.start) {
    return range.start;
  } else {
    return output;
  }
}
