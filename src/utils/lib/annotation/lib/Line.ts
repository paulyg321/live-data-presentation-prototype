import { gsap } from "gsap";
import type { Coordinate2D } from "../../chart";
import { LineShape, type DrawingUtils } from "../../drawing";
import { markRaw } from "vue";
import { isInBound } from "@/utils";

export interface LineState {
  startCoord: Coordinate2D;
  endCoord: Coordinate2D;
  lineWidth: number;
  opacity: number;
  maxOpacity: number;
  arrow: boolean;
  drawingUtils: DrawingUtils;
  color?: string;
  animationDuration: number;
  animationEase?: string;
  isPermanent?: boolean;
  isHover?: boolean;
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
    arrow,
    drawingUtils,
    color,
    animationDuration,
    animationEase,
    maxOpacity = 1,
    isPermanent = false,
  }: Partial<LineState> & { drawingUtils: DrawingUtils }) {
    const opacity = isPermanent ? maxOpacity : 0.0001;
    this.state = markRaw({
      startCoord: startCoord ? { ...startCoord } : { x: 0, y: 0 },
      endCoord: endCoord ? { ...endCoord } : { x: 50, y: 50 },
      lineWidth: lineWidth ?? 3,
      opacity,
      arrow: arrow ?? false,
      drawingUtils,
      color,
      animationDuration: animationDuration ?? 1,
      animationEase,
      maxOpacity,
      isPermanent,
      isHover: false,
    });
    this.animationState = markRaw({
      startCoord: startCoord ? { ...startCoord } : { x: 0, y: 0 },
      endCoord: endCoord ? { ...endCoord } : { x: 50, y: 50 },
      opacity,
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
      maxOpacity,
      isPermanent,
      isHover
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
    if (maxOpacity) {
      this.state.maxOpacity = maxOpacity;
      this.state.opacity = maxOpacity;
      this.animationState.opacity = maxOpacity;
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

    tl2.to(this.animationState.endCoord, {
      x: this.state.endCoord.x,
      y: this.state.endCoord.y,
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

    tl2.to(this.animationState.endCoord, {
      x: this.state.startCoord.x,
      y: this.state.startCoord.y,
      duration: this.state.animationDuration,
      ease: this.state.animationEase,
    });

    tl1.play();
    tl2.play();
  }

  updatePosition(dx: number, dy: number) {
    this.state.startCoord = {
      x: this.state.startCoord.x + dx,
      y: this.state.startCoord.y + dy,
    } as Coordinate2D;

    this.state.endCoord = {
      x: this.state.endCoord.x + dx,
      y: this.state.endCoord.y + dy,
    } as Coordinate2D;

    this.animationState.startCoord = this.state.startCoord;
    this.animationState.endCoord = this.state.endCoord;
  }

  updateSize(dx: number, dy: number) {
    this.state.endCoord = {
      x: this.state.endCoord.x + dx,
      y: this.state.endCoord.y + dy,
    } as Coordinate2D;
  }

  isWithinObjectBounds(position: Coordinate2D) {
    const { x: minX, y: minY } = this.state.startCoord;
    const { maxX, maxY } = {
      maxX: this.state.endCoord.x,
      maxY: this.state.endCoord.y,
    };

    if (
      position.x > minX &&
      position.x < maxX &&
      position.y > minY &&
      position.y < maxY
    ) {
      return true;
    }

    return false;
  }

  isWithinResizeBounds(position: Coordinate2D) {
    return isInBound(position, {
      position: this.state.endCoord,
      radius: 5,
    });
  }

  isWithinSelectionBounds(selectionBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    const coordinatesToCheck = [
      { ...this.state.startCoord },
      { ...this.state.endCoord },
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

  drawHoverState() {
    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        lineDash: [3, 3],
        strokeStyle: "steelblue",
      },
      (context) => {
        this.state.drawingUtils.drawRect({
          coordinates: {
            x: Math.min(this.state.startCoord.x, this.state.endCoord.x),
            y: Math.min(this.state.startCoord.y, this.state.endCoord.y),
          },
          dimensions: {
            width:
              Math.max(this.state.startCoord.x, this.state.endCoord.x) -
              Math.min(this.state.startCoord.x, this.state.endCoord.x),
            height:
              Math.max(this.state.startCoord.y, this.state.endCoord.y) -
              Math.min(this.state.startCoord.y, this.state.endCoord.y),
          },
          stroke: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        strokeStyle: "grey",
        fillStyle: "white",
      },
      (context) => {
        this.state.drawingUtils.drawCircle({
          coordinates: this.state.startCoord,
          radius: 10,
          stroke: true,
          fill: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: "grey",
      },
      (context) => {
        this.state.drawingUtils.drawCircle({
          coordinates: this.state.endCoord,
          radius: 5,
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
    if (this.state.isHover) {
      this.drawHoverState();
    }
  }
}
