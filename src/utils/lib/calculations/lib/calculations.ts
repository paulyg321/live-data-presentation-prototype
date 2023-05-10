import { type Coordinate2D, type Dimensions, defaultScale } from "@/utils";

export function calculateAngleBetweenPoints(
  origin: Coordinate2D,
  pointB: Coordinate2D
) {
  const y = pointB.y - origin.y;
  const x = pointB.x - origin.x;

  return -(Math.atan2(y, x) * (180 / Math.PI));
}

export function calculateDistance(pointA: Coordinate2D, pointB: Coordinate2D) {
  const verticalDistance = pointA.y - pointB.y;
  const horizontalDistance = pointA.x - pointB.x;
  return {
    horizontalDistance,
    verticalDistance,
    euclideanDistance: Math.sqrt(
      Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2)
    ),
  };
}

export function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function isInBound(
  point: Coordinate2D,
  boundaries: {
    position: Coordinate2D;
    dimensions?: Dimensions;
    radius?: number;
  },
  xScale = defaultScale,
  yScale = defaultScale,
) {
  let isWithinBounds = true;
  const scaledPoint = {
    x: xScale(point.x),
    y: yScale(point.y),
  };

  if (boundaries.radius) {
    const dist = calculateDistance(scaledPoint, boundaries?.position);

    if (dist.euclideanDistance > boundaries.radius) {
      isWithinBounds = false;
    } else {
      isWithinBounds = true;
    }
  }

  if (boundaries.dimensions) {
    const { x: minX, y: minY } = boundaries.position;
    const { maxX, maxY } = {
      maxX: boundaries.position.x + boundaries.dimensions.width,
      maxY: boundaries.position.y + boundaries.dimensions.height,
    };

    if (
      scaledPoint.x > minX &&
      scaledPoint.x < maxX &&
      scaledPoint.y > minY &&
      scaledPoint.y < maxY
    ) {
      isWithinBounds = true;
    } else {
      isWithinBounds = false;
    }
  }

  return isWithinBounds;
}

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
