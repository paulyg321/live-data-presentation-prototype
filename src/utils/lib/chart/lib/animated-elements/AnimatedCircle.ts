import * as d3 from "d3";
import {
  type AnimatedChartElementArgs,
  type Coordinate2D,
  LineShape,
  ForeshadowingStatesMode,
  AnimatedElement,
  type HandleForeshadowArgs,
  type HandleForeshadowReturnValue,
  type HandleSelectionArgs,
  type HandleSelectionReturnValue,
  type VisualState,
  TRANSPARENT,
  isInBound,
  type Dimensions,
} from "@/utils";

const RADIUS = 10;

export class AnimatedCircle extends AnimatedElement {
  constructor(args: AnimatedChartElementArgs) {
    super(args);
  }

  handleForeshadowTrajectory(
    args: HandleForeshadowArgs
  ): HandleForeshadowReturnValue {
    const FONT_SIZE = 16;
    let opacity = TRANSPARENT;
    const {
      itemAnimationState,
      itemUnscaledPosition,
      index,
      finalForeshadowingIndex,
    } = args;

    const isForeshadowed = this.controllerState.isForeshadowed;
    if (index <= finalForeshadowingIndex && isForeshadowed) {
      const position = {
        x: this.controllerState.xScale(itemUnscaledPosition.x) as number,
        y: this.controllerState.yScale(itemUnscaledPosition.y) as number,
      };

      const [_, maxRight] = this.controllerState.xScale.range() as number[];
      const [maxBottom, __] = this.controllerState.yScale.range() as number[];

      const isOffChart = position.x > maxRight;
      const isBelowLastValue = position.y > maxBottom;

      if (!isOffChart && !isBelowLastValue) {
        opacity = this.controllerState.foreshadowOpacity;
        itemAnimationState.position = position;
        itemAnimationState.dimensions = {
          width: RADIUS * 2,
          height: RADIUS * 2,
        };
      } else {
        itemAnimationState.position = {
          x: 0,
          y: 0,
        };
        itemAnimationState.dimensions = {
          width: 0,
          height: 0,
        };
      }
    }

    return {
      shouldPulse: true,
      opacity,
    };
  }

  handleForeshadowPoint(
    args: HandleForeshadowArgs
  ): HandleForeshadowReturnValue {
    const {
      itemAnimationState,
      itemUnscaledPosition,
      index,
      finalForeshadowingIndex,
    } = args;

    let opacity = TRANSPARENT;
    let shouldPulse = false;
    if (
      index === finalForeshadowingIndex &&
      this.controllerState.isForeshadowed
    ) {
      shouldPulse = true;
      opacity = this.controllerState.foreshadowOpacity;
      const position = {
        x: this.controllerState.xScale(itemUnscaledPosition.x) as number,
        y: this.controllerState.yScale(itemUnscaledPosition.y) as number,
      };

      const [_, maxRight] = this.controllerState.xScale.range() as number[];
      const [maxBottom, __] = this.controllerState.yScale.range() as number[];

      const isOffChart = position.x > maxRight;
      const isBelowLastValue = position.y > maxBottom;

      if (!isOffChart && !isBelowLastValue) {
        opacity = this.controllerState.foreshadowOpacity;
        itemAnimationState.position = position;
        itemAnimationState.dimensions = {
          width: RADIUS * 2,
          height: RADIUS * 2,
        };
      } else {
        itemAnimationState.position = {
          x: 0,
          y: 0,
        };
        itemAnimationState.dimensions = {
          width: 0,
          height: 0,
        };
      }
    }

    return {
      opacity,
      shouldPulse,
    };
  }

  // -------------------------------------- SETTERS --------------------------------------

