import type { ChartDimensions, Coordinates } from "../../../types";

export interface LineConstructorArgs {
  data: Coordinates[];
  context: CanvasRenderingContext2D | null;
  xScale: any;
  yScale?: any;
  canvasDimensions: ChartDimensions;
  color: string;
  label: string;
  endIndex: number;
}

export class Line {
  private data: Coordinates[];
  private context: CanvasRenderingContext2D | null;
  private xScale: any;
  private yScale: any;
  private canvasDimensions: ChartDimensions;
  private color: string;
  private label: string;

  private endIndex: number;
  private isSelected = false;
  private lineData: Coordinates[] = [];

  constructor({
    data,
    context,
    xScale,
    yScale,
    canvasDimensions,
    color,
    label,
    endIndex,
  }: LineConstructorArgs) {
    this.data = data;
    this.context = context;
    this.xScale = xScale;
    this.yScale = yScale;
    this.canvasDimensions = canvasDimensions;
    this.color = color;
    this.label = label;
    this.endIndex = endIndex;
  }

  drawLine() {
    const ctx = this.context;
    if (ctx) {
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.strokeStyle = this.color;
      ctx.lineCap = "round";

      this.lineData = this.data.slice(0, this.endIndex);

      this.lineData.forEach((point: Coordinates, index: number) => {
        if (index === 0) {
          ctx.moveTo(this.xScale(point.x), point.y);
        }
        ctx.lineTo(this.xScale(point.x), point.y);
      });
      ctx.stroke();
    }
  }

  getLabel() {
    return this.label;
  }

  getColor() {
    return this.color;
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

  setData(data: Coordinates[]) {
    this.data = data;
  }

  setColor(color: string) {
    this.color = color;
  }

  setXscale(scale: any) {
    this.xScale = scale;
  }
  setYscale(scale: any) {
    this.yScale = scale;
  }
}
