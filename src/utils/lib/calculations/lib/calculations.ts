import { HORIZONTAL_ORDER, VERTICAL_ORDER } from "../../media-pipe";
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
  const verticalDistance = pointA.y - pointB.y;
  const horizontalDistance = pointA.x - pointB.x;
  return {
    horizontalDistance: {
      order:
        horizontalDistance < 0 ? HORIZONTAL_ORDER.LEFT : HORIZONTAL_ORDER.RIGHT,
      value: Math.abs(horizontalDistance),
    },
    verticalDistance: {
      order: verticalDistance < 0 ? VERTICAL_ORDER.ABOVE : VERTICAL_ORDER.BELOW,
      value: Math.abs(verticalDistance),
    },
    euclideanDistance: Math.sqrt(
      Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2)
    ),
  };
}

export function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function generateLineData(minY: number, maxY: number) {
  return new Array(20)
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

// TODO: Improve this
export function multiplyArrayByScalar({
  array,
  scalar,
}: {
  array: number[];
  scalar: number;
}) {
  return array.map((value: number) => {
    return value * scalar;
  });
}

// TODO: Improve this
export function addArrayValues(arrays: number[][]) {
  const n = arrays.reduce((max, xs) => Math.max(max, xs.length), 0);
  const result = Array.from({ length: n });
  return result.map((_, i) =>
    arrays.map((xs) => xs[i] || 0).reduce((sum, x) => sum + x, 0)
  );
}
