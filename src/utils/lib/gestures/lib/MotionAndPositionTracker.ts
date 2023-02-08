import * as d3 from "d3";
import { Subject, Subscription } from "rxjs";
import type { GestureTrackerValues } from "./GestureTracker";
import {
  convertGestureAndLandmarksToPositions,
  type FingerPositionData,
} from "./gesture-utils";
import { SupportedGestures } from "./handGestures";
import { HAND_LANDMARK_IDS } from "../../media-pipe";
import {
  distanceBetweenPoints,
  type Coordinate2D,
  type Dimensions,
  type PartialCoordinate2D,
} from "../../chart";
import {
  calculateDistance,
  containsValueLargerThanMax,
} from "../../calculations";

export enum TrackingType {
  LINEAR = "linear",
  RADIAL = "radial",
  EMPHASIS = "emphasis",
  FORESHADOWING = "foreshadowing",
}

export interface ForeshadowingShapePosition {
  leftThumbPosition: Coordinate2D;
  rightThumbPosition: Coordinate2D;
  leftIndexPosition: Coordinate2D;
  rightIndexPosition: Coordinate2D;
}

export interface ForeshadowingRangePosition {
  leftMiddleFingerPosition: Coordinate2D;
  rightMiddleFingerPosition: Coordinate2D;
}

export interface MotionAndPositionTrackerConstructorArgs {
  position: Coordinate2D;
  size: Dimensions;
  gestureSubject: Subject<any>;
  trackerType: TrackingType;
  gestureTypes: {
    rightHand: SupportedGestures;
    leftHand: SupportedGestures;
  }[];
}

export class MotionAndPositionTracker {
  private position: Coordinate2D;
  private size: Dimensions;
  private centerPoint: Coordinate2D;
  private timer: d3.Timer | undefined = undefined;
  private gestureSubject: Subject<any>;
  private gestureSubscription: Subscription | undefined;
  private trackerType: TrackingType;
  private context: CanvasRenderingContext2D | undefined;

  trackingSubject = new Subject();
  // DIALLING STATES
  private mode: MotionTrackerMode = MotionTrackerMode.NORMAL;
  playbackSubject = new Subject();
  rotations = 0;
  angleStack: number[] = [];

  // EMPHASIS STATES
  emphasisMeter = 0;
  emphasisIncrementSubject = new Subject();
  emphasisDecrementSubject = new Subject();
  isPreviousPositionInRange: any = undefined;

  // FORESHADOWING STATES
  initialShapePositions: ForeshadowingShapePosition | undefined;
  recentShapePositions: ForeshadowingShapePosition | undefined;
  initialRangePositions: ForeshadowingRangePosition | undefined;
  recentRangePositions: ForeshadowingRangePosition | undefined;
  currentShape: "Circle" | "Rectangle" | "Range" | undefined;
  rangeSlider: MotionAndPositionTracker | undefined;

  constructor({
    position,
    size,
    gestureSubject,
    trackerType,
    gestureTypes,
  }: MotionAndPositionTrackerConstructorArgs) {
    this.position = position;
    this.size = size;
    this.centerPoint = {
      x: position.x + size.width / 2,
      y: position.y + size.height / 2,
    };
    // Set up listener for gesture subject
    this.gestureSubject = gestureSubject;
    this.trackerType = trackerType;
    this.gestureSubscription = this.gestureSubject.subscribe({
      next: this.gestureListener(trackerType, gestureTypes),
    });
  }

