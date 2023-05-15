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
} from "@/utils";

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

    const element = d3
      .select(args.selector ?? "#circle")
      .clone()
      .attr("id", "remove")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 1)
      .attr("width", 1)
      .attr("height", 1)
      .node() as SVGPrimitive;

    return {
      element,
      position,
      dimensions: modifiedDimensions,
      xSize: element.getBoundingClientRect().width,
      ySize: element.getBoundingClientRect().height,
    };
  }

  handleMainUpdate(args: HandleSelectionArgs): HandleSelectionReturnValue {
    const { itemUnscaledPosition } = args;
    const position = {
      x: this.controllerState.xScale(itemUnscaledPosition.x) as number,
      y: this.controllerState.yScale(itemUnscaledPosition.y) as number,
    };

    const dimensions = {
      width: RADIUS * 2,
      height: RADIUS * 2,
    };

    const element = d3
      .select(args.selector ?? "#circle")
      .clone()
      .attr("id", "remove")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 1)
      .attr("width", 1)
      .attr("height", 1)
      .node() as SVGPrimitive;

    console.log(element.getBoundingClientRect().width);
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
    const { opacity: selectionOpacity, path: selectionPath } =
      this.animationState.selection;

    if (!path) return;

    path.parsedPath.forEach((parsedPath: any, index: number) => {
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          strokeStyle: color,
          // fillStyle: color,
          fillStyle: index % 2 === 0 ? color : "white",
          opacity,
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

    if (selectionPath && selectionOpacity) {
      this.controllerState.drawingUtils.modifyContextStyleAndDraw(
        {
          strokeStyle: "white",
          opacity: selectionOpacity,
          lineWidth: 3,
          shadow: true,
        },
        (context: CanvasRenderingContext2D) => {
          this.controllerState.drawingUtils.drawPath({
            path: selectionPath.parsedPath,
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
