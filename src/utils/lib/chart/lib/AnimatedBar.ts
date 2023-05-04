import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import type {
  AnimatedChartElementArgs,
  AnimationChartElementData,
  D3ScaleTypes,
} from "./ChartController";
import * as d3 from "d3";
import type { Coordinate2D, Dimensions } from "../types";
import { defaultScale } from "../../drawing";
import { MAX_DOMAIN_Y } from "./Chart";
import { ForeshadowingStatesMode } from "../../gestures";
gsap.registerPlugin(MorphSVGPlugin);

export type AnimatedBarState = AnimatedChartElementArgs & {
  currentKeyframeIndex: number;
  keyframes: any[];
  foreshadowingMode: ForeshadowingStatesMode;
};

export type BarVisualState = {
  color: string;
  current: VisualState;
  foreshadow: Record<string, VisualState>;
};

export type VisualState = {
  opacity: number;
  path: number[];
  position: Coordinate2D;
  dimensions: Dimensions;
  pathTimeline?: any;
};

export class AnimatedBar {
  controllerState: AnimatedBarState;
  animationState: BarVisualState;

  constructor(args: AnimatedChartElementArgs) {
    this.controllerState = {
      ...args,
      currentKeyframeIndex: 0,
      keyframes: args.unscaledData.map(
        ({ keyframe }): AnimationChartElementData => keyframe
      ),
      foreshadowingMode: ForeshadowingStatesMode.NEXT,
    };
    this.animationState = {
      color: args.colorScale(args.colorKey),
      current: {
        opacity: 0,
        path: [],
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
      },
      foreshadow: {},
    };

    this.initializeCurrentAnimationState();
    this.initializeForeshadowingAnimationState();
  }

  onUpdate() {
    this.setCurrentPath();
  }

  initializeCurrentAnimationState() {
    const timeline1 = gsap.timeline();
    const timeline2 = gsap.timeline();
    const unscaledPosition =
      this.controllerState.unscaledData[
        this.controllerState.currentKeyframeIndex
      ];

    const { rectDimensions, topLeft: position } =
      this.createRectDataFromCoordinate({
        coordinate: unscaledPosition,
      });

    timeline1.to(this.animationState.current.dimensions, {
      width: rectDimensions.width,
      height: rectDimensions.height,
      duration: 2,
      onUpdate: () => this.onUpdate(),
    });
    timeline2.to(this.animationState.current.position, {
      x: position.x,
      y: position.y,
      duration: 2,
      onUpdate: () => this.onUpdate(),
    });

    timeline1.play();
    timeline2.play();
  }

  initializeForeshadowingAnimationState() {
    this.controllerState.unscaledData.forEach(
      ({ keyframe, ...coords }: AnimationChartElementData, index: number) => {
        this.animationState.foreshadow[keyframe] = {} as VisualState;
        switch (this.controllerState.foreshadowingMode) {
          case ForeshadowingStatesMode.ALL:
          case ForeshadowingStatesMode.NEXT:
          case ForeshadowingStatesMode.COUNT:
          default: {
            const { rectDimensions, topLeft: position } =
              this.createRectDataFromCoordinate({
                coordinate: coords,
              });
            this.animationState.foreshadow[keyframe].dimensions =
              rectDimensions;
            this.animationState.foreshadow[keyframe].position = position;
            this.animationState.foreshadow[keyframe].opacity = 1;

            this.setForeshadowingPath();
          }
        }
      }
    );
  }

  // -------------------------------------- SETTERS --------------------------------------
  updateState() {
    console.log("UPDATE_ME");
  }

  createRectDataFromCoordinate({
    coordinate,
    xScale = this.controllerState.xScale,
    yScale = this.controllerState.yScale,
  }: {
    coordinate: Coordinate2D;
    xScale?: D3ScaleTypes;
    yScale?: D3ScaleTypes;
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

  generateElementPath(element: any) {
    const svgPath = MorphSVGPlugin.convertToPath(element);
    const data = MorphSVGPlugin.getRawPath(svgPath[0]) as any;
    const path = data[0];

    return path;
  }

  setCurrentPath() {
    let timeline = gsap.timeline();
    if (this.animationState.current.pathTimeline) {
      timeline = this.animationState.current.pathTimeline;
    } else {
      this.animationState.current.pathTimeline = timeline;
    }
    const path = this.generateElementPath(
      d3
        .select("#test-svg")
        .append("rect")
        .attr("x", () => this.animationState.current.position.x)
        .attr("y", () => this.animationState.current.position.y)
        .attr("width", () => this.animationState.current.dimensions.width)
        .attr("height", () => this.animationState.current.dimensions.height)
        .node()
    );
    d3.select("#test-svg").selectAll("*").remove();

    this.animationState.current.path = path;
  }

  setForeshadowingPath() {
    Object.entries(this.animationState.foreshadow).map(
      ([key, value]: [string, VisualState]) => {
        const path = this.generateElementPath(
          d3
            .select("#test-svg")
            .append("rect")
            .attr("x", () => value.position.x)
            .attr("y", () => value.position.y)
            .attr("width", () => value.dimensions.width)
            .attr("height", () => value.dimensions.height)
            .node()
        );
        d3.select("#test-svg").selectAll("*").remove();

        this.animationState.foreshadow[key].path = path;
      }
    );
  }

  drawCurrentRect() {
    const color = this.animationState.color;
    const opacity = this.animationState.current.opacity;
    const path = this.animationState.current.path;

    this.drawPath({
      color,
      opacity,
      path,
    });
  }

  drawForeshadowingState() {
    const color = this.animationState.color;
    Object.values(this.animationState.foreshadow).map((value: VisualState) => {
      const { opacity, path } = value;

      this.drawPath({
        color,
        opacity,
        path,
      });
    });
  }

  drawPath(args: { color: string; path: number[]; opacity: number }) {
    const { color, path, opacity } = args;
    this.controllerState.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: color,
        opacity,
      },
      (context: CanvasRenderingContext2D) => {
        context.beginPath();
        context.moveTo(path[0], path[1]);
        for (let i = 2; i < path.length; ) {
          context.bezierCurveTo(
            path[i++],
            path[i++],
            path[i++],
            path[i++],
            path[i++],
            path[i++]
          );
        }
        context.closePath();
        context.fill();
      }
    );
  }

  draw() {
    this.drawCurrentRect();
    // this.drawForeshadowingState();
  }
}