  private gestureListener(
    type: TrackingType,
    gestureTypes: {
      rightHand: SupportedGestures;
      leftHand: SupportedGestures;
    }[]
  ) {
    if (type === TrackingType.FORESHADOWING) {
      return (gestureData: GestureTrackerValues) => {
        const {
          rightHandLandmarks,
          rightHandGestures,
          leftHandLandmarks,
          leftHandGestures,
        } = gestureData;

        gestureTypes.forEach(
          (gestureType: {
            rightHand: SupportedGestures;
            leftHand: SupportedGestures;
          }) => {
            const rightHandPosition = convertGestureAndLandmarksToPositions({
              landmarkData: rightHandLandmarks,
              gestureData: rightHandGestures,
              gestureType: gestureType.rightHand,
            });

            const leftHandPosition = convertGestureAndLandmarksToPositions({
              landmarkData: leftHandLandmarks,
              gestureData: leftHandGestures,
              gestureType: gestureType.leftHand,
            });

            if (leftHandPosition && rightHandPosition) {
              let type: "C" | "L" | "I" | undefined;
              if (
                gestureType.rightHand ===
                SupportedGestures.FORESHADOWING_RIGHT_C
              ) {
                type = "C";
              } else if (
                gestureType.rightHand ===
                SupportedGestures.FORESHADOWING_RIGHT_L
              ) {
                type = "L";
              } else if (
                gestureType.rightHand === SupportedGestures.OPEN_HAND
              ) {
                type = "I";
              }

              if (type) {
                this.foreshadowingListener(
                  {
                    left: leftHandPosition,
                    right: rightHandPosition,
                  },
                  type
                );
              }
            }
          }
        );
      };
    }

    if (type === TrackingType.EMPHASIS) {
      return (gestureData: GestureTrackerValues) => {
        // TODO: Use new EmphasisGestureHandler()
      };
    }

    if (type === TrackingType.RADIAL) {
      return (gestureData: GestureTrackerValues) => {
        // TODO: Use new RadialPlaybackGestureHandler()
      };
    }

    // Default to Linear
    return (gestureData: GestureTrackerValues) => {
      // TODO: Use new LinearPlaybackGestureHandler()
    };
  }

  private foreshadowingListener(
    positionData: {
      left: FingerPositionData;
      right: FingerPositionData;
    },
    type: "C" | "L" | "I"
  ) {
    if (type === "L" || type === "C") {
      this.foreshadowingListenerTypeCorL(positionData);
    } else if (type === "I") {
      this.foreshadowingListenerTypeI(positionData);
    }
  }

  private foreshadowingListenerTypeI(positionData: {
    left: FingerPositionData;
    right: FingerPositionData;
  }) {
    const leftMiddleFingerPosition =
      positionData.left[HAND_LANDMARK_IDS.middle_finger_tip];
    const rightMiddleFingerPosition =
      positionData.right[HAND_LANDMARK_IDS.middle_finger_tip];

    if (
      leftMiddleFingerPosition.x === undefined ||
      leftMiddleFingerPosition.y === undefined ||
      rightMiddleFingerPosition.x === undefined ||
      rightMiddleFingerPosition.y === undefined
    ) {
      throw new Error(
        "foreshadowingListenerTypeI - one of the finger positions is undefined"
      );
    }

    const newRangePosition = {
      leftMiddleFingerPosition,
      rightMiddleFingerPosition,
    } as ForeshadowingRangePosition;

    if (
      this.isWithinObjectBounds(leftMiddleFingerPosition) &&
      this.isWithinObjectBounds(rightMiddleFingerPosition)
    ) {
      console.log({
        timer: this.timer,
        currentShape: this.currentShape,
      });
      if (!this.timer && !this.currentShape) {
        this.initialRangePositions = newRangePosition;
        this.currentShape = "Range";
        this.timer = d3.timer((elapsed: number) => {
          const boundedTimeStep = Math.min(elapsed / 1000, 1);

          if (boundedTimeStep === 1) {
            if (this.initialRangePositions && this.recentRangePositions) {
              const diffs = distanceBetweenPoints(
                Object.values(this.initialRangePositions),
                Object.values(this.recentRangePositions)
              ).map((diff: any) => diff.euclideanDistance);
              if (containsValueLargerThanMax(diffs, 30)) {
                if (this.context) {
                  this.context.clearRect(
                    this.position.x,
                    this.position.y,
                    this.size.width,
                    this.size.height
                  );
                  this.context.strokeStyle = "#EE4B2B";
                  this.context.globalAlpha = 0.5;
                  this.context.lineWidth = 15;

                  // TODO: Create a class that handles the drawing of the range
                  if (this.currentShape === "Range") {
                    this.context.beginPath();
                    this.context.moveTo(
                      this.recentRangePositions.leftMiddleFingerPosition.x,
                      this.recentRangePositions.leftMiddleFingerPosition.y
                    );
                    this.context.lineTo(
                      this.recentRangePositions.rightMiddleFingerPosition.x,
                      this.recentRangePositions.rightMiddleFingerPosition.y
                    );
                    this.context.stroke();

                    if (this.rangeSlider) {
                      this.rangeSlider.unsubscribe();
                      this.rangeSlider.trackingSubject.unsubscribe();
                    }
                    this.rangeSlider = new MotionAndPositionTracker({
                      position: {
                        x: this.position.x,
                        y: Math.min(
                          this.recentRangePositions.leftMiddleFingerPosition.y,
                          this.recentRangePositions.rightMiddleFingerPosition.y
                        ),
                      },
                      size: {
                        width: this.size.width,
                        height: 50,
                      },
                      gestureSubject: this.gestureSubject,
                      trackerType: TrackingType.LINEAR,
                      gestureTypes: [
                        {
                          rightHand: SupportedGestures.POINTING,
                          leftHand: SupportedGestures.POINTING,
                        },
                      ],
                    });

                    this.rangeSlider.trackingSubject.subscribe({
                      next: (value: any) => {
                        this.trackingSubject.next(value);
                      },
                    });
                  }
                }
              }
            }
            this.timer?.stop();
            this.timer = undefined;
            this.currentShape = undefined;
            this.initialRangePositions = undefined;
            this.recentRangePositions = undefined;
          }
        });
      } else {
        this.recentRangePositions = newRangePosition;
      }
    }
  }

