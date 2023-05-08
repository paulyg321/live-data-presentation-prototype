import { LineShape, type DrawingUtils } from "../../drawing";

const AXES_COLOR = "black";

// Extent is usually the min/max
export function drawXAxis(
  drawingUtils: DrawingUtils,
  xScale: any,
  Y: number,
  range: number[],
  fontSize: number,
  tickCount?: number,
  rotateLabels?: boolean,
  drawLine?: boolean,
  bold?: boolean
) {
  const lineWidth = bold ? 2 : 1;
  const [startX, endX] = range;
  const tickPadding = {
    top: 10,
    bottom: 10
  },
    tickSize = 9,
    xTicks = xScale.ticks(tickCount), // You may choose tick counts. ex: xScale.ticks(20)
    xTickFormat = xScale.tickFormat(); // you may choose the format. ex: xScale.tickFormat(tickCount, ".0s")

  drawingUtils.modifyContextStyleAndDraw(
    {
      strokeStyle: AXES_COLOR,
      fontSize,
      lineWidth,
    },
    (context) => {
      xTicks.forEach((d: any) => {
        drawingUtils.drawLine({
          coordinates: [
            { x: d, y: Y + tickPadding.top },
            { x: d, y: Y + tickSize + tickPadding.top },
          ],
          shape: LineShape.SHARP,
          xScale,
          context
        });
      });

      if (drawLine) {
        drawingUtils.drawLine({
          coordinates: [
            { x: startX, y: Y + tickSize },
            { x: startX, y: Y },
            { x: endX, y: Y },
            { x: endX, y: Y + tickSize },
          ],
          shape: LineShape.SHARP,
          context,
        });
      }
    }
  );

  drawingUtils.modifyContextStyleAndDraw(
    {
      strokeStyle: AXES_COLOR,
      fontSize,
      textAlign: "center",
      textBaseline: "top",
      fillStyle: AXES_COLOR,
      bold
    },
    (context) => {
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
          const { width: nextTickLabelWidth } =
            context.measureText(nextTickLabel);
          const xNextTickPos = xScale(nextTick);
          const beginningOfNextTickLabel =
            xNextTickPos - nextTickLabelWidth / 2;

          const positionDiff = beginningOfNextTickLabel - endOfLabel;

          if (positionDiff <= 0) {
            overlap = true;
          }
        }
      });

      xTicks.forEach((d: any) => {
        const label = xTickFormat(d);
        const xPos = xScale(d);
        const yPos = Y + tickSize + tickPadding.bottom + tickPadding.top;

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
  );
}

export function drawYAxis(
  drawingUtils: DrawingUtils,
  yScale: any,
  X: number,
  range: number[],
  fontSize: number,
  tickCount?: number,
  scaleBand?: boolean,
  drawLine?: boolean,
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

  drawingUtils.modifyContextStyleAndDraw(
    {
      strokeStyle: AXES_COLOR,
      fontSize,
    },
    (context) => {
      yTicks.forEach((d: any) => {
        drawingUtils.drawLine({
          coordinates: [
            { x: X, y: d },
            { x: X - tickSize, y: d },
          ],
          shape: LineShape.SHARP,
          yScale,
          context
        });
      });

      if (drawLine) {
        drawingUtils.drawLine({
          coordinates: [
            { x: X - tickSize, y: startY },
            { x: X, y: startY },
            { x: X, y: endY },
            { x: X - tickSize, y: endY },
          ],
          shape: LineShape.SHARP,
          context,
        });
      }
    }
  );

  drawingUtils.modifyContextStyleAndDraw(
    {
      strokeStyle: AXES_COLOR,
      fontSize,
      textAlign: "right",
      textBaseline: "middle",
      fillStyle: AXES_COLOR,
    },
    (context) => {
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
  );
}
