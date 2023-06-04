import * as d3 from "d3";
import {
  type AnimatedChartElementArgs,
  type D3ScaleTypes,
  type Coordinate2D,
  MAX_DOMAIN_Y,
  ForeshadowingStatesMode,
  AnimatedElement,
  type HandleForeshadowArgs,
  type HandleForeshadowReturnValue,
  type HandleSelectionArgs,
  type HandleSelectionReturnValue,
  type VisualState,
  type SVGPrimitive,
  FORESHADOW_OPACITY,
} from "@/utils";

const padding = 5;

export class AnimatedBar extends AnimatedElement {
  constructor(args: AnimatedChartElementArgs) {
    super(args);
  }

  handleForeshadowTrajectory(
    args: HandleForeshadowArgs
  ): HandleForeshadowReturnValue {
    const FONT_SIZE = 16;
    let opacity = 0;
    const {
      itemAnimationState,
      itemUnscaledPosition,
      index,
      finalForeshadowingIndex,
    } = args;

    const currentUnscaledData =
      this.controllerState.unscaledData[
        this.controllerState.currentKeyframeIndex
      ];

    const isForeshadowed = this.controllerState.isForeshadowed;

    if (index <= finalForeshadowingIndex && isForeshadowed) {
      const margin = 30;

      const lastPosition = this.controllerState.unscaledData[index - 1];

      const { topRight: currentBarTopRight } =
        AnimatedBar.createRectDataFromCoordinate({
          coordinate: currentUnscaledData,
          xScale: this.controllerState.xScale,
          yScale: this.controllerState.yScale,
        });
      const {
        rectDimensions: { height: diameter },
        topRight: foreshadowedBarTopRight,
      } = AnimatedBar.createRectDataFromCoordinate({
        coordinate: itemUnscaledPosition,
        xScale: this.controllerState.xScale,
        yScale: this.controllerState.yScale,
      });
      const { topRight: lastPositionBarTopRight } =
        AnimatedBar.createRectDataFromCoordinate({
          coordinate: lastPosition,
          xScale: this.controllerState.xScale,
          yScale: this.controllerState.yScale,
        });

      const radius = diameter / 2;
      const indexDiff = index - this.controllerState.currentKeyframeIndex - 1;
      const marginSum = (margin + diameter) * indexDiff + (margin + radius);

      const foreshadowElementCoords = {
        x: currentBarTopRight.x + marginSum,
        y: foreshadowedBarTopRight.y + radius,
      };

      const lastPositionElementCoords = {
        x: currentBarTopRight.x + marginSum - (margin + diameter),
        y: lastPositionBarTopRight.y + radius,
      };

      const circleBounds = {
        x: foreshadowElementCoords.x + radius,
        y: foreshadowElementCoords.y + radius,
      };
      const [_, maxRight] = this.controllerState.xScale.range() as number[];
      const [__, maxBottom] = this.controllerState.yScale.range() as number[];

      const isOffChart = circleBounds.x > maxRight;
      const isBelowLastValue = circleBounds.y > maxBottom;

      if (!isOffChart) {
        opacity = FORESHADOW_OPACITY;
        // is next index
        itemAnimationState.label = {
          position: {
            ...foreshadowElementCoords,
            y: foreshadowElementCoords.y + FONT_SIZE / 2,
          },
          fontSize: FONT_SIZE,
          text: itemUnscaledPosition.y ? itemUnscaledPosition.y.toString() : "",
          align: "center",
        };

        itemAnimationState.line = {
          start: lastPositionElementCoords,
          end: foreshadowElementCoords,
          lineWidth: 3,
        };

        // CENTER COORDINATES OF THE CURRENT STATE
        itemAnimationState.position = foreshadowElementCoords;
        itemAnimationState.dimensions = {
          width: diameter,
          height: diameter,
        };

        if (isBelowLastValue) {
          itemAnimationState.arrow = {
            end: {
              x: foreshadowElementCoords.x,
              y: foreshadowElementCoords.y + radius,
            },
            start: {
              x: foreshadowElementCoords.x,
              y: foreshadowElementCoords.y - radius,
            },
            arrowWidth: radius,
          };
          itemAnimationState.circle = undefined;
          itemAnimationState.rect = undefined;
        } else {
          itemAnimationState.circle = {
            position: foreshadowElementCoords,
            radius,
          };
          itemAnimationState.arrow = undefined;
          itemAnimationState.rect = undefined;
        }
      }
    }

    return {
      shouldPulse: index === finalForeshadowingIndex && isForeshadowed,
      opacity: isForeshadowed ? opacity : 0,
    };
  }

