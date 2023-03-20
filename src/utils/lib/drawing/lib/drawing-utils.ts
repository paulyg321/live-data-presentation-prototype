import * as d3 from "d3";
import type { Coordinate2D, Dimensions } from "../../chart";

export const defaultScale = (value: any) => value;

export enum LineShape {
  CURVED = "curved",
  SHARP = "sharp",
}

interface DrawingArgs {
  context?: CanvasRenderingContext2D;
  coordinates: Coordinate2D;
  xScale?: (value: any) => number;
  yScale?: (value: any) => number;
  fill?: boolean;
  stroke?: boolean;
  strokeStyle?: string;
  lineWidth?: number;
  fillStyle?: string;
  opacity?: number;
  clip?: boolean;
}

export interface ModifyContextStyleArgs {
  context?: CanvasRenderingContext2D;
  strokeStyle?: string;
  fillStyle?: string;
  fontSize?: number;
  opacity?: number;
  lineWidth?: number;
  lineDash?: number[];
  textAlign?: "left" | "right" | "center";
}

export interface DrawCircleArgs extends DrawingArgs {
  radius: number;
  startAngle?: number;
  endAngle?: number;
  drawLineToCenter?: boolean;
}

export interface DrawRectArgs extends DrawingArgs {
  dimensions: Dimensions;
}

export interface DrawTextArgs extends DrawingArgs {
  text: string;
  fontSize?: number;
}

export interface DrawLineArgs {
  context: CanvasRenderingContext2D;
  startCoordinates: Coordinate2D;
  endCoordinates: Coordinate2D;
  strokeStyle?: string;
  lineWidth?: number;
  opacity?: number;
  lineDash?: number[];
}

export class DrawingUtils {
  context: CanvasRenderingContext2D;
  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  drawText({
    coordinates,
    text,
    xScale = defaultScale,
    yScale = defaultScale,
    fill = true,
    stroke = false,
  }: DrawTextArgs) {
    if (fill) {
      this.context.fillText(text, xScale(coordinates.x), yScale(coordinates.y));
    }

    if (stroke) {
      this.context.strokeText(
        text,
        xScale(coordinates.x),
        yScale(coordinates.y)
      );
    }
  }

  drawCircle({
    coordinates,
    radius,
    startAngle = 0,
    endAngle = 2 * Math.PI,
    xScale = defaultScale,
    yScale = defaultScale,
    fill = false,
    stroke = false,
    clip = false,
    drawLineToCenter = false,
  }: DrawCircleArgs) {
    if (clip) {
      this.context.beginPath();
      this.context.arc(
        xScale(coordinates.x),
        yScale(coordinates.y),
        radius,
        startAngle,
        endAngle,
        false
      );
      this.context.clip();
      return;
    }

    this.context.beginPath();
    this.context.arc(
      xScale(coordinates.x),
      yScale(coordinates.y),
      radius,
      startAngle,
      endAngle,
      false
    );

    if (drawLineToCenter) {
      this.context.lineTo(xScale(coordinates.x), yScale(coordinates.y));
    }

    if (fill) {
      this.context.fill();
    }

    if (stroke) {
      this.context.stroke();
    }
  }