  private foreshadowingListenerTypeCorL(positionData: {
    left: FingerPositionData;
    right: FingerPositionData;
  }) {
    const leftThumbPosition = positionData.left[HAND_LANDMARK_IDS.thumb_tip];
    const leftIndexPosition =
      positionData.left[HAND_LANDMARK_IDS.index_finger_tip];
    const rightThumbPosition = positionData.right[HAND_LANDMARK_IDS.thumb_tip];
    const rightIndexPosition =
      positionData.right[HAND_LANDMARK_IDS.index_finger_tip];

    if (
      leftThumbPosition.x === undefined ||
      leftThumbPosition.y === undefined ||
      leftIndexPosition.x === undefined ||
      leftIndexPosition.y === undefined ||
      rightThumbPosition.x === undefined ||
      rightThumbPosition.y === undefined ||
      rightIndexPosition.x === undefined ||
      rightIndexPosition.y === undefined
    ) {
      throw new Error(
        "foreshadowingListenerTypeCorL - one of the finger positions is undefined"
      );
    }

    if (
      this.isWithinObjectBounds(leftThumbPosition) &&
      this.isWithinObjectBounds(leftIndexPosition) &&
      this.isWithinObjectBounds(rightThumbPosition) &&
      this.isWithinObjectBounds(rightIndexPosition)
    ) {
      const newShapePosition = {
        leftThumbPosition,
        rightThumbPosition,
        leftIndexPosition,
        rightIndexPosition,
      } as ForeshadowingShapePosition;
      const isCircle = this.isCircleShape(newShapePosition);
      const isRectangle = this.isRectShape(newShapePosition);

      if (isCircle || isRectangle) {
        if (!this.timer && !this.currentShape) {
          this.initialShapePositions = newShapePosition;
          this.currentShape = isCircle
            ? "Circle"
            : isRectangle
            ? "Rectangle"
            : undefined;
          this.timer = d3.timer((elapsed: number) => {
            const boundedTimeStep = Math.min(elapsed / 1000, 1);
            if (boundedTimeStep === 1) {
              if (this.initialShapePositions && this.recentShapePositions) {
                const diffs = distanceBetweenPoints(
                  Object.values(this.initialShapePositions),
                  Object.values(this.recentShapePositions)
                ).map((diff) => diff.euclideanDistance);
                if (containsValueLargerThanMax(diffs, 30)) {
                  if (this.context) {
                    this.context.clearRect(
                      this.position.x,
                      this.position.y,
                      this.size.width,
                      this.size.height
                    );
                    this.context.fillStyle = "#EE4B2B";
                    this.context.globalAlpha = 0.5;
                    // TODO: Create class to draw circle and rectangle;
                    if (this.currentShape === "Rectangle") {
                      this.context.fillRect(
                        this.recentShapePositions.rightIndexPosition.x,
                        this.recentShapePositions.rightThumbPosition.y,
                        this.recentShapePositions.rightThumbPosition.x -
                          this.recentShapePositions.rightIndexPosition.x,
                        this.recentShapePositions.rightIndexPosition.y -
                          this.recentShapePositions.rightThumbPosition.y
                      );
                    } else if (this.currentShape === "Circle") {
                      const circleRadius =
                        (this.recentShapePositions.rightThumbPosition.y -
                          this.recentShapePositions.rightIndexPosition.y) /
                        2;
                      this.context.beginPath();
                      this.context.arc(
                        this.recentShapePositions.rightIndexPosition.x,
                        this.recentShapePositions.rightIndexPosition.y +
                          circleRadius,
                        circleRadius,
                        0,
                        2 * Math.PI,
                        false
                      );
                      this.context.fill();
                    }
                  }
                }
              }
              this.timer?.stop();
              this.timer = undefined;
              this.currentShape = undefined;
              this.initialShapePositions = undefined;
              this.recentShapePositions = undefined;
            }
          });
        } else {
          this.recentShapePositions = newShapePosition;
        }
      }
    }
  }

