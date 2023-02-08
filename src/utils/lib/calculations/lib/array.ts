// TODO: Improve this
export function addArrayValues(arrays: number[][]) {
  const n = arrays.reduce((max, xs) => Math.max(max, xs.length), 0);
  const result = Array.from({ length: n });
  return result.map((_, i) =>
    arrays.map((xs) => xs[i] || 0).reduce((sum, x) => sum + x, 0)
  );
}

// Possibly add to the array prototype
export function containsValueLargerThanMax(values: number[], max: number) {
  const containsLargerValue = values.some((value: number) => {
    return value > max;
  });

  return !containsLargerValue;
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