  handleSelection(args: HandleSelectionArgs): HandleSelectionReturnValue {
    const { itemUnscaledPosition } = args;
    let radius = RADIUS;

    if (this.controllerState.zScale && itemUnscaledPosition.size) {
      radius = this.controllerState.zScale(itemUnscaledPosition.size) as number;
    }

    const offset = radius;
    const padding = 5;

    const position = {
      x:
        (this.controllerState.xScale(itemUnscaledPosition.x) as number) -
        offset -
        padding / 2,
      y:
        (this.controllerState.yScale(itemUnscaledPosition.y) as number) -
        offset -
        padding / 2,
    };

    const dimensions = {
      width: radius * 2 + padding,
      height: radius * 2 + padding,
    };

    return {
      position,
      dimensions,
    };
  }

  handleMainUpdate(args: HandleSelectionArgs): HandleSelectionReturnValue {
    const { itemUnscaledPosition } = args;
    let radius = RADIUS;

    if (this.controllerState.zScale && itemUnscaledPosition.size) {
      radius = this.controllerState.zScale(itemUnscaledPosition.size) as number;
    }

    const offset = radius;
    const position = {
      x:
        (this.controllerState.xScale(itemUnscaledPosition.x) as number) -
        offset,
      y:
        (this.controllerState.yScale(itemUnscaledPosition.y) as number) -
        offset,
    };

    const dimensions = {
      width: radius * 2,
      height: radius * 2,
    };

    return {
      position,
      dimensions,
    };
  }

