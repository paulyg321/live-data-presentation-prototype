import { gsap } from "gsap";
import type { Coordinate2D, Dimensions } from "../../chart";
import type { DrawingUtils } from "../../drawing";
import { CanvasElementListener } from "../../interactions";
import { markRaw } from "vue";

export interface RectState {
  position: Coordinate2D;
  dimensions: Dimensions;
  fill: boolean;
  lineWidth: number;
  opacity: number;
  canvasListener: CanvasElementListener;
  drawingUtils: DrawingUtils;
  color?: string;
  animationDuration: number;
  animationEase?: string;
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
    opacity = 1,
    fill = false,
    drawingUtils,
    color,
    animationDuration,
    animationEase,
  }: Partial<RectState> & { drawingUtils: DrawingUtils }) {
    this.state = markRaw({
      position: { ...position },
      dimensions: { ...dimensions },
      lineWidth,
      opacity,
      fill,
      canvasListener: new CanvasElementListener({
        position,
        dimensions,
        isCircle: false,
        drawingUtils,
        updateFn: (value) => {
          this.updateState(value);
        },
      }),
      drawingUtils,
      color,
      animationDuration: animationDuration ?? 1,
      animationEase,
    });
    this.animationState = markRaw({
      dimensions: { ...dimensions },
      opacity: opacity ?? 1,
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

    this.state.canvasListener.updateState(args);
  }

  handleUnveil() {
    const tl1 = gsap.timeline();
    const tl2 = gsap.timeline();

    tl1.fromTo(
      this.animationState,
      {
        opacity: 0,
      },
      {
        opacity: 1,
        duration: this.state.animationDuration,
        ease: this.state.animationEase,
      }
    );

    tl2.fromTo(
      this.animationState.dimensions,
      {
        width: 0,
        height: 0,
      },
      {
        width: this.state.dimensions.width,
        height: this.state.dimensions.height,
        duration: this.state.animationDuration,
        ease: this.state.animationEase,
      }
    );

    tl1.play();
    tl2.play();
  }

  handleHide() {
    const tl1 = gsap.timeline();
    const tl2 = gsap.timeline();

    tl1.fromTo(
      this.animationState,
      {
        opacity: 1,
      },
      {
        opacity: 0,
        duration: this.state.animationDuration,
        ease: this.state.animationEase,
      }
    );

    tl2.fromTo(
      this.animationState.dimensions,
      {
        width: this.state.dimensions.width,
        height: this.state.dimensions.height,
      },
      {
        width: 0,
        height: 0,
        duration: this.state.animationDuration,
        ease: this.state.animationEase,
      }
    );

    tl1.play();
    tl2.play();
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
  }
}
