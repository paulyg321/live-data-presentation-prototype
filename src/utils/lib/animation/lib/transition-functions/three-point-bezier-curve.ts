import { addArrayValues, multiplyArrayByScalar } from "@/utils";

export class ThreePointBezierCurve {
  // Rank 1 is 1D (basically an array)
  readonly p1 = [0, 0];
  readonly p3 = [1, 1];

  /*
   * BEZIER FORMULA
   * Reference for formulas https://javascript.info/bezier-curve#maths
   * All points are regarded as control points (by default for 3 point curves first and last will be (0,0) & (1,1))
   */
  getPointBasedOnTime(time: number, p2: number[]): number[] {
    const p1_multiplier = Math.pow(1 - time, 2);
    const p2_multiplier = 2 * (1 - time) * time;
    const p3_multiplier = Math.pow(time, 2);

    return addArrayValues([
      multiplyArrayByScalar({ scalar: p1_multiplier, array: this.p1 }),
      multiplyArrayByScalar({ scalar: p2_multiplier, array: p2 }),
      multiplyArrayByScalar({ scalar: p3_multiplier, array: this.p3 }),
    ]);
  }

  easeIn(time: number): number[] {
    const p2 = [0, 1];
    return this.getPointBasedOnTime(time, p2);
  }

  easeOut(time: number): number[] {
    const p2 = [1, 0];
    return this.getPointBasedOnTime(time, p2);
  }

  linear(time: number): number[] {
    const p2 = [0.5, 0.5];
    return this.getPointBasedOnTime(time, p2);
  }
}