  drawCurrentState() {
    const color = this.animationState.color;
    const { opacity, path, label, position, dimensions, pastTrajectory } =
      this.animationState.current;
    const {
      opacity: selectionOpacity,
      path: selectionPath,
      position: selectionPosition,
      dimensions: selectionDims,
    } = this.animationState.selection;

    const selectionLabelPosition = {
      x: position.x + dimensions.width + 10,
      y: position.y + dimensions.height * 0.5 + (label?.fontSize ?? 0) / 2,
    };

    if (pastTrajectory) {
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          strokeStyle: "red",
          lineWidth: 3,
          opacity,
          fillStyle: "red",
        },
        (context: CanvasRenderingContext2D) => {
          this.controllerState.drawingUtils.drawLine({
            coordinates: pastTrajectory.map((traj) => ({
              x: traj.x,
              y: traj.y,
            })),
            shape: LineShape.SHARP,
            context,
            drawArrowHead: false,
          });
        }
      );
    }

    if (selectionPath && selectionOpacity) {
      const key = this.controllerState.selectionLabelKey;

      if (key) {
        this.controllerState.drawingUtils.modifyContextStyleAndDraw(
          {
            strokeStyle: "white",
            fillStyle: "white",
            opacity: selectionOpacity,
            shadow: true,
            fontSize: 16,
          },
          (context: CanvasRenderingContext2D) => {
            const labelText =
              this.controllerState.unscaledData[
                this.controllerState.currentKeyframeIndex
              ][key].toLocaleString();

            // If the label has already been added, draw it at the position it was added
            if (this.controllerState.quadTree?.set.has(labelText)) {
              const labelPosition =
                this.controllerState.quadTree.set.get(labelText);
              if (!labelPosition) return;
              this.controllerState.drawingUtils.drawText({
                text: labelText,
                coordinates: labelPosition,
                context,
              });

              // Draw a line between the label position and the position
              this.controllerState.drawingUtils.drawLine({
                coordinates: [
                  { x: labelPosition.x, y: labelPosition.y - 5 },
                  { x: position.x, y: position.y - 5 },
                ],
                context,
              });

              return;
            }

            // Create a rectangle for the new text element
            const textWidth = context.measureText(labelText).width;
            const textHeight = 16; // The font size
            const newTextElement = {
              x: selectionLabelPosition.x,
              y: selectionLabelPosition.y,
              width: textWidth,
              height: textHeight,
            };

            // Check if the new text element overlaps with any existing text elements
            let overlappingElement = this.controllerState.quadTree?.tree.find(
              newTextElement.x,
              newTextElement.y,
              newTextElement.height * 2
            );

            // If the new text element overlaps with an existing text element, adjust its position
            let attempts = 0;
            const maxAttempts = 100; // Limit the number of attempts to prevent an infinite loop
            while (overlappingElement && attempts < maxAttempts) {
              // Move the new text element in a certain direction (e.g., to the right)
              newTextElement.y += textHeight * 2;

              // Check for overlaps again
              overlappingElement = this.controllerState.quadTree?.tree.find(
                newTextElement.x,
                newTextElement.y,
                newTextElement.height * 2
              );

              attempts++;
            }

            // Draw the new text element
            this.controllerState.drawingUtils.drawText({
              text: labelText,
              coordinates: { x: newTextElement.x, y: newTextElement.y },
              context,
            });

            // Draw a line between the new text element position and the position
            this.controllerState.drawingUtils.drawLine({
              coordinates: [
                { x: newTextElement.x, y: newTextElement.y - 5 },
                { x: position.x, y: position.y - 5 },
              ],
              context,
            });

            // Add the new text element to the Quadtree
            this.controllerState.quadTree?.tree.add(newTextElement);

            // Add the label and its position to the Map of added labels
            this.controllerState.quadTree?.set.set(labelText, {
              x: newTextElement.x,
              y: newTextElement.y,
            });
          }
        );
      }
    }

    if (!path) return;
    path.parsedPath.forEach((parsedPath: any, index: number) => {
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          opacity,
          strokeStyle: color,
          fillStyle: index % 2 === 0 ? color : "white",
          shadow: this.controllerState.activeSelection
            ? !!(selectionPath && selectionOpacity)
            : true,
        },
        (context: CanvasRenderingContext2D) => {
          context.translate(
            position.x - dimensions.width / 2,
            position.y - dimensions.height / 2
          );
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
  }

  private generateLineData() {
    const finalPath: Coordinate2D[] = [];
    let finalOpacity = TRANSPARENT;
    const { dimensions } = this.animationState.current;

    Object.values(this.animationState.foreshadow).forEach(
      (value: VisualState) => {
        const { position, opacity } = value;

        if (opacity) {
          finalPath.push({
            x: position.x - dimensions.width / 2,
            y: position.y - dimensions.height / 2,
          });
          finalOpacity = opacity;
        }
      }
    );

    return {
      opacity: finalOpacity,
      path: finalPath,
    };
  }

  drawForeshadowingState() {
    const color = this.animationState.color;
    const { path, opacity } = this.generateLineData();

    if (
      this.controllerState.foreshadowingMode === ForeshadowingStatesMode.POINT
    ) {
      if (!path.length || path.length > 1) return;
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          strokeStyle: color,
          fillStyle: "white",
          lineWidth: 3,
          opacity,
        },
        (context: CanvasRenderingContext2D) => {
          this.controllerState.drawingUtils.drawCircle({
            coordinates: path[0],
            radius: RADIUS,
            context,
            stroke: true,
            fill: true,
          });
        }
      );
    } else {
      if (!path.length) return;
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          // for arrow head
          fillStyle: color,
          strokeStyle: "white",
          lineWidth: 3,
          opacity,
        },
        (context: CanvasRenderingContext2D) => {
          this.controllerState.drawingUtils.drawLine({
            coordinates: path,
            shape: LineShape.SHARP,
            context,
            // drawArrowHead: true,
            // radius: 20,
          });
        }
      );
    }
  }

  isInBound(boundaries: {
    position: Coordinate2D;
    dimensions?: Dimensions;
    radius?: number;
  }): boolean {
    return isInBound(
      {
        x: this.controllerState.xScale(
          this.controllerState.unscaledData[
            this.controllerState.currentKeyframeIndex
          ].x
        ) as number,
        y: this.controllerState.yScale(
          this.controllerState.unscaledData[
            this.controllerState.currentKeyframeIndex
          ].y
        ) as number,
      },
      boundaries
    );
  }
}
