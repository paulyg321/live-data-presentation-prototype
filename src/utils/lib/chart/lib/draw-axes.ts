const AXES_COLOR = "black";

// Extent is usually the min/max
export function drawXAxis(
  context: CanvasRenderingContext2D,
  xScale: any,
  Y: number,
  range: number[],
  fontSize: number,
) {
  const [startX, endX] = range;
  const tickSize = 6,
    xTicks = xScale.ticks(), // You may choose tick counts. ex: xScale.ticks(20)
    xTickFormat = xScale.tickFormat(); // you may choose the format. ex: xScale.tickFormat(tickCount, ".0s")

  context.strokeStyle = AXES_COLOR;

  context.beginPath();
  xTicks.forEach((d: any) => {
    context.moveTo(xScale(d), Y);
    context.lineTo(xScale(d), Y + tickSize);
  });
  context.stroke();

  context.beginPath();
  context.moveTo(startX, Y + tickSize);
  context.lineTo(startX, Y);
  context.lineTo(endX, Y);
  context.lineTo(endX, Y + tickSize);
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = AXES_COLOR;
  xTicks.forEach((d: any) => {
    context.beginPath();
    context.font = `${fontSize}px Arial`;
    context.fillText(xTickFormat(d), xScale(d), Y + tickSize);
  });
}

export function drawYAxis(
  context: CanvasRenderingContext2D,
  yScale: any,
  X: number,
  range: number[],
  fontSize: number,
) {
  const [startY, endY] = range;
  const tickPadding = 3,
    tickSize = 6,
    yTicks = yScale.ticks(10),
    yTickFormat = yScale.tickFormat();

  context.strokeStyle = AXES_COLOR;
  context.beginPath();
  yTicks.forEach((d: any) => {
    context.moveTo(X, yScale(d));
    context.lineTo(X - tickSize, yScale(d));
  });
  context.stroke();

  context.beginPath();
  context.moveTo(X - tickSize, startY);
  context.lineTo(X, startY);
  context.lineTo(X, endY);
  context.lineTo(X - tickSize, endY);
  context.stroke();

  context.textAlign = "right";
  context.textBaseline = "middle";
  context.fillStyle = AXES_COLOR;
  yTicks.forEach((d: any) => {
    context.beginPath();
    context.font = `${fontSize}px Arial`;
    context.fillText(yTickFormat(d), X - tickSize - tickPadding, yScale(d));
  });
}
