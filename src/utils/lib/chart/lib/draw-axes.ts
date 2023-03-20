const AXES_COLOR = "black";

// Extent is usually the min/max
export function drawXAxis(
  context: CanvasRenderingContext2D,
  xScale: any,
  Y: number,
  range: number[],
  fontSize: number,
  tickCount?: number,
  rotateLabels?: boolean
) {
  const [startX, endX] = range;
  const tickPadding = 3,
    tickSize = 6,
    xTicks = xScale.ticks(tickCount), // You may choose tick counts. ex: xScale.ticks(20)
    xTickFormat = xScale.tickFormat(); // you may choose the format. ex: xScale.tickFormat(tickCount, ".0s")

  context.strokeStyle = AXES_COLOR;
  context.font = `${fontSize}px Arial`;

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

  // Determine if there's overlap
  let overlap = false;
  xTicks.forEach((d: any, index: number) => {
    const nextTick = xTicks.at(index + 1);

    if (nextTick) {
      const label = xTickFormat(d);
      const xPos = xScale(d);
      const { width } = context.measureText(label);
      const endOfLabel = xPos + width / 2;

      const nextTickLabel = xTickFormat(nextTick);
      const { width: nextTickLabelWidth } = context.measureText(nextTickLabel);
      const xNextTickPos = xScale(nextTick);
      const beginningOfNextTickLabel = xNextTickPos - nextTickLabelWidth / 2;

      const positionDiff = beginningOfNextTickLabel - endOfLabel;

      if (positionDiff <= 0) {
        overlap = true;
      }
    }
  });

  xTicks.forEach((d: any) => {
    const label = xTickFormat(d);
    const xPos = xScale(d);
    const yPos = Y + tickSize + tickPadding;

    // rotate if there's overlaps
    if (overlap || rotateLabels) {
      context.save();
      context.textAlign = "right";
      // https://stackoverflow.com/questions/3167928/drawing-rotated-text-on-a-html5-canvas
      context.translate(xPos, yPos);
      context.rotate(-Math.PI / 2);
      context.fillText(label, -tickSize, -(fontSize / 2));
      context.beginPath();
      context.restore();
      return;
    }

    context.fillText(label, xPos, yPos);
    context.beginPath();
  });
}

export function drawYAxis(
  context: CanvasRenderingContext2D,
  yScale: any,
  X: number,
  range: number[],
  fontSize: number,
  tickCount?: number,
  scaleBand?: boolean
) {
  const [startY, endY] = range;
  const tickPadding = 3,
    tickSize = 6;

  let yTickFormat = (input: any) => input;
  let yTicks = yScale.domain();

  if (!scaleBand) {
    yTickFormat = yScale.tickFormat();
    yTicks = yScale.ticks(tickCount);
  }

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

  let labelAdjustment = 0;

  if (scaleBand) {
    const [firstLabel, secondLabel] = yTicks;

    const distanceBetweenTicks = Math.abs(
      yScale(firstLabel) - yScale(secondLabel)
    );

    labelAdjustment = distanceBetweenTicks / 2;
  }

  yTicks.forEach((d: any) => {
    context.beginPath();
    context.font = `${fontSize}px Arial`;
    context.fillText(
      yTickFormat(d),
      X - tickSize - tickPadding,
      yScale(d) + labelAdjustment
    );
  });
}