  private renderBorder({ ctx }: { ctx: CanvasRenderingContext2D }) {
    ctx.strokeStyle = "skyblue";
    ctx.beginPath();
    ctx.roundRect(
      this.position.x,
      this.position.y,
      this.size.width,
      this.size.height,
      [20]
    );
    ctx.stroke();
  }

  private getCenterPoint(): Coordinate2D {
    return {
      x: this.position.x + this.size.width / 2,
      y: this.position.y + this.size.height / 2,
    };
  }

  private renderCenterPoint({ ctx }: { ctx: CanvasRenderingContext2D }) {
    ctx.fillStyle = "skyblue";
    ctx.beginPath();
    ctx.arc(this.centerPoint.x, this.centerPoint.y, 5, 0, 2 * Math.PI, false);
    ctx.fill();
  }

  private isCircleShape({
    leftThumbPosition,
    leftIndexPosition,
    rightThumbPosition,
    rightIndexPosition,
  }: ForeshadowingShapePosition) {
    const leftThumbRightThumbDist = calculateDistance(
      leftThumbPosition as Coordinate2D,
      rightThumbPosition as Coordinate2D
    );

    const rightIndexLeftIndexDist = calculateDistance(
      rightIndexPosition as Coordinate2D,
      leftIndexPosition as Coordinate2D
    );

    if (
      leftThumbRightThumbDist.euclideanDistance < 20 &&
      rightIndexLeftIndexDist.euclideanDistance < 20
    ) {
      return true;
    }

    return false;
  }

  private isRectShape({
    leftThumbPosition,
    leftIndexPosition,
    rightThumbPosition,
    rightIndexPosition,
  }: ForeshadowingShapePosition) {
    const leftThumbRightIndexDist = calculateDistance(
      leftThumbPosition as Coordinate2D,
      rightIndexPosition as Coordinate2D
    );

    const rightThumbLeftIndexDist = calculateDistance(
      rightThumbPosition as Coordinate2D,
      leftIndexPosition as Coordinate2D
    );

    if (
      leftThumbRightIndexDist.euclideanDistance < 20 &&
      rightThumbLeftIndexDist.euclideanDistance < 20
    ) {
      return true;
    }

    return false;
  }

  isWithinObjectBounds(position: PartialCoordinate2D) {
    if (position.x === undefined || position.y === undefined) {
      return false;
    }

    const { x: minX, y: minY } = this.position;
    const { maxX, maxY } = {
      maxX: this.position.x + this.size.width,
      maxY: this.position.y + this.size.height,
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

  // Add method to linearListener called "canEmit" that checks if limit field variable is set
  // if its set then we compare positions to the limit to see if we're good to emit.

  renderReferencePoints({
    ctx,
    canvasDim,
  }: {
    ctx: CanvasRenderingContext2D;
    canvasDim: Dimensions;
  }) {
    ctx.clearRect(0, 0, canvasDim.width, canvasDim.height);
    this.renderBorder({ ctx });
    if (this.trackerType === TrackingType.RADIAL) {
      this.renderCenterPoint({ ctx });
    }
  }

  setContext(ctx: CanvasRenderingContext2D) {
    // Also set context of handlers
    this.context = ctx;
  }

  unsubscribe() {
    this.gestureSubscription?.unsubscribe();
    if (this.rangeSlider) {
      this.rangeSlider.trackingSubject.unsubscribe();
    }
  }
}
