import type { Coordinate2D } from "../../../chart";
import {
  dollar_recognizer_arrow,
  dollar_recognizer_caret,
  dollar_recognizer_check,
  dollar_recognizer_circle,
  dollar_recognizer_delete,
  dollar_recognizer_left_curly_brace,
  dollar_recognizer_left_square_bracket,
  dollar_recognizer_pigtail,
  dollar_recognizer_rectangle,
  dollar_recognizer_right_curly_brace,
  dollar_recognizer_right_square_bracket,
  dollar_recognizer_star,
  dollar_recognizer_triangle,
  dollar_recognizer_v,
  dollar_recognizer_x,
  dollar_recognizer_zig_zag,
} from "./constants";
import {
  deg2Rad,
  distanceAtBestAngle,
  indicativeAngle,
  optimalCosineDistance,
  resample,
  rotateBy,
  scaleTo,
  translateTo,
  vectorize,
} from "./utils";

const numUnistrokes = 16;
const numPoints = 64;
const squareSize = 250.0;
const origin = {
  x: 0,
  y: 0,
};
const diagonal = Math.sqrt(squareSize * squareSize + squareSize * squareSize);
const halfDiagonal = 0.5 * diagonal;
const angleRange = deg2Rad(45.0);
const anglePrecision = deg2Rad(2.0);

export class Unistroke {
  name: string;
  points: Coordinate2D[];
  vector: number[];

  constructor(name: string, points: Coordinate2D[]) {
    this.name = name;
    this.points = resample(points, numPoints);
    const radians = indicativeAngle(this.points);
    this.points = rotateBy(this.points, -radians);
    this.points = scaleTo(this.points, squareSize);
    this.points = translateTo(this.points, origin);
    this.vector = vectorize(this.points);
  }
}

export class Result {
  name: string;
  score: number;
  time: number;

  // time is in ms
  constructor(name: string, score: number, time: number) {
    this.name = name;
    this.score = score;
    this.time = time;
  }
}

export class DollarRecognizer {
  unistrokes: Unistroke[] = new Array(numUnistrokes);
  constructor() {
    //
    // one built-in unistroke per gesture type
    //
    this.unistrokes[0] = new Unistroke("triangle", dollar_recognizer_triangle);
    this.unistrokes[1] = new Unistroke("x", dollar_recognizer_x);
    this.unistrokes[2] = new Unistroke(
      "rectangle",
      dollar_recognizer_rectangle
    );
    this.unistrokes[3] = new Unistroke("circle", dollar_recognizer_circle);
    this.unistrokes[4] = new Unistroke("check", dollar_recognizer_check);
    this.unistrokes[5] = new Unistroke("caret", dollar_recognizer_caret);
    this.unistrokes[6] = new Unistroke("zig-zag", dollar_recognizer_zig_zag);
    this.unistrokes[7] = new Unistroke("arrow", dollar_recognizer_arrow);
    this.unistrokes[8] = new Unistroke(
      "left square bracket",
      dollar_recognizer_left_square_bracket
    );
    this.unistrokes[9] = new Unistroke(
      "right square bracket",
      dollar_recognizer_right_square_bracket
    );
    this.unistrokes[10] = new Unistroke("v", dollar_recognizer_v);
    this.unistrokes[11] = new Unistroke("delete", dollar_recognizer_delete);
    this.unistrokes[12] = new Unistroke(
      "left curly brace",
      dollar_recognizer_left_curly_brace
    );
    this.unistrokes[13] = new Unistroke(
      "right curly brace",
      dollar_recognizer_right_curly_brace
    );
    this.unistrokes[14] = new Unistroke("star", dollar_recognizer_star);
    this.unistrokes[15] = new Unistroke("pigtail", dollar_recognizer_pigtail);
  }
  //
  // The $1 Gesture Recognizer API begins here -- 3 methods: Recognize(), AddGesture(), and DeleteUserGestures()
  //
  recognize(points: Coordinate2D[], useProtractor: boolean) {
    const t0 = Date.now();
    const candidate = new Unistroke("", points);

    let u = -1;
    let b = +Infinity;
    for (
      let i = 0;
      i < this.unistrokes.length;
      i++ // for each unistroke template
    ) {
      let d;
      if (useProtractor) {
        d = optimalCosineDistance(this.unistrokes[i].vector, candidate.vector);
      } else {
        d = distanceAtBestAngle(
          candidate.points,
          this.unistrokes[i],
          -angleRange,
          +angleRange,
          anglePrecision
        ); // Golden Section Search (original $1)
      }
      if (d < b) {
        b = d; // best (least) distance
        u = i; // unistroke index
      }
    }
    const t1 = Date.now();
    return u == -1
      ? new Result("No match.", 0.0, t1 - t0)
      : new Result(this.unistrokes[u].name, 1.0 - b / halfDiagonal, t1 - t0);
  }
  addGesture(name: string, points: Coordinate2D[]) {
    this.unistrokes[this.unistrokes.length] = new Unistroke(name, points); // append new unistroke
    let num = 0;
    for (let i = 0; i < this.unistrokes.length; i++) {
      if (this.unistrokes[i].name == name) num++;
    }
    return num;
  }
  deleteUserGestures() {
    this.unistrokes.length = numUnistrokes; // clear any beyond the original set
    return numUnistrokes;
  }
}
