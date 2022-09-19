import type { Coordinates } from "@/utils";

export interface TextConstructorArgs {
  context: CanvasRenderingContext2D | null;
  position: Coordinates;
  color: string;
  label: string;
  fontSize?: number;
}

export class CanvasText {
  private context: CanvasRenderingContext2D | null;
  private position: Coordinates;
  private color: string;
  private label: string;
  private fontSize: number;

  constructor({
    context,
    position,
    color,
    label,
    fontSize = 20,
  }: TextConstructorArgs) {
    this.context = context;
    this.position = position;
    this.color = color;
    this.label = label;
    this.fontSize = fontSize;
  }

  drawText() {
    const ctx = this.context;
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
