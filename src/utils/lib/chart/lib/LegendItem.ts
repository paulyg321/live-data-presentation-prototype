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
  DrawingUtils,
  legendSubject,
  gestureSubject,
} from "@/utils";
import type { Subject } from "rxjs";

export interface LegendConstructorArgs {
  label: string;
  position?: Coordinate2D;
  dimensions?: Dimensions;
  canvasDimensions: Dimensions;
  color: string;
  gestureTracker?: GestureTracker;
  drawingUtils: DrawingUtils;
}

const selectionWaitTime = 500;

export class LegendItem {
  label: string;
  private color: string;
  private position: Coordinate2D | undefined;
  private dimensions: Dimensions | undefined;
  private canvasDimensions: Dimensions;
  gestureSubject: Subject<any>;
  legendSubject: Subject<any>;
  private previousHandPositionInRange: boolean | undefined = false;
  private timer: d3.Timer | undefined;
  private context: CanvasRenderingContext2D | undefined;
  private drawingUtils: DrawingUtils | undefined;

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
    canvasDimensions,
    drawingUtils,
  }: LegendConstructorArgs) {
    if (dimensions) {
      this.dimensions = dimensions;
    }
    if (position) {
      this.position = position;
    }
    this.legendSubject = legendSubject;
    this.label = label;
    this.color = color;
    this.canvasDimensions = canvasDimensions;
    this.drawingUtils = drawingUtils;
    this.gestureSubject = gestureSubject;
    gestureSubject.subscribe({
      next: (gestureData: any) => {
        this.gestureListener(gestureData);
      },
    });
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
    this.drawingUtils?.modifyContextStyleAndDraw(
      {
        fontSize: 20,
        fillStyle: this.color,
      },
      (context) => {
        this.drawingUtils?.drawRect({
          coordinates: this.position!,
          dimensions: {
            width: 20,
            height: 20,
          },
          fill: true,
          context,
        });
        this.drawingUtils?.drawText({
          coordinates: { x: this.position!.x + 40, y: this.position!.y + 17 },
          text: this.label,
          context,
        });
      }
    );
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