  drawLine({
    coordinates,
    shape = LineShape.CURVED,
    filterMode = "defined",
    range,
    xScale = defaultScale,
    yScale = defaultScale,
  }: {
    coordinates: { x: any; y: any }[];
    shape?: LineShape;
    filterMode?: "defined" | "clip";
    range?: {
      xRange: [number, number];
      yRange: [number, number];
    };
    xScale?: (value: number) => number;
    yScale?: (value: number) => number;
  }) {
    if (!this.context) return;

    let line = d3
      .line<Coordinate2D>()
      .x((d: Coordinate2D) => xScale(d.x))
      .y((d: Coordinate2D) => yScale(d.y));

    if (shape === LineShape.CURVED) {
      // https://github.com/d3/d3-shape/blob/main/README.md#curves
      line = line.curve(d3.curveBumpX);
    }

    if (range !== undefined) {
      if (filterMode === "defined") {
        line = line.defined(function (value: Coordinate2D) {
          const d = {
            x: xScale(value.x),
            y: yScale(value.y),
          };
          const result =
            d.x <= range.xRange[1] &&
            d.x >= range.xRange[0] &&
            d.y <= range.yRange[0] &&
            d.y >= range.yRange[1];
          return result;
        });
      } else if (filterMode === "clip") {
        const dimensions = {
          width: range.xRange[1] - range.xRange[0],
          height: range.yRange[0] - range.yRange[1],
        };
        const coordinates = {
          x: range.xRange[0],
          y: range.yRange[1],
        };
        this.clearAndClipRect({
          dimensions,
          coordinates,
        });
      }
    }

    const drawLine = line.context(this.context);

    this.context.save();
    this.context?.beginPath();
    drawLine(coordinates);
    this.context?.stroke();
    this.context.restore();
  }

  drawRect({
    coordinates,
    dimensions,
    xScale = defaultScale,
    yScale = defaultScale,
    fill = false,
    stroke = false,
    clip = false,
  }: DrawRectArgs) {
    if (clip) {
      this.context.beginPath();
      this.context.rect(
        xScale(coordinates.x),
        yScale(coordinates.y),
        dimensions.width,
        dimensions.height
      );
      this.context.clip();
      return;
    }

    if (fill) {
      this.context.fillRect(
        xScale(coordinates.x),
        yScale(coordinates.y),
        dimensions.width,
        dimensions.height
      );
    } else if (stroke) {
      this.context.strokeRect(
        xScale(coordinates.x),
        yScale(coordinates.y),
        dimensions.width,
        dimensions.height
      );
    }
  }

  clearArea({
    coordinates,
    dimensions,
    xScale = defaultScale,
    yScale = defaultScale,
  }: {
    coordinates: Coordinate2D;
    dimensions: Dimensions;
    xScale?: (value: any) => number;
    yScale?: (value: any) => number;
  }) {
    this.context.clearRect(
      xScale(coordinates.x),
      yScale(coordinates.y),
      dimensions.width,
      dimensions.height
    );
  }

  clearAndClipRect({
    dimensions,
    coordinates,
  }: {
    dimensions: Dimensions;
    coordinates: Coordinate2D;
  }) {
    if (!this.context) return;
    this.drawRect({
      context: this.context,
      coordinates,
      dimensions,
      clip: true,
    });
  }

  // clearAndClipCircle({
  //   radius,
  //   coordinates,
  // }: {
  //   radius: number;
  //   coordinates: Coordinate2D;
  // }) {
  //   if (this.context) {
  //     this.drawCircle({
  //       context: this.context,
  //       coordinates,
  //       radius,
  //       clip: true,
  //     });
  //     this.clearCanvas();
  //   }
  // }

  modifyContextStyleAndDraw(
    settings: ModifyContextStyleArgs,
    drawFn: () => void
  ) {
    const {
      context: contextArg,
      fillStyle,
      strokeStyle,
      fontSize,
      opacity,
      lineWidth,
      lineDash,
      textAlign,
    } = settings;

    let context = this.context;
    if (contextArg) {
      context = contextArg;
    }

    context.save();

    if (fillStyle) {
      context.fillStyle = fillStyle;
    }

    if (strokeStyle) {
      context.strokeStyle = strokeStyle;
    }

    if (fontSize) {
      context.font = `${fontSize}px Arial`;
    }

    if (opacity) {
      context.globalAlpha = opacity;
    }

    if (lineWidth) {
      context.lineWidth = lineWidth;
    }

    if (lineDash) {
      context.setLineDash(lineDash);
    }

    if (textAlign) {
      context.textAlign = textAlign;
    }

    drawFn();

    context.restore();
  }
}
