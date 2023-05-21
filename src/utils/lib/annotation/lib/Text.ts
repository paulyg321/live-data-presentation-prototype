import { gsap } from "gsap";
import type { Coordinate2D } from "../../chart";
import type { DrawingUtils } from "../../drawing";
import { CanvasElementListener } from "../../interactions";
import { markRaw } from "vue";

export interface TextState {
  position: Coordinate2D;
  fontSize: number;
  opacity: number;
  canvasListener: CanvasElementListener;
  drawingUtils: DrawingUtils;
  color?: string;
  animationDuration: number;
  animationEase?: string;
  text: string;
}

export class Text {
  state: TextState;
  animationState: {
    opacity: number;
  };

  constructor({
    position = { x: 0, y: 0 },
    fontSize = 16,
    opacity = 1,
    drawingUtils,
    color,
    animationDuration,
    animationEase,
    text = "Text",
  }: Partial<TextState> & { drawingUtils: DrawingUtils }) {
    this.state = markRaw({
      position: { ...position },
      fontSize,
      opacity,
      canvasListener: new CanvasElementListener({
        position,
        dimensions: { width: 100, height: 100 },
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
      text,
    });
    this.animationState = markRaw({
      opacity: opacity ?? 1,
    });
  }

  updateState(args: Partial<TextState>) {
    const {
      position,
      fontSize,
      opacity,
      animationDuration,
      animationEase,
      color,
      text,
    } = args;
    if (position) {
      this.state.position = { ...position };
    }
    if (fontSize) {
      this.state.fontSize = fontSize;
    }
    if (opacity) {
      this.state.opacity = opacity;
      this.animationState.opacity = opacity;
    }
    if (color) {
      this.state.color = color;
    }
    if (animationDuration) {
      this.state.animationDuration = animationDuration;
    }
    if (animationEase) {
      this.state.animationEase = animationEase;
    }
    if (text) {
      this.state.text = text;
    }

    this.state.canvasListener.updateState(args);
  }

  handleUnveil() {
    const tl1 = gsap.timeline();

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

    tl1.play();
  }

  handleHide() {
    const tl1 = gsap.timeline();

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

    tl1.play();
  }

  draw() {
    if (!this.animationState.opacity) return;
    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        ...this.animationState,
        strokeStyle: this.state.color,
        fillStyle: this.state.color,
        shadow: true,
        fontSize: this.state.fontSize,
      },
      (context) => {
        this.state.drawingUtils.drawText({
          coordinates: {
            x: this.state.position.x,
            y: this.state.position.y + this.state.fontSize,
          },
          context,
          fill: true,
          text: this.state.text,
        });
      }
    );
  }
}
