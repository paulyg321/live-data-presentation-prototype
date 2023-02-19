import type { Coordinate2D, Dimensions } from "../../chart";

const defaultScale = (value: any) => value;

interface DrawingArgs {
  context: CanvasRenderingContext2D;
  coordinates: Coordinate2D;
  xScale?: (value: any) => number;
  yScale?: (value: any) => number;
  fill?: boolean;
  stroke?: boolean;
  strokeStyle?: string;
  fillStyle?: string;
  opacity?: number;
  clip?: boolean;
}

export interface ModifyContextStyleArgs {
  context: CanvasRenderingContext2D;
  strokeStyle?: string;
  fillStyle?: string;
  fontSize?: number;
  opacity?: number;
  lineWidth?: number;
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
}

export function drawText({
  context,
  coordinates,
  text,
  xScale = defaultScale,
  yScale = defaultScale,
  fontSize,
  fill = true,
  stroke = false,
  strokeStyle,
  fillStyle,
  opacity,
}: DrawTextArgs) {
  const settings = {
    context,
    fillStyle,
    strokeStyle,
    fontSize,
    opacity,
  };

  function drawFn() {
    if (fill) {
      context.fillText(text, xScale(coordinates.x), yScale(coordinates.y));
    }

    if (stroke) {
      context.strokeText(text, xScale(coordinates.x), yScale(coordinates.y));
    }
  }

  modifyContextStyleAndDraw(settings, drawFn);
}

export function drawCircle({
  context,
  coordinates,
  radius,
  startAngle = 0,
  endAngle = 2 * Math.PI,
  xScale = defaultScale,
  yScale = defaultScale,
  fill = false,
  stroke = false,
  clip = false,
  strokeStyle,
  fillStyle,
  drawLineToCenter = false,
  opacity,
}: DrawCircleArgs) {
  const settings = {
    context,
    fillStyle,
    strokeStyle,
    opacity,
  };

  function drawFn() {
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

    if (clip) {
      context.clip();
    }

    if (fill) {
      context.fill();
    }

    if (stroke) {
      context.stroke();
    }
  };

  modifyContextStyleAndDraw(settings, drawFn);
}

export function drawLine({
  context,
  startCoordinates,
  endCoordinates,
  strokeStyle,
  lineWidth,
}: DrawLineArgs) {
  const settings = {
    context,
    strokeStyle,
    lineWidth,
  };

  function drawFn() {
    context.beginPath();
    context.moveTo(startCoordinates.x, startCoordinates.y);
    context.lineTo(endCoordinates.x, endCoordinates.y);
    context.stroke();
  };

  modifyContextStyleAndDraw(settings, drawFn);
}

export function drawRect({
  context,
  coordinates,
  dimensions,
  xScale = defaultScale,
  yScale = defaultScale,
  fill = false,
  stroke = false,
  clip = false,
  strokeStyle,
  fillStyle,
  opacity,
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

  const settings = {
    context,
    fillStyle,
    strokeStyle,
    opacity,
  };

  function drawFn() {
    if (fill) {
      context.fillRect(
        xScale(coordinates.x),
        yScale(coordinates.y),
        dimensions.width,
        dimensions.height
      );
    } else if (stroke) {
      context.strokeRect(
        xScale(coordinates.x),
        yScale(coordinates.y),
        dimensions.width,
        dimensions.height
      );
    }
  };

  modifyContextStyleAndDraw(settings, drawFn);
}

export function clearArea({
  context,
  coordinates,
  dimensions,
  xScale = defaultScale,
  yScale = defaultScale,
}: {
  context: CanvasRenderingContext2D;
  coordinates: Coordinate2D;
  dimensions: Dimensions;
  xScale?: (value: any) => number;
  yScale?: (value: any) => number;
}) {
  context.clearRect(
    xScale(coordinates.x),
    yScale(coordinates.y),
    dimensions.width,
    dimensions.height
  );
}

export function modifyContextStyleAndDraw(
  settings: ModifyContextStyleArgs,
  drawFn: () => void
) {
  const { context, fillStyle, strokeStyle, fontSize, opacity, lineWidth } =
    settings;

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

  drawFn();

  context.restore();
}
