import type { Coordinates } from "../../../types";
import type { Line } from "./line";
import { CanvasText } from "./canvas-text";

export interface LegendConstructorArgs {
  label: string;
  context: CanvasRenderingContext2D | null;
  position: Coordinates;
  color: string;
  line: Line;
}

export const legendPosition = {
  x: 100,
  y: 350,
};

export class Legend {
  private label: string;
  private context: CanvasRenderingContext2D | null;
  private color: string;
  private position: Coordinates;
  private line: Line;
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
      color: "white",
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

  isInRange(position: Coordinates) {
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

  handleHover(position: Coordinates, endIndex: number, callback?: () => void) {
    if (this.isInRange(position)) {
      this.line.setEndIndex(endIndex);
      if (callback) {
        callback();
      }
    }
  }

  getLine() {
    return this.line;
  }
}
