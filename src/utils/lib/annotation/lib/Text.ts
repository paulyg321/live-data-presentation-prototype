import { gsap } from "gsap";
import type { Coordinate2D, Dimensions } from "../../chart";
import type { DrawingUtils } from "../../drawing";
import type { CanvasElementListener } from "../../interactions";
import { markRaw } from "vue";
import { isInBound } from "@/utils";

export interface TextState {
  position: Coordinate2D;
  dimensions: Dimensions;
  fontSize: number;
  opacity: number;
  maxOpacity: number;
  // canvasListener: CanvasElementListener;
  drawingUtils: DrawingUtils;
  color?: string;
  animationDuration: number;
  animationEase?: string;
  text: string;
  isPermanent?: boolean;
  isHover?: boolean;
}

export class Text {
  state: TextState;
  animationState: {
    opacity: number;
  };

  constructor({
    position = { x: 0, y: 0 },
    fontSize = 16,
    drawingUtils,
    color,
    animationDuration,
    animationEase,
    text = "Text",
    maxOpacity = 1,
    isPermanent = false,
    dimensions,
  }: Partial<TextState> & { drawingUtils: DrawingUtils }) {
    const opacity = isPermanent ? maxOpacity : 0.0001;
    this.state = markRaw({
      position: { ...position },
      dimensions: dimensions ? dimensions : { width: 100, height: 100 },
      fontSize,
      opacity,
      // canvasListener: new CanvasElementListener({
      //   position,
      //   dimensions: { width: 100, height: 100 },
      //   isCircle: false,
      //   drawingUtils,
      //   updateFn: (value) => {
      //     this.updateState(value);
      //   },
      // }),
      drawingUtils,
      color,
      animationDuration: animationDuration ?? 1,
      animationEase,
      text,
      maxOpacity,
      isPermanent,
      isHover: false,
    });
    this.animationState = markRaw({
      opacity,
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
      maxOpacity,
      isPermanent,
      dimensions,
      isHover,
    } = args;
    if (position) {
      this.state.position = { ...position };
    }
    if (dimensions) {
      this.state.dimensions = { ...dimensions };
    }
    if (fontSize) {
      this.state.fontSize = fontSize;
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
    if (animationDuration) {
      this.state.animationDuration = animationDuration;
    }
    if (animationEase) {
      this.state.animationEase = animationEase;
    }
    if (text) {
      this.state.text = text;
    }
    if (isPermanent !== false) {
      this.state.isPermanent = isPermanent;
      if (isPermanent) {
        this.state.opacity = this.state.maxOpacity;
        this.animationState.opacity = this.state.maxOpacity;
      }
    }
    if (isHover !== undefined) {
      this.state.isHover = isHover;
    }

    // this.state.canvasListener.updateState(args);
  }

  handleUnveil() {
    const tl1 = gsap.timeline();

    tl1.to(this.animationState, {
      opacity: this.state.maxOpacity,
      duration: this.state.animationDuration,
      ease: this.state.animationEase,
    });

    tl1.play();
  }

  handleHide() {
    if (this.state.isPermanent) return;
    const tl1 = gsap.timeline();

    tl1.to(this.animationState, {
      opacity: 0,
      duration: this.state.animationDuration,
      ease: this.state.animationEase,
    });

    tl1.play();
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

    if (this.state.isHover) {
      this.drawHoverState();
    }
  }
}
