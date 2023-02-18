import type { Coordinate2D, Dimensions } from "../../chart";

const defaultScale = (value: any) => value;

export interface DrawCircleArgs {
  context: CanvasRenderingContext2D;
  coordinates: Coordinate2D;
  radius: number;
  startAngle?: number;
  endAngle?: number;
  xScale?: (value: any) => number;
  yScale?: (value: any) => number;
  fill?: boolean;
  stroke?: boolean;
  strokeStyle?: string;
  fillStyle?: string;
}

export interface DrawRectArgs {
  context: CanvasRenderingContext2D;
  coordinates: Coordinate2D;
  dimensions: Dimensions;
  xScale?: (value: any) => number;
  yScale?: (value: any) => number;
  fill?: boolean;
  stroke?: boolean;
  strokeStyle?: string;
  fillStyle?: string;
}

export interface DrawTextArgs {
  context: CanvasRenderingContext2D;
  coordinates: Coordinate2D;
  text: string;
  xScale?: (value: any) => number;
  yScale?: (value: any) => number;
  font?: string;
  fill?: boolean;
  stroke?: boolean;
  strokeStyle?: string;
  fillStyle?: string;
}

export function drawText({
  context,
  coordinates,
  text,
  xScale = defaultScale,
  yScale = defaultScale,
  font,
  fill = true,
  stroke = false,
  strokeStyle,
  fillStyle,
}: DrawTextArgs) {
  context.save();

  modifyContextStyle({
    context,
    fillStyle,
    strokeStyle,
    font,
  });

  if (fill) {
    context.fillText(text, xScale(coordinates.x), yScale(coordinates.y));
  }

  if (stroke) {
    context.strokeText(text, xScale(coordinates.x), yScale(coordinates.y));
  }
  context.restore();
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
  stroke = true,
  strokeStyle,
  fillStyle,
}: DrawCircleArgs) {
  context.save();

  modifyContextStyle({
    context,
    fillStyle,
    strokeStyle,
  });

  context.beginPath();
  context.arc(
    xScale(coordinates.x),
    yScale(coordinates.y),
    radius,
    startAngle,
    endAngle,
    false
  );

  if (fill) {
    context.fill();
  }

  if (stroke) {
    context.stroke();
  }

  context.restore();
}

export function drawRect({
  context,
  coordinates,
  dimensions,
  xScale = defaultScale,
  yScale = defaultScale,
  fill = false,
  stroke = true,
  strokeStyle,
  fillStyle,
}: DrawRectArgs) {
  context.save();

  modifyContextStyle({
    context,
    fillStyle,
    strokeStyle,
  });

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
  context.restore();
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

export function modifyContextStyle({
  context,
  fillStyle,
  strokeStyle,
  font,
}: {
  context: CanvasRenderingContext2D;
  strokeStyle?: string;
  fillStyle?: string;
  font?: string;
}) {
  if (fillStyle) {
    context.fillStyle = fillStyle;
  }

  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
  }

  if (font) {
    context.font = font;
  }
}
