import {
  calculateDistance,
  isInBound,
  type DrawingUtils,
  type Coordinate2D,
  CanvasEvent,
} from "@/utils";

export class LineCanvasElementListener {
  startCoord: Coordinate2D;
  endCoord: Coordinate2D;

  private dragSettings = {
    active: false,
    lastPosition: { x: 0, y: 0 },
  };
  private resizeSettings: {
    active: boolean;
    lastPosition: Coordinate2D;
    key?: "startCoord" | "endCoord";
  } = {
    active: false,
    lastPosition: { x: 0, y: 0 },
  };
  private drawingUtils: DrawingUtils;
  private anchorPadding: number;
  private parentUpdateFn: (value: any) => void;

  constructor({
    startCoord,
    endCoord,
    drawingUtils,
    updateFn,
  }: {
    startCoord: Coordinate2D;
    endCoord: Coordinate2D;
    drawingUtils: DrawingUtils;
    updateFn: (value: any) => void;
  }) {
    this.startCoord = startCoord;
    this.endCoord = endCoord;
    this.anchorPadding = 10;
    this.drawingUtils = drawingUtils;
    this.parentUpdateFn = updateFn;
  }

  updateState({
    startCoord,
    endCoord,
  }: {
    startCoord?: Coordinate2D;
    endCoord?: Coordinate2D;
  }) {
    if (startCoord) {
      this.startCoord = startCoord;
    }
    if (endCoord) {
      this.endCoord = endCoord;
    }
  }

  getDragRegionData() {
    return {
      position: {
        x: this.startCoord.x + (this.endCoord.x - this.startCoord.x) / 2,
        y: this.startCoord.y + (this.endCoord.y - this.startCoord.y) / 2,
      },
      radius: this.anchorPadding,
    };
  }

  getResizeAnchorData(): {
    position: Coordinate2D;
    radius: number;
    key: "startCoord" | "endCoord";
  }[] {
    return [
      {
        position: this.startCoord,
        radius: this.anchorPadding,
        key: "startCoord",
      },
      {
        position: this.endCoord,
        radius: this.anchorPadding,
        key: "endCoord",
      },
    ];
  }

  isInBounds(coordinates: Coordinate2D) {
    const isInDraggingBounds = isInBound(coordinates, this.getDragRegionData());
    const isInResizeBounds = this.getResizeAnchorData().reduce(
      (prevData, anchorData) => {
        return {
          inBounds: prevData.inBounds || isInBound(coordinates, anchorData),
          key: isInBound(coordinates, anchorData)
            ? anchorData.key
            : prevData.key,
        };
      },
      {
        inBounds: false,
        key: undefined,
      } as { inBounds: boolean; key?: "startCoord" | "endCoord" }
    );

    return {
      isInDraggingBounds,
      isInDeleteBounds: false,
      isInResizeBounds: isInResizeBounds.inBounds,
      isInBounds: isInDraggingBounds || isInResizeBounds.inBounds,
      key: isInResizeBounds.key,
    };
  }

  handleDragEvent(mousePosition: Coordinate2D) {
    const lastPosition = this.dragSettings.lastPosition;
    const { horizontalDistance: deltaX, verticalDistance: deltaY } =
      calculateDistance(mousePosition, lastPosition);

    const newStartPosition = {
      x: this.startCoord.x + deltaX,
      y: this.startCoord.y + deltaY,
    };

    const newEndPosition = {
      x: this.endCoord.x + deltaX,
      y: this.endCoord.y + deltaY,
    };

    this.updateState({
      startCoord: newStartPosition,
      endCoord: newEndPosition,
    });
    this.parentUpdateFn({
      startCoord: newStartPosition,
      endCoord: newEndPosition,
    });

    this.dragSettings.lastPosition = mousePosition;
  }

  handleResizeEvent(mousePosition: Coordinate2D) {
    if (!this.resizeSettings.key) return;

    const key = this.resizeSettings.key;
    const lastPosition = this.resizeSettings.lastPosition;
    const { horizontalDistance: deltaX, verticalDistance: deltaY } =
      calculateDistance(mousePosition, lastPosition);


    const newPosition = {
      x: this[key].x + deltaX,
      y: this[key].y + deltaY,
    };

    this.updateState({
      [key]: newPosition,
    });
    this.parentUpdateFn({
      [key]: newPosition,
    });
    this.resizeSettings.lastPosition = mousePosition;
  }

  handleEvent(type: CanvasEvent, eventData: Coordinate2D, save?: () => void) {
    switch (type) {
      case CanvasEvent.MOUSE_DOWN: {
        const { isInDraggingBounds, isInResizeBounds, key } =
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
            key,
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
        if (save) {
          save();
        }
        break;
      }
      default: {
        break;
      }
    }
  }

  draw() {
    [...this.getResizeAnchorData(), this.getDragRegionData()].map(
      (data: { position: Coordinate2D; radius: number }) => {
        this.drawingUtils.modifyContextStyleAndDraw(
          {
            fillStyle: "grey",
          },
          (context) => {
            this.drawingUtils.drawCircle({
              coordinates: data.position,
              radius: data.radius,
              fill: true,
              context,
            });
          },
          ["presenter", "preview"]
        );
      }
    );
  }
}
