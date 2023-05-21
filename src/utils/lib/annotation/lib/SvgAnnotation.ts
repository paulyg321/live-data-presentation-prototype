import { gsap } from "gsap";
import type { Coordinate2D, Dimensions } from "../../chart";
import type { DrawingUtils } from "../../drawing";
import { CanvasElementListener } from "../../interactions";
import { markRaw } from "vue";

export interface SvgAnnotationState {
  position: Coordinate2D;
  dimensions: Dimensions;
  lineWidth: number;
  opacity: number;
  canvasListener: CanvasElementListener;
  drawingUtils: DrawingUtils;
  color?: string;
  alternateColor?: string;
  animationDuration: number;
  animationEase?: string;
  path?: {
    parsedPath: any;
    xSize: number;
    ySize: number;
  };
}

export class SvgAnnotation {
  state: SvgAnnotationState;
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
    drawingUtils,
    color = "black",
    alternateColor = "white",
    animationDuration,
    animationEase,
    path,
  }: Partial<SvgAnnotationState> & { drawingUtils: DrawingUtils }) {
    this.state = markRaw({
      position: { ...position },
      dimensions: { ...dimensions },
      lineWidth,
      opacity,
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
      alternateColor,
      animationDuration: animationDuration ?? 1,
      animationEase,
      path,
    });
    this.animationState = markRaw({
      dimensions: { ...dimensions },
      opacity: opacity ?? 1,
      lineWidth: lineWidth ?? 3,
    });
  }

  updateState(args: Partial<SvgAnnotationState>) {
    const {
      position,
      dimensions,
      lineWidth,
      opacity,
      animationDuration,
      animationEase,
      color,
      path,
      alternateColor,
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
    if (alternateColor) {
      this.state.alternateColor = alternateColor;
    }
    if (animationDuration) {
      this.state.animationDuration = animationDuration;
    }
    if (animationEase) {
      this.state.animationEase = animationEase;
    }
    if (path) {
      this.state.path = path;
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
    this.state.path?.parsedPath.forEach((parsedPath: any, index: number) => {
      this.state.drawingUtils.modifyContextStyleAndDraw(
        {
          ...this.animationState,
          fillStyle:
            index % 2 === 0 ? this.state.color : this.state.alternateColor,
          shadow: true,
        },
        (context) => {
          context.translate(this.state.position.x, this.state.position.y);
          context.scale(
            this.animationState.dimensions.width /
              (this.state.path?.xSize ?? 1),
            this.animationState.dimensions.height /
              (this.state.path?.ySize ?? 1)
          );
          this.state.drawingUtils.drawPath({
            path: parsedPath,
            context,
            mode: "fill",
          });
        }
      );
    });
  }
}
