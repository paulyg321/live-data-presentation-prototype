//
// Private helper functions from here on down

import type { Coordinate2D, Dimensions } from "../../../chart";
import type { Unistroke } from "./DollarRecognizer";

const Phi = 0.5 * (-1.0 + Math.sqrt(5.0)); // Golden Ratio

//
export function resample(points: Coordinate2D[], n: number) {
  const I = pathLength(points) / (n - 1); // interval length
  let D = 0.0;
  const newpoints = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const d = distance(points[i - 1], points[i]);
    if (D + d >= I) {
      const qx =
        points[i - 1].x + ((I - D) / d) * (points[i].x - points[i - 1].x);
      const qy =
        points[i - 1].y + ((I - D) / d) * (points[i].y - points[i - 1].y);
      const q = { x: qx, y: qy };
      newpoints[newpoints.length] = q; // append new point 'q'
      points.splice(i, 0, q); // insert 'q' at position i in points s.t. 'q' will be the next i
      D = 0.0;
    } else D += d;
  }
  if (newpoints.length == n - 1)
    // somtimes we fall a rounding-error short of adding the last point, so add it if so
    newpoints[newpoints.length] = {
      x: points[points.length - 1].x,
      y: points[points.length - 1].y,
    };
  return newpoints;
}

export function indicativeAngle(points: Coordinate2D[]) {
  const c = centroid(points);
  return Math.atan2(c.y - points[0].y, c.x - points[0].x);
}
export function rotateBy(points: Coordinate2D[], radians: number) {
  // rotates points around centroid
  const c = centroid(points);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const newpoints = [];
  for (let i = 0; i < points.length; i++) {
    const qx = (points[i].x - c.x) * cos - (points[i].y - c.y) * sin + c.y;
    const qy = (points[i].x - c.x) * sin + (points[i].y - c.y) * cos + c.y;
    newpoints[newpoints.length] = {
      x: qx,
      y: qy,
    };
  }
  return newpoints;
}
export function scaleTo(points: Coordinate2D[], size: number) {
  // non-uniform scale; assumes 2D gestures (i.e., no lines)
  const B = boundingBox(points);
  const newpoints = [];
  for (let i = 0; i < points.length; i++) {
    const qx = points[i].x * (size / B.dimensions.width);
    const qy = points[i].y * (size / B.dimensions.height);
    newpoints[newpoints.length] = {
      x: qx,
      y: qy,
    };
  }
  return newpoints;
}
export function translateTo(points: Coordinate2D[], pt: Coordinate2D) {
  // translates points' centroid
  const c = centroid(points);
  const newpoints = [];
  for (let i = 0; i < points.length; i++) {
    const qx = points[i].x + pt.x - c.x;
    const qy = points[i].y + pt.y - c.y;
    newpoints[newpoints.length] = {
      x: qx,
      y: qy,
    };
  }
  return newpoints;
}
export function vectorize(points: Coordinate2D[]) {
  // for Protractor
  let sum = 0.0;
  const vector = [];
  for (let i = 0; i < points.length; i++) {
    vector[vector.length] = points[i].x;
    vector[vector.length] = points[i].y;
    sum += points[i].x * points[i].x + points[i].y * points[i].y;
  }
  const magnitude = Math.sqrt(sum);
  for (let i = 0; i < vector.length; i++) vector[i] /= magnitude;
  return vector;
}
export function optimalCosineDistance(v1: number[], v2: number[]) {
  // for Protractor
  let a = 0.0;
  let b = 0.0;
  for (let i = 0; i < v1.length; i += 2) {
    a += v1[i] * v2[i] + v1[i + 1] * v2[i + 1];
    b += v1[i] * v2[i + 1] - v1[i + 1] * v2[i];
  }
  const angle = Math.atan(b / a);
  return Math.acos(a * Math.cos(angle) + b * Math.sin(angle));
}

export function distanceAtBestAngle(
  points: Coordinate2D[],
  T: Unistroke,
  a: number,
  b: number,
  threshold: number
) {
  let x1 = Phi * a + (1.0 - Phi) * b;
  let f1 = distanceAtAngle(points, T, x1);
  let x2 = (1.0 - Phi) * a + Phi * b;
  let f2 = distanceAtAngle(points, T, x2);
  while (Math.abs(b - a) > threshold) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = Phi * a + (1.0 - Phi) * b;
      f1 = distanceAtAngle(points, T, x1);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = (1.0 - Phi) * a + Phi * b;
      f2 = distanceAtAngle(points, T, x2);
    }
  }
  return Math.min(f1, f2);
}
export function distanceAtAngle(
  points: Coordinate2D[],
  T: Unistroke,
  radians: number
) {
  const newpoints = rotateBy(points, radians);
  return pathDistance(newpoints, T.points);
}
export function centroid(points: Coordinate2D[]) {
  let x = 0.0,
    y = 0.0;
  for (let i = 0; i < points.length; i++) {
    x += points[i].x;
    y += points[i].y;
  }
  x /= points.length;
  y /= points.length;
  return { x, y };
}
export function boundingBox(points: Coordinate2D[]): {
  coordinates: Coordinate2D;
  dimensions: Dimensions;
} {
  let minX = +Infinity,
    maxX = -Infinity,
    minY = +Infinity,
    maxY = -Infinity;
  for (let i = 0; i < points.length; i++) {
    minX = Math.min(minX, points[i].x);
    minY = Math.min(minY, points[i].y);
    maxX = Math.max(maxX, points[i].x);
    maxY = Math.max(maxY, points[i].y);
  }
  return {
    coordinates: {
      x: minX,
      y: minY,
    },
    dimensions: {
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}

export function pathDistance(pts1: Coordinate2D[], pts2: Coordinate2D[]) {
  let d = 0.0;
  for (
    let i = 0;
    i < pts1.length;
    i++ // assumes pts1.length == pts2.length
  ) {
	  if (pts1[i] === undefined || pts2[i] === undefined) {
		  debugger;
	  }
	  d += distance(pts1[i], pts2[i]);
  }
  return d / pts1.length;
}
export function pathLength(points: Coordinate2D[]) {
  let d = 0.0;
  for (let i = 1; i < points.length; i++) {
	  if (points[i] === undefined || points[i - 1] === undefined) {
		  debugger;
	  }
	  d += distance(points[i - 1], points[i]);
  }
  return d;
}
export function distance(p1: Coordinate2D, p2: Coordinate2D) {
	if (p1 === undefined || p2 === undefined) {
		debugger;
	}
	// debugger;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
export function deg2Rad(d: number) {
  return (d * Math.PI) / 180.0;
}