  handleForeshadowPoint(
    args: HandleForeshadowArgs
  ): HandleForeshadowReturnValue {
    const FONT_SIZE = 16;
    const {
      itemAnimationState,
      itemUnscaledPosition,
      index,
      finalForeshadowingIndex,
    } = args;

    const isForeshadowed = this.controllerState.isForeshadowed;

    let opacity = 0;
    let shouldPulse = false;
    if (index === finalForeshadowingIndex && isForeshadowed) {
      shouldPulse = true;
      opacity = FORESHADOW_OPACITY;
      const [_, endYrange] = this.controllerState.yScale.range() as number[];
      const [startXrange, endXrange] =
        this.controllerState.xScale.range() as number[];

      const { rectDimensions, topLeft } =
        AnimatedBar.createRectDataFromCoordinate({
          coordinate: itemUnscaledPosition,
          xScale: this.controllerState.xScale,
          yScale: this.controllerState.yScale,
        });
      const margin = 20;

      itemAnimationState.position = topLeft;
      itemAnimationState.dimensions = rectDimensions;

      itemAnimationState.label = {
        position: {
          x: topLeft.x + 10,
          y: topLeft.y + rectDimensions.height * 0.5 + FONT_SIZE / 2,
        },
        fontSize: FONT_SIZE,
        text: this.controllerState.selectionKey,
        align: "start",
      };
      itemAnimationState.line = undefined;

      const isBelowLastValue = topLeft.y >= endYrange;

      if (isBelowLastValue) {
        const chartMidPoint = startXrange + (endXrange - startXrange) / 2;
        const chartEnd = endYrange;
        itemAnimationState.label = {
          position: {
            x: chartMidPoint,
            y: chartEnd - rectDimensions.height / 2,
          },
          fontSize: FONT_SIZE,
          text: itemUnscaledPosition.y ? itemUnscaledPosition.y.toString() : "",
          align: "center",
        };

        itemAnimationState.arrow = {
          start: {
            x: chartMidPoint,
            y: chartEnd - rectDimensions.height / 2 - margin,
          },
          end: {
            x: chartMidPoint,
            y: chartEnd - margin,
          },
          arrowWidth: rectDimensions.height / 2,
        };
        itemAnimationState.circle = undefined;
        itemAnimationState.rect = undefined;
      } else {
        itemAnimationState.circle = undefined;
        itemAnimationState.arrow = undefined;

        itemAnimationState.rect = {
          position: topLeft,
          dimensions: rectDimensions,
        };
      }
    }

    return {
      opacity: isForeshadowed ? opacity : 0,
      shouldPulse: isForeshadowed ? shouldPulse : false,
    };
  }

  // -------------------------------------- SETTERS --------------------------------------

  handleSelection(args: HandleSelectionArgs): HandleSelectionReturnValue {
    const { itemUnscaledPosition } = args;
    const { rectDimensions, topLeft: position } =
      AnimatedBar.createRectDataFromCoordinate({
        coordinate: itemUnscaledPosition,
        xScale: this.controllerState.xScale,
        yScale: this.controllerState.yScale,
      });

    const modifiedDimensions = {
      width: rectDimensions.width + padding,
      height: rectDimensions.height + padding,
    };

    const modifiedPosition = {
      x: position.x - padding / 2,
      y: position.y - padding / 2,
    };

    return {
      position: modifiedPosition,
      dimensions: modifiedDimensions,
    };
  }

  handleMainUpdate(args: HandleSelectionArgs): HandleSelectionReturnValue {
    const { rectDimensions, topLeft: position } =
      AnimatedBar.createRectDataFromCoordinate({
        coordinate: args.itemUnscaledPosition,
        xScale: this.controllerState.xScale,
        yScale: this.controllerState.yScale,
      });

    return {
      position,
      dimensions: rectDimensions,
    };
  }

  static createRectDataFromCoordinate({
    coordinate,
    xScale,
    yScale,
  }: {
    coordinate: Coordinate2D;
    xScale: D3ScaleTypes;
    yScale: D3ScaleTypes;
  }) {
    if (coordinate.x === undefined || coordinate.y === undefined) {
      return {
        rectDimensions: { width: 0, height: 0 },
        topLeft: { x: 0, y: MAX_DOMAIN_Y },
        topRight: { x: 0, y: MAX_DOMAIN_Y },
        bottomLeft: { x: 0, y: MAX_DOMAIN_Y },
        bottomRight: { x: 0, y: MAX_DOMAIN_Y },
      };
    }

    const margin = 5;
    const nextRectHorizontalPosition = coordinate.y + 1;
    const top = yScale(coordinate.y) as number;
    const bottom = ((yScale(nextRectHorizontalPosition) as number) -
      margin) as number;
    const left = xScale(0) as number;
    const right = xScale(coordinate.x) as number;

    const topLeft = {
      x: left,
      y: top,
    };

    const topRight = {
      x: right,
      y: top,
    };
    const bottomLeft = {
      x: left,
      y: bottom,
    };
    const bottomRight = {
      x: right,
      y: bottom,
    };

    const rectDimensions = {
      height:
        (yScale(nextRectHorizontalPosition) as number) -
        (yScale(coordinate.y) as number) -
        margin,
      width: (xScale(coordinate.x) as number) - (xScale(0) as number),
    };

    return {
      rectDimensions,
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
    };
  }

