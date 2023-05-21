import { gsap } from "gsap";
import type { Coordinate2D } from "../../chart";
import { LineShape, type DrawingUtils } from "../../drawing";
import { LineCanvasElementListener } from "../../interactions";
import { markRaw } from "vue";

export interface LineState {
  startCoord: Coordinate2D;
  endCoord: Coordinate2D;
  lineWidth: number;
  opacity: number;
  canvasListener: LineCanvasElementListener;
  arrow: boolean;
  drawingUtils: DrawingUtils;
  color?: string;
  animationDuration: number;
  animationEase?: string;
}

export class Line {
  state: LineState;
  animationState: {
    startCoord: Coordinate2D;
    endCoord: Coordinate2D;
    opacity: number;
    lineWidth: number;
  };

  constructor({
    startCoord,
    endCoord,
    lineWidth,
    opacity,
    arrow,
    drawingUtils,
    color,
    animationDuration,
    animationEase,
  }: Partial<LineState> & { drawingUtils: DrawingUtils }) {
    this.state = markRaw({
      startCoord: startCoord ? { ...startCoord } : { x: 0, y: 0 },
      endCoord: endCoord ? { ...endCoord } : { x: 50, y: 50 },
      lineWidth: lineWidth ?? 3,
      opacity: opacity ?? 1,
      arrow: arrow ?? false,
      canvasListener: new LineCanvasElementListener({
        startCoord: startCoord ? { ...startCoord } : { x: 0, y: 0 },
        endCoord: endCoord ? { ...endCoord } : { x: 50, y: 50 },
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
      startCoord: startCoord ? { ...startCoord } : { x: 0, y: 0 },
      endCoord: endCoord ? { ...endCoord } : { x: 50, y: 50 },
      opacity: opacity ?? 1,
      lineWidth: lineWidth ?? 3,
    });
  }

  updateState(args: Partial<LineState>) {
    const {
      startCoord,
      endCoord,
      lineWidth,
      opacity,
      arrow,
      animationDuration,
      animationEase,
      color,
    } = args;
    if (startCoord) {
      this.state.startCoord = { ...startCoord };
      this.animationState.startCoord = { ...startCoord };
    }
    if (endCoord) {
      this.state.endCoord = { ...endCoord };
      this.animationState.endCoord = { ...endCoord };
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
    if (arrow !== undefined) {
      this.state.arrow = arrow;
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
      this.animationState.endCoord,
      {
        x: this.state.startCoord.x,
        y: this.state.startCoord.y,
      },
      {
        x: this.state.endCoord.x,
        y: this.state.endCoord.y,
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
      this.animationState.endCoord,
      {
        x: this.state.endCoord.x,
        y: this.state.endCoord.y,
      },
      {
        x: this.state.startCoord.x,
        y: this.state.startCoord.y,
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
      },
      (context) => {
        this.state.drawingUtils.drawLine({
          coordinates: [
            this.animationState.startCoord,
            this.animationState.endCoord,
          ],
          drawArrowHead: this.state.arrow,
          context,
          shape: LineShape.SHARP,
          radius: this.animationState.lineWidth * 2,
        });
      }
    );
  }
}
