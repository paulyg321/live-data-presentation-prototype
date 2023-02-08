import * as d3 from "d3";
import { CanvasText } from "./canvas-text";
import type { AnimatedLine } from "./animated-line";
import {
  convertGestureAndLandmarksToPositions,
  SupportedGestures,
  type Coordinate2D,
  type PartialCoordinate2D,
  type GestureTracker,
  type GestureTrackerValues,
  HAND_LANDMARK_IDS,
} from "@/utils";
import type { Subject } from "rxjs";

export interface LegendConstructorArgs {
  label: string;
  position: Coordinate2D;
  color: string;
  line: AnimatedLine;
  gestureTracker: GestureTracker;
  legendSubject: Subject<any>;
}

const selectionWaitTime = 500;

export class Legend {
  label: string;
  private color: string;
  private position: Coordinate2D;
  private line: AnimatedLine;
  private bounds: any;
  private text: CanvasText;
  gestureTracker: GestureTracker;
  legendSubject: Subject<any>;
  private positionStack: boolean[] = [];
  private timer: d3.Timer | undefined = undefined;

  static width = 200;
  static height = 35;

  constructor({
    label,
    color,
    position,
    line,
    gestureTracker,
    // passing the subject so all legends can share the same subject and push their keys when they're in range
    legendSubject,
  }: LegendConstructorArgs) {
    this.label = label;
    this.color = color;
    this.position = position;
    this.line = line;
    this.bounds = {
      x: {
        start: position.x,
        end: position.x + Legend.width,
      },
      y: {
        start: position.y,
        end: position.y + Legend.height,
      },
    };
    this.text = new CanvasText({
      position: { x: position.x + 40, y: position.y + 17 },
      color: this.color,
      label,
    });
    this.legendSubject = legendSubject;
    this.gestureTracker = gestureTracker;
    this.gestureTracker.gestureSubject.subscribe({
      next: (gestureData: GestureTrackerValues) => {
        this.gestureListener(gestureData);
      },
    });
  }

  gestureListener(gestureData: GestureTrackerValues) {
    const {
      rightHandLandmarks,
      rightHandGestures,
      leftHandLandmarks,
      leftHandGestures,
    } = gestureData;

    const rightHandPosition = convertGestureAndLandmarksToPositions({
      landmarkData: rightHandLandmarks,
      gestureData: rightHandGestures,
      gestureType: SupportedGestures.POINTING,
    });

    const leftHandPosition = convertGestureAndLandmarksToPositions({
      landmarkData: leftHandLandmarks,
      gestureData: leftHandGestures,
      gestureType: SupportedGestures.POINTING,
    });

    if (rightHandPosition) {
      if (
        this.isInRange(rightHandPosition[HAND_LANDMARK_IDS.index_finger_tip])
      ) {
        if (this.positionStack.length === 0) {
          this.initializeSelectionTimer();
        }
        this.positionStack.push(true);
      } else if (this.positionStack.length >= 1) {
        this.positionStack.push(false);
      }
    }
  }

  initializeSelectionTimer() {
    this.timer = d3.timer((elapsed) => {
      const boundedTimeStep = Math.min(elapsed / selectionWaitTime, 1);

      if (boundedTimeStep === 1) {
        const lastPositionInRange = this.positionStack.pop();
        this.positionStack = [];
        if (lastPositionInRange) {
          this.legendSubject.next(this.label);
        }
        this.timer?.stop();
      }
    });
  }

  drawLegend({ ctx }: { ctx?: CanvasRenderingContext2D | null }) {
    if (ctx) {
      ctx.fillStyle = this.color;

      ctx?.fillRect(this.position.x, this.position.y, 20, 20);
      this.text.drawText({ ctx });
    }
  }

  isInRange(position: PartialCoordinate2D): boolean {
    if (position.x === undefined || position.y === undefined) {
      return false;
    }

    if (
      position.x > this.bounds.x.start &&
      position.x < this.bounds.x.end &&
      position.y > this.bounds.y.start &&
      position.y < this.bounds.y.end
    ) {
      return true;
    }

    return false;
  }

  // handleHover(position: Coordinate2D, endIndex: number, callback?: () => void) {
  //   if (this.isInRange(position)) {
  //     this.line.setEndIndex(endIndex);
  //     if (callback) {
  //       callback();
  //     }
  //   }
  // }

  // getLine() {
  //   return this.line;
  // }
}
