import type { Coordinate } from "../../../types";
import { CanvasText } from "./canvas-text";
import type { AnimatedLine } from "./animated-line";

export interface LegendConstructorArgs {
  label: string;
  context?: CanvasRenderingContext2D | null;
  position: Coordinate;
  color: string;
  line: AnimatedLine;
}

export const legendPosition = {
  x: 100,
  y: 350,
};

export class Legend {
  label: string;
  private context: CanvasRenderingContext2D | null | undefined;
  private color: string;
  private position: Coordinate;
  private line: AnimatedLine;
  private bounds: any;
  private text: CanvasText;

  static width = 200;
  static height = 35;

  constructor({
    label,
    context,
    color,
    position,
    line,
  }: LegendConstructorArgs) {
    this.label = label;
    this.context = context;
    this.color = color;
    this.position = position;
    this.line = line;
    this.bounds = {
      x: {
        start: position.x,
        end: position.x + Legend.width,
      },
      y: {
        start: position.y,
        end: position.y + Legend.height,
      },
    };
    this.text = new CanvasText({
      context,
      position: { x: position.x + 40, y: position.y + 17 },
      color: "black",
      label,
    });
  }

  drawLegend() {
    const ctx = this.context;
    if (ctx) {
      ctx.fillStyle = this.color;

      ctx?.fillRect(this.position.x, this.position.y, 20, 20);
      this.text.drawText();
    }
  }

  isInRange(position: Coordinate) {
    if (
      position.x > this.bounds.x.start &&
      position.x < this.bounds.x.end &&
      position.y > this.bounds.y.start &&
      position.y < this.bounds.y.end
    ) {
      return true;
    }

    return false;
  }

  // handleHover(position: Coordinate, endIndex: number, callback?: () => void) {
  //   if (this.isInRange(position)) {
  //     this.line.setEndIndex(endIndex);
  //     if (callback) {
  //       callback();
  //     }
  //   }
  // }

  // getLine() {
  //   return this.line;
  // }
}
