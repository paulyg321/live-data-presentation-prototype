import type { Coordinates } from "../../../types";
import type { Line } from "./line";

export interface LegendConstructorArgs {
  label: string;
  context: CanvasRenderingContext2D | null;
  position: Coordinates;
  color: string;
  line: Line;
}

export const legendPosition = {
  x: 150,
  y: 580,
};

export class Legend {
  private label: string;
  private context: CanvasRenderingContext2D | null;
  private color: string;
  private position: Coordinates;
  private line: Line;
  private bounds: any;

  static width = 200;
  static height = 50;

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
  }

  drawLegend() {
    const ctx = this.context;
    if (ctx) {
      ctx.strokeStyle = this.color;

      ctx?.strokeRect(
        this.position.x,
        this.position.y,
        Legend.width,
        Legend.height
      );
    }
  }

  isInRange(position: Coordinates) {
    if (
      position.x >= this.bounds.x.start &&
      position.x <= this.bounds.x.end &&
      position.y >= this.bounds.y.start &&
      position.y <= this.bounds.y.end
    ) {
      return true;
    }

    return false;
  }

  handleHover(position: Coordinates, endIndex: number) {
    console.log({
      label: this.label,
      position,
      isInRange: this.isInRange(position),
      bounds: this.bounds,
    });
    if (this.isInRange(position)) {
      this.line.setEndIndex(endIndex);
    }
  }

  getLine() {
    return this.line;
  }
}
