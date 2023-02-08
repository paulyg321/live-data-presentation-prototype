import { Subject } from "rxjs";
import {
  calculateDistance,
  containsValueLargerThanMax,
} from "../../calculations";
import { distanceBetweenPoints, Legend, type Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type GestureListenerSubjectMap,
  type ProcessedGestureListenerFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";
import type { MotionAndPositionTracker } from "./MotionAndPositionTracker";

export interface ForeshadowingGestureListenerConstructorArgs
  extends GestureListenerConstructorArgs {
  gestureTypes: {
    rightHand: SupportedGestures;
    leftHand: SupportedGestures;
  }[];
}

export enum ForeshadowingType {
  SHAPE = "shape",
  RANGE = "range",
}

export enum ForeshadowingShapes {
  RECTANGLE = "rectangle",
  CIRCLE = "circle",
  RANGE = "range",
}

export interface ForeshadowingRangePosition {
  leftFingerPosition: Coordinate2D;
  rightFingerPosition: Coordinate2D;
}

export interface ForeshadowingShapePosition {
  leftFingerOnePosition: Coordinate2D;
  rightFingerOnePosition: Coordinate2D;
  leftFingerTwoPosition: Coordinate2D;
  rightFingerTwoPosition: Coordinate2D;
}

export class ForeshadowingGestureListener extends GestureListener {
  subjects: GestureListenerSubjectMap = {
    trackingSubject: new Subject(),
  };

  private initialShapePositions: ForeshadowingShapePosition | undefined;
  private recentShapePositions: ForeshadowingShapePosition | undefined;
  private initialRangePositions: ForeshadowingRangePosition | undefined;
  private recentRangePositions: ForeshadowingRangePosition | undefined;
  private currentShape: ForeshadowingShapes | undefined;
  private rangeSlider: MotionAndPositionTracker | undefined;

  constructor({
    position,
    size,
    handsToTrack = [HANDS.RIGHT, HANDS.LEFT],
    gestureTypes = [
      {
        rightHand: SupportedGestures.FORESHADOWING_RIGHT_L,
        leftHand: SupportedGestures.FORESHADOWING_LEFT_L,
      },
      {
        rightHand: SupportedGestures.FORESHADOWING_RIGHT_C,
        leftHand: SupportedGestures.FORESHADOWING_LEFT_C,
      },
      {
        rightHand: SupportedGestures.OPEN_HAND,
        leftHand: SupportedGestures.OPEN_HAND,
      },
    ],
  }: ForeshadowingGestureListenerConstructorArgs) {
    super({
      position,
      size,
      handsToTrack,
    });

    this.gestureTypes = gestureTypes;
  }

  private verifyGesturesMatch({
    left,
    right,
  }: {
    left: SupportedGestures;
    right: SupportedGestures;
  }) {
    let match = false;
    let type = undefined;
    if (left === SupportedGestures.FORESHADOWING_LEFT_C) {
      match = right === SupportedGestures.FORESHADOWING_RIGHT_C;
      type = ForeshadowingType.SHAPE;
    }

    if (left === SupportedGestures.FORESHADOWING_LEFT_L) {
      match = right === SupportedGestures.FORESHADOWING_RIGHT_L;
      type = ForeshadowingType.SHAPE;
    }

    if (left === SupportedGestures.OPEN_HAND) {
      match = right === SupportedGestures.OPEN_HAND;
      type = ForeshadowingType.RANGE;
    }

    return {
      match,
      type,
    };
  }

  private resetRangeGestureState() {
    this.resetTimer();
    this.currentShape = undefined;
    this.initialRangePositions = undefined;
    this.recentRangePositions = undefined;
  }

  private resetShapeGestureState() {
    this.resetTimer();
    this.currentShape = undefined;
    this.initialShapePositions = undefined;
    this.recentShapePositions = undefined;
  }

  private isCircleShape({
    leftFingerOnePosition,
    leftFingerTwoPosition,
    rightFingerOnePosition,
    rightFingerTwoPosition,
  }: ForeshadowingShapePosition) {
    const fingerOneDist = calculateDistance(
      leftFingerOnePosition as Coordinate2D,
      rightFingerOnePosition as Coordinate2D
    );

    const fingerTwoDist = calculateDistance(
      leftFingerTwoPosition as Coordinate2D,
      rightFingerTwoPosition as Coordinate2D
    );

    if (
      fingerOneDist.euclideanDistance < 20 &&
      fingerTwoDist.euclideanDistance < 20
    ) {
      return true;
    }

    return false;
  }

  private isRectShape({
    leftFingerOnePosition,
    leftFingerTwoPosition,
    rightFingerOnePosition,
    rightFingerTwoPosition,
  }: ForeshadowingShapePosition) {
    const leftThumbRightIndexDist = calculateDistance(
      leftFingerOnePosition as Coordinate2D,
      rightFingerTwoPosition as Coordinate2D
    );

    const rightThumbLeftIndexDist = calculateDistance(
      leftFingerTwoPosition as Coordinate2D,
      rightFingerOnePosition as Coordinate2D
    );

    if (
      leftThumbRightIndexDist.euclideanDistance < 20 &&
      rightThumbLeftIndexDist.euclideanDistance < 20
    ) {
      return true;
    }

    return false;
  }

  private handleRangeGesture(fingerData: {
    left: ProcessedGestureListenerFingerData;
    right: ProcessedGestureListenerFingerData;
  }) {
    const [leftFingerToTrack] = fingerData.left.fingersToTrack;
    const leftFingerPosition = fingerData.left.fingerPositions[
      leftFingerToTrack
    ] as Coordinate2D;

    const [rightFingerToTrack] = fingerData.right.fingersToTrack;
    const rightFingerPosition = fingerData.right.fingerPositions[
      rightFingerToTrack
    ] as Coordinate2D;

    if (
      leftFingerPosition.x === undefined ||
      leftFingerPosition.y === undefined ||
      rightFingerPosition.x === undefined ||
      rightFingerPosition.y === undefined
    ) {
      throw new Error(
        "handleRangeGesture - one of the finger positions is undefined"
      );
    }

    const newRangePosition = {
      leftFingerPosition,
      rightFingerPosition,
    } as ForeshadowingRangePosition;

    const leftFingerInRange = this.isWithinObjectBounds(leftFingerPosition);
    const rightFingerInRange = this.isWithinObjectBounds(rightFingerPosition);

    const canEmit = leftFingerInRange && rightFingerInRange;

    // EMIT NEW TRACKING VALUE
    if (canEmit) {
      if (!this.timer) {
        this.initialRangePositions = newRangePosition;
        this.currentShape = ForeshadowingShapes.RANGE;
        this.startTimerInstance({
          execute: {
            onCompletion: () => {
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
                    if (this.currentShape === ForeshadowingShapes.RANGE) {
                      this.context.beginPath();
                      this.context.moveTo(
                        this.recentRangePositions.leftFingerPosition.x,
                        this.recentRangePositions.leftFingerPosition.y
                      );
                      this.context.lineTo(
                        this.recentRangePositions.rightFingerPosition.x,
                        this.recentRangePositions.rightFingerPosition.y
                      );
                      this.context.stroke();

                      //   if (this.rangeSlider) {
                      //     this.rangeSlider.unsubscribe();
                      //     this.rangeSlider.trackingSubject.unsubscribe();
                      //   }
                      //   this.rangeSlider = new MotionAndPositionTracker({
                      //     position: {
                      //       x: this.position.x,
                      //       y: Math.min(
                      //         this.recentRangePositions.leftMiddleFingerPosition
                      //           .y,
                      //         this.recentRangePositions.rightMiddleFingerPosition
                      //           .y
                      //       ),
                      //     },
                      //     size: {
                      //       width: this.size.width,
                      //       height: 50,
                      //     },
                      //     gestureSubject: this.gestureSubject,
                      //     trackerType: TrackingType.LINEAR,
                      //     gestureTypes: [
                      //       {
                      //         rightHand: SupportedGestures.POINTING,
                      //         leftHand: SupportedGestures.POINTING,
                      //       },
                      //     ],
                      //   });

                      //   this.rangeSlider.trackingSubject.subscribe({
                      //     next: (value: any) => {
                      //       this.trackingSubject.next(value);
                      //     },
                      //   });
                    }

                    this.resetRangeGestureState();
                  }
                }
              }
            },
          },
          timeout: 1000,
        });
      } else {
        this.recentRangePositions = newRangePosition;
      }
    }
  }

  private handleShapeGesture(fingerData: {
    left: ProcessedGestureListenerFingerData;
    right: ProcessedGestureListenerFingerData;
  }) {
    const [leftFingerToTrackOne, leftFingerToTrackTwo] =
      fingerData.left.fingersToTrack;
    const leftFingerOnePosition = fingerData.left.fingerPositions[
      leftFingerToTrackOne
    ] as Coordinate2D;
    const leftFingerTwoPosition = fingerData.left.fingerPositions[
      leftFingerToTrackTwo
    ] as Coordinate2D;

    const [rightFingerToTrackOne, rightFingerToTrackTwo] =
      fingerData.right.fingersToTrack;
    const rightFingerOnePosition = fingerData.left.fingerPositions[
      rightFingerToTrackOne
    ] as Coordinate2D;
    const rightFingerTwoPosition = fingerData.left.fingerPositions[
      rightFingerToTrackTwo
    ] as Coordinate2D;

    if (
      leftFingerOnePosition.x === undefined ||
      leftFingerOnePosition.y === undefined ||
      leftFingerTwoPosition.x === undefined ||
      leftFingerTwoPosition.y === undefined ||
      rightFingerOnePosition.x === undefined ||
      rightFingerOnePosition.y === undefined ||
      rightFingerTwoPosition.x === undefined ||
      rightFingerTwoPosition.y === undefined
    ) {
      throw new Error(
        "handleShapeGesture - one of the finger positions is undefined"
      );
    }

    const leftFingerOneInRange = this.isWithinObjectBounds(
      leftFingerOnePosition
    );
    const leftFingerTwoInRange = this.isWithinObjectBounds(
      leftFingerTwoPosition
    );
    const rightFingerOneInRange = this.isWithinObjectBounds(
      rightFingerOnePosition
    );
    const rightFingerTwoInRange = this.isWithinObjectBounds(
      rightFingerTwoPosition
    );

    const canEmit =
      leftFingerOneInRange &&
      leftFingerTwoInRange &&
      rightFingerOneInRange &&
      rightFingerTwoInRange;

    if (canEmit) {
      const newShapePosition = {
        leftFingerOnePosition,
        leftFingerTwoPosition,
        rightFingerOnePosition,
        rightFingerTwoPosition,
      } as ForeshadowingShapePosition;
      const isCircle = this.isCircleShape(newShapePosition);
      const isRectangle = this.isRectShape(newShapePosition);

      if (isCircle || isRectangle) {
        if (!this.timer) {
          this.initialShapePositions = newShapePosition;
          this.currentShape = isCircle
            ? ForeshadowingShapes.CIRCLE
            : isRectangle
            ? ForeshadowingShapes.RECTANGLE
            : undefined;
          this.timer = this.startTimerInstance({
            execute: {
              onCompletion: () => {
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
                      //   if (this.currentShape === ForeshadowingShapes.RECTANGLE) {
                      //     this.context.fillRect(
                      //       this.recentShapePositions.rightIndexPosition.x,
                      //       this.recentShapePositions.rightThumbPosition.y,
                      //       this.recentShapePositions.rightThumbPosition.x -
                      //         this.recentShapePositions.rightIndexPosition.x,
                      //       this.recentShapePositions.rightIndexPosition.y -
                      //         this.recentShapePositions.rightThumbPosition.y
                      //     );
                      //   } else if (this.currentShape === ForeshadowingShapes.CIRCLE) {
                      //     const circleRadius =
                      //       (this.recentShapePositions.rightThumbPosition.y -
                      //         this.recentShapePositions.rightIndexPosition.y) /
                      //       2;
                      //     this.context.beginPath();
                      //     this.context.arc(
                      //       this.recentShapePositions.rightIndexPosition.x,
                      //       this.recentShapePositions.rightIndexPosition.y +
                      //         circleRadius,
                      //       circleRadius,
                      //       0,
                      //       2 * Math.PI,
                      //       false
                      //     );
                      //     this.context.fill();
                      //   }
                    }
                  }
                }
              },
            },
            timeout: 1000,
          });
        } else {
          this.recentShapePositions = newShapePosition;
        }
      }
    }
  }

  // Implemented to only track one finger and one hand
  handleNewData(fingerData: {
    left?: ProcessedGestureListenerFingerData;
    right?: ProcessedGestureListenerFingerData;
  }): void {
    if (fingerData.left && fingerData.right) {
      const { match, type } = this.verifyGesturesMatch({
        left: fingerData.left?.detectedGesture,
        right: fingerData.right?.detectedGesture,
      });

      if (match) {
        if (type === ForeshadowingType.RANGE) {
          this.handleRangeGesture(fingerData as Required<typeof fingerData>);
        } else if (type === ForeshadowingType.SHAPE) {
          this.handleShapeGesture(fingerData as Required<typeof fingerData>);
        }
      }
    }
  }
}
