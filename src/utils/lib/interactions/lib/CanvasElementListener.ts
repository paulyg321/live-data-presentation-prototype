import { calculateDistance, isInBound } from "../../calculations";
import type { Chart, Coordinate2D, Dimensions } from "../../chart";
import type { DrawingUtils } from "../../drawing";
import type {
  EmphasisGestureListener,
  ForeshadowingGestureListener,
  GestureListener,
  LinearPlaybackGestureListener,
  RadialPlaybackGestureListener,
} from "../../gestures";

export enum CanvasEvent {
  MOUSE_DOWN = "mousedown",
  MOUSE_UP = "mouseup",
  MOUSE_MOVE = "mousemove",
  CLICK = "click",
}

export interface AnchorData {
  center: Coordinate2D;
  radius: number;
}

export class CanvasElementListener {
  private position: Coordinate2D;
  private dimensions: Dimensions;
  private isCircle: boolean;
  private dragSettings = {
    active: false,
    lastPosition: { x: 0, y: 0 },
  };
  private resizeSettings = {
    active: false,
    lastPosition: { x: 0, y: 0 },
  };
  private drawingUtils: DrawingUtils;
  private anchorPadding: number;
  private parentUpdateFn: (value: any) => void;

  constructor({
    position,
    dimensions,
    isCircle,
    drawingUtils,
    updateFn,
  }: {
    position: Coordinate2D;
    dimensions: Dimensions;
    isCircle: boolean;
    drawingUtils: DrawingUtils;
    updateFn: (value: any) => void;
  }) {
    this.position = position;
    this.dimensions = dimensions;
    this.isCircle = isCircle;
    this.anchorPadding = 10;
    this.drawingUtils = drawingUtils;
    this.parentUpdateFn = updateFn;
  }

  updateState({
    position,
    dimensions,
  }: {
    position?: Coordinate2D;
    dimensions?: Dimensions;
  }) {
    if (position) {
      this.position = position;
    }
    if (dimensions) {
      this.dimensions = dimensions;
    }
  }

  getDragRegionData() {
    return {
      position: {
        x: this.position.x + this.anchorPadding,
        y: this.position.y + this.anchorPadding,
      },
      dimensions: {
        width: this.dimensions.width - 2 * this.anchorPadding,
        height: this.dimensions.height - 2 * this.anchorPadding,
      },
    };
  }

  getResizeAnchorData() {
    return {
      position: {
        x: this.position.x + this.dimensions.width,
        y: this.position.y + this.dimensions.height,
      },
      radius: this.anchorPadding,
    };
  }

  getDeleteAnchorData() {
    return {
      position: {
        x: this.position.x + this.dimensions.width,
        y: this.position.y,
      },
      radius: this.anchorPadding,
    };
  }

  isInBounds(coordinates: Coordinate2D) {
    const isInDraggingBounds = isInBound(coordinates, this.getDragRegionData());
    const isInResizeBounds = isInBound(coordinates, this.getResizeAnchorData());
    const isInDeleteBounds = isInBound(coordinates, this.getDeleteAnchorData());
    return {
      isInDraggingBounds,
      isInResizeBounds,
      isInDeleteBounds,
      isInBounds: isInDeleteBounds || isInDraggingBounds || isInResizeBounds,
    };
  }

  handleDragEvent(mousePosition: Coordinate2D) {
    const lastPosition = this.dragSettings.lastPosition;
    const { horizontalDistance: deltaX, verticalDistance: deltaY } =
      calculateDistance(mousePosition, lastPosition);

    const newPosition = {
      x: this.position.x + deltaX,
      y: this.position.y + deltaY,
    };

    this.updateState({
      position: newPosition,
    });
    this.parentUpdateFn({
      position: newPosition,
    });
    this.dragSettings.lastPosition = mousePosition;
  }

  handleResizeEvent(mousePosition: Coordinate2D) {
    const lastPosition = this.resizeSettings.lastPosition;
    const { horizontalDistance: deltaX, verticalDistance: deltaY } =
      calculateDistance(mousePosition, lastPosition);

    const minPadding = 2 * this.anchorPadding;

    const newWidth = this.dimensions.width + deltaX;
    const newHeight = this.dimensions.height + deltaY;

    if (newHeight < minPadding || newWidth < minPadding) return;

    this.updateState({
      dimensions: {
        width: newWidth,
        height: newHeight,
      },
    });
    this.parentUpdateFn({
      dimensions: {
        width: newWidth,
        height: newHeight,
      },
    });
    this.resizeSettings.lastPosition = mousePosition;
  }

  handleEvent(type: CanvasEvent, eventData: Coordinate2D) {
    switch (type) {
      case CanvasEvent.MOUSE_DOWN: {
        const { isInDraggingBounds, isInResizeBounds } =
          this.isInBounds(eventData);
        if (isInDraggingBounds) {
          this.dragSettings = {
            active: true,
            lastPosition: eventData,
          };
        } else if (isInResizeBounds) {
          this.resizeSettings = {
            active: true,
            lastPosition: eventData,
          };
        }
        break;
      }
      case CanvasEvent.MOUSE_MOVE: {
        if (this.dragSettings.active) {
          this.handleDragEvent(eventData);
        } else if (this.resizeSettings.active) {
          this.handleResizeEvent(eventData);
        }
        break;
      }
      case CanvasEvent.MOUSE_UP: {
        const { isInDraggingBounds, isInResizeBounds } =
          this.isInBounds(eventData);
        if (isInDraggingBounds) {
          this.dragSettings = {
            active: false,
            lastPosition: eventData,
          };
        } else if (isInResizeBounds) {
          this.resizeSettings = {
            active: false,
            lastPosition: eventData,
          };
        }
        break;
      }
      default: {
        break;
      }
    }
  }

  draw() {
    this.drawingUtils.modifyContextStyleAndDraw(
      {
        lineDash: [3, 3],
        strokeStyle: "steelblue",
      },
      (context) => {
        this.drawingUtils.drawRect({
          coordinates: this.position,
          dimensions: this.dimensions,
          stroke: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
    this.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: "grey",
      },
      (context) => {
        this.drawingUtils.drawCircle({
          coordinates: this.getResizeAnchorData().position,
          radius: this.getResizeAnchorData().radius,
          fill: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
    this.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: "red",
      },
      (context) => {
        this.drawingUtils.drawCircle({
          coordinates: this.getDeleteAnchorData().position,
          radius: this.getDeleteAnchorData().radius,
          fill: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
  }
}
