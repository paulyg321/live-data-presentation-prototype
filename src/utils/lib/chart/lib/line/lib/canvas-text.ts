import type { Coordinate2D } from "@/utils";

export interface TextConstructorArgs {
  context?: CanvasRenderingContext2D | null;
  position: Coordinate2D;
  color: string;
  label: string;
  fontSize?: number;
}

export class CanvasText {
  private position: Coordinate2D;
  private color: string;
  private label: string;
  private fontSize: number;

  constructor({ position, color, label, fontSize = 20 }: TextConstructorArgs) {
    this.position = position;
    this.color = color;
    this.label = label;
    this.fontSize = fontSize;
  }

  drawText({ ctx }: { ctx: CanvasRenderingContext2D }) {
    if (ctx) {
      ctx.fillStyle = this.color;
      ctx.font = `${this.fontSize}px Arial`;
      ctx.fillText(this.label, this.position.x, this.position.y);
    }
  }

  getLabel() {
    return this.label;
  }

  getColor() {
    return this.color;
  }

  setLabel(label: string) {
    this.label = label;
  }

  setColor(color: string) {
    this.color = color;
  }
}
