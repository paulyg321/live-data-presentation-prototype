import type * as d3 from "d3";
import {
  GestureListener,
  SupportedGestures,
  type Coordinate2D,
  type PartialCoordinate2D,
  type GestureTracker,
  type GestureTrackerValues,
  HAND_LANDMARK_IDS,
  startTimeoutInstance,
  type Dimensions,
  drawText,
  drawRect,
  clearArea,
} from "@/utils";
import type { Subject } from "rxjs";

export interface LegendConstructorArgs {
  label: string;
  position?: Coordinate2D;
  dimensions?: Dimensions;
  canvasDimensions: Dimensions;
  color: string;
  gestureTracker?: GestureTracker;
  legendSubject?: Subject<any>;
}

const selectionWaitTime = 500;

export class LegendItem {
  label: string;
  private color: string;
  private position: Coordinate2D | undefined;
  private dimensions: Dimensions | undefined;
  private canvasDimensions: Dimensions;
  gestureTracker: GestureTracker | undefined;
  legendSubject: Subject<any> | undefined;
  private previousHandPositionInRange: boolean | undefined = false;
  private timer: d3.Timer | undefined;
  private context: CanvasRenderingContext2D | undefined;

  static getPositionFromIndex(
    position: Coordinate2D,
    index: number,
    dimensions: Dimensions
  ) {
    return {
      x: position.x,
      y: position.y + index * dimensions.height,
    };
  }

  constructor({
    label,
    color,
    dimensions,
    position,
    // passing the subject so all legends can share the same subject and push their keys when they're in range
    legendSubject,
    canvasDimensions,
    gestureTracker,
  }: LegendConstructorArgs) {
    if (dimensions) {
      this.dimensions = dimensions;
    }
    if (position) {
      this.position = position;
    }
    if (legendSubject) {
      this.legendSubject = legendSubject;
    }
    this.label = label;
    this.color = color;
    this.canvasDimensions = canvasDimensions;
    if (gestureTracker) {
      this.setGestureTracker(gestureTracker);
    }
  }

  setGestureTracker(gestureTracker: GestureTracker) {
    this.gestureTracker = gestureTracker;
    if (this.gestureTracker) {
      this.gestureTracker.gestureSubject.subscribe({
        next: (gestureData: GestureTrackerValues) => {
          this.gestureListener(gestureData);
        },
      });
    }
  }

  setLegendSubject(legendSubject: Subject<any>) {
    this.legendSubject = legendSubject;
  }

  setContext(ctx: CanvasRenderingContext2D) {
    this.context = ctx;
  }

  updateState({
    position,
    color,
    dimensions,
  }: {
    position?: Coordinate2D;
    color?: string;
    dimensions?: Dimensions;
  }) {
    if (position) {
      this.position = position;
    }
    if (color) {
      this.color = color;
    }
    if (dimensions) {
      this.dimensions = dimensions;
    }
  }

  getBounds() {
    if (this.position && this.dimensions) {
      return {
        x: {
          start: this.position.x,
          end: this.position.x + this.dimensions.width,
        },
        y: {
          start: this.position.y,
          end: this.position.y + this.dimensions.height,
        },
      };
    }

    return {
      x: { start: 0, end: 0 },
      y: { start: 0, end: 0 },
    };
  }

  gestureListener(gestureData: GestureTrackerValues) {
    const {
      rightHandLandmarks,
      rightHandGestures,
      leftHandLandmarks,
      leftHandGestures,
    } = gestureData;

    const rightHandPosition =
      GestureListener.convertGestureAndLandmarksToPositions({
        landmarkData: rightHandLandmarks,
        gestureData: rightHandGestures,
        gestureType: SupportedGestures.POINTING,
      });

    const leftHandPosition =
      GestureListener.convertGestureAndLandmarksToPositions({
        landmarkData: leftHandLandmarks,
        gestureData: leftHandGestures,
        gestureType: SupportedGestures.POINTING,
      });

    if (rightHandPosition) {
      if (
        this.isInRange(
          rightHandPosition.fingerPositions[HAND_LANDMARK_IDS.index_finger_tip]
        )
      ) {
        if (!this.timer) {
          this.initializeSelectionTimer();
        }
        this.previousHandPositionInRange = true;
      } else {
        this.previousHandPositionInRange = false;
      }
    }
  }

  initializeSelectionTimer() {
    this.timer = startTimeoutInstance({
      onCompletion: () => {
        if (this.previousHandPositionInRange) {
          this.legendSubject?.next(this.label);
        }
        this.previousHandPositionInRange = undefined;
        this.timer = undefined;
      },
      timeout: selectionWaitTime,
    });
  }

  drawLegend() {
    if (this.context && this.position) {
      // clearArea({
      //   context: this.context,
      //   coordinates: { x: 0, y: 0 },
      //   dimensions: this.canvasDimensions,
      // });
      drawRect({
        context: this.context,
        coordinates: this.position,
        dimensions: {
          width: 20,
          height: 20,
        },
        fill: true,
        fillStyle: this.color,
      });
      drawText({
        context: this.context,
        coordinates: { x: this.position.x + 40, y: this.position.y + 17 },
        text: this.label,
        fontSize: 20,
        fillStyle: this.color,
      });
    }
  }

  isInRange(position: PartialCoordinate2D): boolean {
    const bounds = this.getBounds();

    if (position.x === undefined || position.y === undefined) {
      return false;
    }

    if (
      position.x > bounds.x.start &&
      position.x < bounds.x.end &&
      position.y > bounds.y.start &&
      position.y < bounds.y.end
    ) {
      return true;
    }

    return false;
  }
}
