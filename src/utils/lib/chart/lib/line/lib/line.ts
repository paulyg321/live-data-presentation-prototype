import type { ChartDimensions, LinePoint } from "../../../types";

export interface LineConstructorArgs {
  data: LinePoint[];
  context: CanvasRenderingContext2D | null;
  xScale: any;
  yScale?: any;
  canvasDimensions: ChartDimensions;
  color: string;
}

export class Line {
  private data: LinePoint[];
  private context: CanvasRenderingContext2D | null;
  private xScale: any;
  private yScale: any;
  private canvasDimensions: ChartDimensions;
  private color: string;

  private endIndex = 0;
  private isSelected = false;
  private lineData: LinePoint[] = [];

  constructor({
    data,
    context,
    xScale,
    yScale,
    canvasDimensions,
    color,
  }: LineConstructorArgs) {
    this.data = data;
    this.context = context;
    this.xScale = xScale;
    this.yScale = yScale;
    this.canvasDimensions = canvasDimensions;
    this.color = color;
  }

  drawLine() {
    const ctx = this.context;
    if (ctx) {
      ctx.beginPath();
      ctx.strokeStyle = this.color;

      this.lineData = this.data.slice(0, this.endIndex);

      this.lineData.forEach((point: LinePoint, index: number) => {
        if (index === 0) {
          ctx.moveTo(this.xScale(point.x), point.y);
        }
        ctx.lineTo(this.xScale(point.x), point.y);
      });

      ctx.stroke();
    }
  }

  setEndIndex(index: number) {
    if (index > this.endIndex) {
      this.endIndex = this.endIndex + 1;
    } else if (index < this.endIndex) {
      this.endIndex = this.endIndex - 1;
    }
  }

  setIsSelected(isSelected: boolean) {
    this.isSelected = isSelected;
  }
}
