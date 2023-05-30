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
  type SVGPrimitive,
  TRANSPARENT,
  SELECTED_OPACITY,
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
        opacity = SELECTED_OPACITY;
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
      opacity = SELECTED_OPACITY;
      const position = {
        x: this.controllerState.xScale(itemUnscaledPosition.x) as number,
        y: this.controllerState.yScale(itemUnscaledPosition.y) as number,
      };

      const [_, maxRight] = this.controllerState.xScale.range() as number[];
      const [maxBottom, __] = this.controllerState.yScale.range() as number[];

      const isOffChart = position.x > maxRight;
      const isBelowLastValue = position.y > maxBottom;

      if (!isOffChart && !isBelowLastValue) {
        opacity = SELECTED_OPACITY;
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

    const element = d3
      .select(args.selector ?? "#circle")
      .clone()
      .attr("id", "remove")
      .node() as SVGPrimitive;

    return {
      element,
      position,
      dimensions,
      xSize: element.getBoundingClientRect().width,
      ySize: element.getBoundingClientRect().height,
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

    const element = d3
      .select(args.selector ?? "#circle")
      .clone()
      .attr("id", "remove")
      .node() as SVGPrimitive;

    return {
      element,
      position,
      dimensions,
      xSize: element.getBoundingClientRect().width,
      ySize: element.getBoundingClientRect().height,
    };
  }

  drawCurrentState() {
    const color = this.animationState.color;
    const { opacity, path, label, position, dimensions } =
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

    if (selectionPath && selectionOpacity) {
      const key = this.controllerState.selectionLabelKey;

      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          fillStyle: "white",
          opacity: selectionOpacity,
          lineWidth: 3,
          shadow: true,
        },
        (context: CanvasRenderingContext2D) => {
          selectionPath.parsedPath.forEach((parsedPath: any) => {
            context.translate(selectionPosition.x, selectionPosition.y);
            context.scale(
              selectionDims.width / path.xScale,
              selectionDims.height / path.yScale
            );
            this.controllerState.drawingUtils.drawPath({
              path: parsedPath,
              mode: "fill",
              context,
            });
          });
        }
      );

      if (key) {
        this.controllerState.drawingUtils.modifyContextStyleAndDraw(
          {
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

            this.controllerState.drawingUtils.drawText({
              text: labelText,
              coordinates: selectionLabelPosition,
              context,
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
          shadow: !(selectionPath && selectionOpacity),
        },
        (context: CanvasRenderingContext2D) => {
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
  }

  private generateLineData() {
    const finalPath: Coordinate2D[] = [];
    let finalOpacity = TRANSPARENT;

    Object.values(this.animationState.foreshadow).forEach(
      (value: VisualState) => {
        const { position, opacity } = value;

        if (opacity) {
          finalPath.push(position);
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
          strokeStyle: color,
          lineWidth: 3,
          opacity,
        },
        (context: CanvasRenderingContext2D) => {
          this.controllerState.drawingUtils.drawLine({
            coordinates: path,
            shape: LineShape.SHARP,
            context,
            drawArrowHead: true,
            radius: 6,
          });
        }
      );
    }
  }
}
