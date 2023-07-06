import { gsap } from "gsap";
import type { Coordinate2D, Dimensions } from "../../chart";
import type { DrawingUtils } from "../../drawing";
import { CanvasElementListener } from "../../interactions";
import { markRaw } from "vue";
import { isInBound } from "@/utils";

export interface RectState {
  position: Coordinate2D;
  dimensions: Dimensions;
  fill: boolean;
  lineWidth: number;
  opacity: number;
  maxOpacity: number;
  drawingUtils: DrawingUtils;
  color?: string;
  animationDuration: number;
  animationEase?: string;
  isPermanent?: boolean;
  isHover?: boolean;
}

export class Rect {
  state: RectState;
  animationState: {
    dimensions: Dimensions;
    opacity: number;
    lineWidth: number;
  };

  constructor({
    position = { x: 0, y: 0 },
    dimensions = { width: 50, height: 50 },
    lineWidth = 3,
    fill = false,
    drawingUtils,
    color,
    animationDuration,
    animationEase,
    maxOpacity = 1,
    isPermanent = false,
  }: Partial<RectState> & { drawingUtils: DrawingUtils }) {
    const opacity = isPermanent ? maxOpacity : 0.0001;
    this.state = markRaw({
      position: { ...position },
      dimensions: { ...dimensions },
      lineWidth,
      opacity,
      fill,
      drawingUtils,
      color,
      animationDuration: animationDuration ?? 1,
      animationEase,
      maxOpacity,
      isPermanent,
      isHover: false,
    });
    this.animationState = markRaw({
      dimensions: { ...dimensions },
      opacity,
      lineWidth: lineWidth ?? 3,
    });
  }

  updateState(args: Partial<RectState>) {
    const {
      position,
      dimensions,
      lineWidth,
      opacity,
      fill,
      animationDuration,
      animationEase,
      color,
      maxOpacity,
      isPermanent,
      isHover,
    } = args;
    if (position) {
      this.state.position = { ...position };
    }
    if (dimensions) {
      this.state.dimensions = { ...dimensions };
      this.animationState.dimensions = { ...dimensions };
    }
    if (lineWidth) {
      this.state.lineWidth = lineWidth;
      this.animationState.lineWidth = lineWidth;
    }
    if (opacity) {
      this.state.opacity = opacity;
      this.animationState.opacity = opacity;
    }
    if (maxOpacity) {
      this.state.maxOpacity = maxOpacity;
      this.state.opacity = maxOpacity;
      this.animationState.opacity = maxOpacity;
    }
    if (color) {
      this.state.color = color;
    }
    if (fill !== undefined) {
      this.state.fill = fill;
    }
    if (animationDuration) {
      this.state.animationDuration = animationDuration;
    }
    if (animationEase) {
      this.state.animationEase = animationEase;
    }
    if (isPermanent !== undefined) {
      this.state.isPermanent = isPermanent;
      if (isPermanent) {
        this.state.opacity = this.state.maxOpacity;
        this.animationState.opacity = this.state.maxOpacity;
      }
    }
    if (isHover !== undefined) {
      this.state.isHover = isHover;
    }
  }

  handleUnveil() {
    const tl1 = gsap.timeline();
    const tl2 = gsap.timeline();

    tl1.to(this.animationState, {
      opacity: this.state.maxOpacity,
      duration: this.state.animationDuration,
      ease: this.state.animationEase,
    });

    tl2.to(this.animationState.dimensions, {
      width: this.state.dimensions.width,
      height: this.state.dimensions.height,
      duration: this.state.animationDuration,
      ease: this.state.animationEase,
    });

    tl1.play();
    tl2.play();
  }

  handleHide() {
    if (this.state.isPermanent) return;
    const tl1 = gsap.timeline();
    const tl2 = gsap.timeline();

    tl1.to(this.animationState, {
      opacity: 0,
      duration: this.state.animationDuration,
      ease: this.state.animationEase,
    });

    tl2.to(this.animationState.dimensions, {
      width: 0,
      height: 0,
      duration: this.state.animationDuration,
      ease: this.state.animationEase,
    });

    tl1.play();
    tl2.play();
  }

  updatePosition(dx: number, dy: number) {
    this.state.position = {
      x: this.state.position.x + dx,
      y: this.state.position.y + dy,
    } as Coordinate2D;
  }

  updateSize(dx: number, dy: number) {
    this.state.dimensions = {
      width: this.state.dimensions.width + dx,
      height: this.state.dimensions.height + dy,
    };
  }

  isWithinObjectBounds(position: Coordinate2D) {
    return isInBound(position, {
      position: this.state.position,
      dimensions: this.state.dimensions,
    });
  }

  isWithinSelectionBounds(selectionBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    const coordinatesToCheck = [
      { ...this.state.position },
      {
        x: this.state.position.x + this.state.dimensions.width,
        y: this.state.position.y + this.state.dimensions.height,
      },
    ];

    return coordinatesToCheck.reduce(
      (isInSelectionBounds: boolean, coordinate: Coordinate2D) => {
        return (
          isInBound(coordinate, {
            position: {
              ...selectionBounds,
            },
            dimensions: {
              ...selectionBounds,
            },
          }) && isInSelectionBounds
        );
      },
      true
    );
  }

  isWithinResizeBounds(position: Coordinate2D) {
    return isInBound(position, {
      position: {
        x: this.state.position.x + this.state.dimensions.width - 10,
        y: this.state.position.y + this.state.dimensions.height - 10,
      },
      dimensions: {
        width: 10,
        height: 10,
      },
    });
  }

  drawHoverState() {
    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        lineDash: [3, 3],
        strokeStyle: "steelblue",
      },
      (context) => {
        this.state.drawingUtils.drawRect({
          coordinates: this.state.position,
          dimensions: this.state.dimensions,
          stroke: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: "white",
        strokeStyle: "grey",
      },
      (context) => {
        this.state.drawingUtils.drawCircle({
          coordinates: {
            x: this.state.position.x + this.state.dimensions.width,
            y: this.state.position.y + this.state.dimensions.height,
          },
          radius: 10,
          stroke: true,
          fill: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
  }

  draw() {
    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        ...this.animationState,
        strokeStyle: this.state.color,
        fillStyle: this.state.color,
        shadow: true,
      },
      (context) => {
        this.state.drawingUtils.drawRect({
          coordinates: this.state.position,
          context,
          dimensions: this.animationState.dimensions,
          fill: this.state.fill,
          stroke: !this.state.fill,
        });
      }
    );

    if (this.state.isHover) {
      this.drawHoverState();
    }
  }
}
