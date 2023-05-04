import * as d3 from "d3";
import type { Coordinate2D, Dimensions } from "../../chart";

export const defaultScale = (value: any) => value;

export enum LineShape {
  CURVED = "curved",
  SHARP = "sharp",
}

interface DrawingArgs {
  context: CanvasRenderingContext2D;
  key?: string;
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
  strokeStyle?: string;
  fillStyle?: string;
  fontSize?: number;
  opacity?: number;
  lineWidth?: number;
  lineDash?: number[];
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
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
  contexts: { key: string; context: CanvasRenderingContext2D }[];
  constructor(contexts: { key: string; context: CanvasRenderingContext2D }[]) {
    this.contexts = [...contexts];
  }

  addContext(newContext: { key: string; context: CanvasRenderingContext2D }) {
    this.contexts.push(newContext);
  }

  getContexts(filter?: string[]) {
    let contextsToDraw = this.contexts;

    if (filter) {
      contextsToDraw = contextsToDraw.filter((ctx) => {
        return filter.includes(ctx.key);
      });
    }

    return contextsToDraw;
  }

  removeContext(key: string) {
    let contextsToDraw = this.contexts;

    contextsToDraw = contextsToDraw.filter((ctx) => {
      return key !== ctx.key;
    });

    this.contexts = contextsToDraw;
  }

  drawInContext(
    callbackFn: (context: CanvasRenderingContext2D, key: string) => void,
    filters?: string[]
  ) {
    this.getContexts(filters).forEach(({ context, key }) => {
      callbackFn(context, key);
    });
  }

  drawArrow({
    from,
    to,
    arrowWidth,
    xScale = defaultScale,
    yScale = defaultScale,
    context,
  }: {
    from: Coordinate2D;
    to: Coordinate2D;
    arrowWidth: number;
    xScale?: (value: any) => number;
    yScale?: (value: any) => number;
    context: CanvasRenderingContext2D;
  }) {
    context.save();
    context.lineWidth = arrowWidth;
    const scaledTo = {
      x: xScale(to.x),
      y: yScale(to.y),
    };

    const scaledFrom = {
      x: xScale(from.x),
      y: yScale(from.y),
    };

    //variables to be used when creating the arrow
    const headlen = 10;
    const angle = Math.atan2(
      scaledTo.y - scaledFrom.y,
      scaledTo.x - scaledFrom.x
    );

    //starting path of the arrow from the start square to the end square
    //and drawing the stroke
    context.beginPath();
    context.moveTo(scaledFrom.x, scaledFrom.y);
    context.lineTo(scaledTo.x, scaledTo.y);
    // context.stroke();

    //starting a new path from the head of the arrow to one of the sides of
    //the point
    // context.beginPath();
    context.moveTo(scaledTo.x, scaledTo.y);
    context.lineTo(
      scaledTo.x - headlen * Math.cos(angle - Math.PI / 7),
      scaledTo.y - headlen * Math.sin(angle - Math.PI / 7)
    );

    //path from the side point of the arrow, to the other side point
    context.lineTo(
      scaledTo.x - headlen * Math.cos(angle + Math.PI / 7),
      scaledTo.y - headlen * Math.sin(angle + Math.PI / 7)
    );

    //path from the side point back to the tip of the arrow, and then
    //again to the opposite side point
    context.lineTo(scaledTo.x, scaledTo.y);
    context.lineTo(
      scaledTo.x - headlen * Math.cos(angle - Math.PI / 7),
      scaledTo.y - headlen * Math.sin(angle - Math.PI / 7)
    );

    //draws the paths created above
    context.stroke();
    context.restore();
  }

  drawText({
    coordinates,
    text,
    xScale = defaultScale,
    yScale = defaultScale,
    fill = true,
    stroke = false,
    context,
  }: DrawTextArgs) {
    if (fill) {
      context.fillText(text, xScale(coordinates.x), yScale(coordinates.y));
    }

    if (stroke) {
      context.strokeText(text, xScale(coordinates.x), yScale(coordinates.y));
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
    context,
  }: DrawCircleArgs) {
    if (clip) {
      context.beginPath();
      context.arc(
        xScale(coordinates.x),
        yScale(coordinates.y),
        radius,
        startAngle,
        endAngle,
        false
      );
      context.clip();
      return;
    }

    context.beginPath();
    context.arc(
      xScale(coordinates.x),
      yScale(coordinates.y),
      radius,
      startAngle,
      endAngle,
      false
    );

    if (drawLineToCenter) {
      context.lineTo(xScale(coordinates.x), yScale(coordinates.y));
    }

    if (fill) {
      context.fill();
    }

    if (stroke) {
      context.stroke();
    }
  }

  drawLine({
    coordinates,
    shape = LineShape.CURVED,
    filterMode = "defined",
    range,
    xScale = defaultScale,
    yScale = defaultScale,
    context,
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
    context: CanvasRenderingContext2D;
  }) {
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
        this.clipRect({
          dimensions,
          coordinates,
          context,
        });
      }
    }

    const drawLine = line.context(context);

    context.save();
    context.beginPath();
    drawLine(coordinates);
    context.stroke();
    context.restore();
  }

  drawRect({
    coordinates,
    dimensions,
    xScale = defaultScale,
    yScale = defaultScale,
    fill = false,
    stroke = false,
    clip = false,
    context,
  }: DrawRectArgs) {
    if (clip) {
      context.beginPath();
      context.rect(
        xScale(coordinates.x),
        yScale(coordinates.y),
        dimensions.width,
        dimensions.height
      );
      context.clip();
      return;
    }

    if (fill) {
      context.fillRect(
        xScale(coordinates.x),
        yScale(coordinates.y),
        dimensions.width,
        dimensions.height
      );
    }

    if (stroke) {
      context.strokeRect(
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
    context,
  }: {
    coordinates: Coordinate2D;
    dimensions: Dimensions;
    xScale?: (value: any) => number;
    yScale?: (value: any) => number;
    context: CanvasRenderingContext2D;
  }) {
    context.clearRect(
      xScale(coordinates.x),
      yScale(coordinates.y),
      dimensions.width,
      dimensions.height
    );
  }

  clipRect({
    dimensions,
    coordinates,
    context,
  }: {
    dimensions: Dimensions;
    coordinates: Coordinate2D;
    context: CanvasRenderingContext2D;
  }) {
    this.drawRect({
      context,
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
    drawFn: (context: CanvasRenderingContext2D, key: string) => void,
    filters?: string[]
  ) {
    this.drawInContext((context: CanvasRenderingContext2D, key: string) => {
      const {
        fillStyle,
        strokeStyle,
        fontSize,
        opacity,
        lineWidth,
        lineDash,
        textAlign,
        textBaseline,
      } = settings;

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

      if (textBaseline) {
        context.textBaseline = textBaseline;
      }

      drawFn(context, key);

      context.restore();
    }, filters);
  }
}
