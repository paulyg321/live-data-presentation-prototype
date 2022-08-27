// Extent is usually the min/max
export function drawXAxis(
  context: CanvasRenderingContext2D,
  xScale: any,
  Y: number,
  xExtent: number[]
) {
  const [startX, endX] = xExtent;
  const tickSize = 6,
    xTicks = xScale.ticks(), // You may choose tick counts. ex: xScale.ticks(20)
    xTickFormat = xScale.tickFormat(); // you may choose the format. ex: xScale.tickFormat(tickCount, ".0s")

  context.strokeStyle = "black";

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
  context.fillStyle = "black";
  xTicks.forEach((d: any) => {
    context.beginPath();
    context.fillText(xTickFormat(d), xScale(d), Y + tickSize);
  });
}

export function drawYAxis(
  context: CanvasRenderingContext2D,
  yScale: any,
  X: number,
  yExtent: number[]
) {
  const [startY, endY] = yExtent;
  const tickPadding = 3,
    tickSize = 6,
    yTicks = yScale.ticks(10),
    yTickFormat = yScale.tickFormat();

  context.strokeStyle = "black";
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
  context.fillStyle = "black";
  yTicks.forEach((d: any) => {
    context.beginPath();
    context.fillText(yTickFormat(d), X - tickSize - tickPadding, yScale(d));
  });
}