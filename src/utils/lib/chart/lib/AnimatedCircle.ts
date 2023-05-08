import type { AnimatedChartElementArgs } from "./ChartController";
import * as d3 from "d3";
import { ForeshadowingStatesMode } from "../../gestures";
import {
  AnimatedElement,
  type HandleForeshadowArgs,
  type HandleForeshadowReturnValue,
  type HandleSelectionArgs,
  type HandleSelectionReturnValue,
  type VisualState,
} from "./AnimatedElement";
import type { Coordinate2D } from "../types";
import { LineShape } from "../../drawing";

const RADIUS = 10;

export class AnimatedCircle extends AnimatedElement {
  constructor(args: AnimatedChartElementArgs) {
    super(args);
    console.log(args.selectionKey);
  }

  handleForeshadowCount(
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

    const isForeshadowed = this.controllerState.isForeshadowed;
    if (
      (index <= finalForeshadowingIndex && isForeshadowed) ||
      (this.controllerState.foreshadowingMode === ForeshadowingStatesMode.ALL &&
        isForeshadowed)
    ) {
      const position = {
        x: this.controllerState.xScale(itemUnscaledPosition.x) as number,
        y: this.controllerState.yScale(itemUnscaledPosition.y) as number,
      };

      const [_, maxRight] = this.controllerState.xScale.range() as number[];
      const [maxBottom, __] = this.controllerState.yScale.range() as number[];

      const isOffChart = position.x > maxRight;
      const isBelowLastValue = position.y > maxBottom;

      if (!isOffChart && !isBelowLastValue) {
        opacity = 1;
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
      shouldPulse:
        index === finalForeshadowingIndex ||
        this.controllerState.foreshadowingMode === ForeshadowingStatesMode.ALL,
      opacity,
    };
  }

  handleForeshadowNext(
    args: HandleForeshadowArgs
  ): HandleForeshadowReturnValue {
    const {
      itemAnimationState,
      itemUnscaledPosition,
      index,
      finalForeshadowingIndex,
    } = args;

    let opacity = 0;
    let shouldPulse = false;
    if (
      index === finalForeshadowingIndex &&
      this.controllerState.isForeshadowed
    ) {
      shouldPulse = true;
      opacity = 1;
      const position = {
        x: this.controllerState.xScale(itemUnscaledPosition.x) as number,
        y: this.controllerState.yScale(itemUnscaledPosition.y) as number,
      };

      const [_, maxRight] = this.controllerState.xScale.range() as number[];
      const [maxBottom, __] = this.controllerState.yScale.range() as number[];

      const isOffChart = position.x > maxRight;
      const isBelowLastValue = position.y > maxBottom;

      if (!isOffChart && !isBelowLastValue) {
        opacity = 1;
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
    const padding = 5;

    const position = {
      x: this.controllerState.xScale(itemUnscaledPosition.x) as number,
      y: this.controllerState.yScale(itemUnscaledPosition.y) as number,
    };

    const modifiedDimensions = {
      width: RADIUS + padding,
      height: RADIUS + padding,
    };

    const circleElement = d3
      .select("#test-svg")
      .append("circle")
      .attr("cx", () => position.x)
      .attr("cy", () => position.y)
      .attr("r", () => RADIUS)
      .node();

    return {
      element: circleElement,
      position,
      dimensions: modifiedDimensions,
    };
  }

  handleMainUpdate(args: HandleSelectionArgs): HandleSelectionReturnValue {
    const { itemUnscaledPosition } = args;
    const position = {
      x: this.controllerState.xScale(itemUnscaledPosition.x) as number,
      y: this.controllerState.yScale(itemUnscaledPosition.y) as number,
    };

    const dimensions = {
      width: RADIUS,
      height: RADIUS,
    };

    const circleElement = d3
      .select("#test-svg")
      .append("circle")
      .attr("cx", () => position.x)
      .attr("cy", () => position.y)
      .attr("r", () => RADIUS)
      .node();

    return {
      element: circleElement,
      position,
      dimensions,
    };
  }

  drawCurrentState() {
    const color = this.animationState.color;
    const {
      opacity,
      parsedPath: path,
      label,
      position,
      dimensions,
    } = this.animationState.current;
    const { opacity: selectionOpacity, parsedPath: selectionPath } =
      this.animationState.selection;

    // const textPosition = {
    //   x: position.x + 10,
    //   y: position.y + dimensions.height * 0.5 + (label?.fontSize ?? 0) / 2,
    // };

    if (!path) return;

    this.controllerState.drawingUtils.modifyContextStyleAndDraw(
      {
        strokeStyle: color,
        fillStyle: color,
        opacity,
      },
      (context: CanvasRenderingContext2D) => {
        this.controllerState.clipBoundaries(context);
        this.controllerState.drawingUtils.drawPath({
          path,
          mode: "fill",
          context,
        });
      }
    );

    // if (label) {
    //   this.controllerState.drawingUtils.modifyContextStyleAndDraw(
    //     {
    //       fillStyle: "white",
    //       opacity: opacity,
    //       fontSize: label.fontSize,
    //       textAlign: label.align as CanvasTextAlign,
    //     },
    //     (context: CanvasRenderingContext2D) => {
    //       this.controllerState.clipBoundaries(context);
    //       this.controllerState.drawingUtils.drawText({
    //         text: label.text,
    //         coordinates: textPosition,
    //         context,
    //       });
    //     }
    //   );
    // }

    if (selectionPath && selectionOpacity) {
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          strokeStyle: "white",
          opacity: selectionOpacity,
          lineWidth: 3,
        },
        (context: CanvasRenderingContext2D) => {
          this.controllerState.drawingUtils.drawPath({
            path: selectionPath,
            mode: "stroke",
            context,
          });
        }
      );
    }
  }

  private generateLineData() {
    const finalPath: Coordinate2D[] = [];
    let finalOpacity = 0;

    Object.values(this.animationState.foreshadow).forEach(
      (value: VisualState) => {
        const { dimensions, position, opacity } = value;

        if (dimensions.width > 0) {
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
      this.controllerState.foreshadowingMode === ForeshadowingStatesMode.NEXT
    ) {
      if (!path.length || path.length > 1) return;
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          fillStyle: "white",
          strokeStyle: color,
          lineWidth: 3,
          opacity,
        },
        (context: CanvasRenderingContext2D) => {
          // this.controllerState.clipBoundaries(context);
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
          strokeStyle: color,
          lineWidth: 5,
          opacity,
        },
        (context: CanvasRenderingContext2D) => {
          // this.controllerState.clipBoundaries(context);
          this.controllerState.drawingUtils.drawLine({
            coordinates: path,
            shape: LineShape.CURVED,
            context,
          });
        }
      );
    }
  }
}