  drawCurrentState() {
    const color = this.animationState.color;
    const { opacity, path, label, position, dimensions } =
      this.animationState.current;
    const { opacity: selectionOpacity } = this.animationState.selection;

    const textPosition = {
      x: position.x + 10,
      y: position.y + dimensions.height * 0.5 + (label?.fontSize ?? 0) / 2,
    };

    const selectionLabelPosition = {
      x: position.x + dimensions.width + 10,
      y: position.y + dimensions.height * 0.5 + (label?.fontSize ?? 0) / 2,
    };

    if (!path) return;

    path.parsedPath.forEach((parsedPath: any, index: number) => {
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          strokeStyle: color,
          fillStyle: index % 2 === 0 ? color : "white",
          opacity,
          shadow: true,
        },
        (context: CanvasRenderingContext2D) => {
          this.controllerState.clipBoundaries(context);
          context.translate(position.x, position.y);
          context.scale(
            dimensions.width / path.xScale,
            dimensions.height / path.yScale
          );
          this.controllerState.drawingUtils.drawPath({
            path: parsedPath,
            mode: "fill",
            context,
          });
        }
      );
    });

    if (label) {
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          fillStyle: "white",
          opacity: opacity,
          fontSize: label.fontSize,
          textAlign: label.align as CanvasTextAlign,
        },
        (context: CanvasRenderingContext2D) => {
          this.controllerState.clipBoundaries(context);
          this.controllerState.drawingUtils.drawText({
            text: label.text,
            coordinates: textPosition,
            context,
          });
        }
      );
    }

    if (this.controllerState.selectionLabelKey && selectionOpacity) {
      const key = this.controllerState.selectionLabelKey;
      const labelText =
        this.controllerState.unscaledData[
          this.controllerState.currentKeyframeIndex
        ][key].toLocaleString();
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          fillStyle: "white",
          opacity: selectionOpacity,
          shadow: true,
          fontSize: label?.fontSize,
          textAlign: label?.align as CanvasTextAlign,
        },
        (context: CanvasRenderingContext2D) => {
          this.controllerState.clipBoundaries(context);
          this.controllerState.drawingUtils.drawText({
            text: labelText,
            coordinates: selectionLabelPosition,
            context,
          });
        }
      );
    }
  }

  drawForeshadowingState() {
    const color = this.animationState.color;
    // Draw Lines first
    Object.values(this.animationState.foreshadow).map((value: VisualState) => {
      const { line, opacity } = value;

      if (!line) return;
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          strokeStyle: color,
          lineWidth: line?.lineWidth,
          opacity,
        },
        (context: CanvasRenderingContext2D) => {
          // this.controllerState.clipBoundaries(context);
          this.controllerState.drawingUtils.drawLine({
            coordinates: [line.start, line.end],
            context,
          });
        }
      );
    });
    Object.values(this.animationState.foreshadow).map((value: VisualState) => {
      const { opacity, label, arrow, circle, rect } = value;

      if (opacity === 0) return;

      const applyLineDash =
        !arrow &&
        this.controllerState.foreshadowingMode ===
          ForeshadowingStatesMode.TRAJECTORY;

      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          fillStyle: "white",
          strokeStyle: color,
          lineWidth: 3,
          opacity,
          lineDash: applyLineDash ? [4, 4] : undefined,
        },
        (context: CanvasRenderingContext2D) => {
          // this.controllerState.clipBoundaries(context);
          if (arrow) {
            this.controllerState.drawingUtils.drawArrow({
              context,
              from: arrow.start,
              to: arrow.end,
              arrowWidth: arrow.arrowWidth,
            });
            context.save();
            context.strokeStyle = "white";
            this.controllerState.drawingUtils.drawArrow({
              context,
              from: arrow.start,
              to: arrow.end,
              arrowWidth: arrow.arrowWidth * 0.8,
            });
            context.restore();
          } else if (circle) {
            this.controllerState.drawingUtils.drawCircle({
              coordinates: circle.position,
              radius: circle.radius,
              context,
              stroke: true,
              fill: true,
            });
          } else if (rect) {
            this.controllerState.drawingUtils.drawRect({
              coordinates: rect.position,
              dimensions: rect.dimensions,
              context,
              stroke: true,
              fill: true,
            });
          }
        }
      );

      if (!label) return;

      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          fillStyle: color,
          strokeStyle: color,
          // lineWidth: 3,
          opacity: opacity,
          fontSize: label.fontSize,
          textAlign: label.align as CanvasTextAlign,
        },
        (context: CanvasRenderingContext2D) => {
          // this.controllerState.clipBoundaries(context);
          this.controllerState.drawingUtils.drawText({
            text: label.text,
            coordinates: label.position,
            context,
          });
        }
      );
    });
  }
}
