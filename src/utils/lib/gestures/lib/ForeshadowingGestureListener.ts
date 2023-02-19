import { drawCircle, drawLine, drawRect } from "@/utils";
import { Subject } from "rxjs";
import {
  calculateDistance,
  containsValueLargerThanMax,
} from "../../calculations";
import { distanceBetweenPoints, type Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type GestureListenerSubjectMap,
  type ProcessedGestureListenerFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";
import { LinearPlaybackGestureListener } from "./LinearPlaybackGestureListener";

export type ForeshadowingGestureListenerConstructorArgs =
  GestureListenerConstructorArgs;

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
  leftIndex: Coordinate2D;
  leftThumb: Coordinate2D;
  rightIndex: Coordinate2D;
  rightThumb: Coordinate2D;
}

export class ForeshadowingGestureListener extends GestureListener {
  static trackingSubjectKey = "trackingSubject";
  static foreshadowingAreaSubjectKey = "foreshadowingAreaSubject";

  subjects: GestureListenerSubjectMap = {
    [ForeshadowingGestureListener.trackingSubjectKey]: new Subject(),
    [ForeshadowingGestureListener.foreshadowingAreaSubjectKey]: new Subject(),
  };

  private initialShapePositions: ForeshadowingShapePosition | undefined;
  private recentShapePositions: ForeshadowingShapePosition | undefined;
  private initialRangePositions: ForeshadowingRangePosition | undefined;
  private recentRangePositions: ForeshadowingRangePosition | undefined;
  private currentShape: ForeshadowingShapes | undefined;
  private rangeSlider: LinearPlaybackGestureListener | undefined;

  constructor({
    position,
    dimensions,
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
    gestureSubject,
    canvasDimensions,
  }: ForeshadowingGestureListenerConstructorArgs) {
    super({
      position,
      dimensions,
      handsToTrack,
      gestureSubject,
      canvasDimensions,
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

  private placeListenerInPosition() {
    if (this.recentRangePositions) {
      if (this.rangeSlider) {
        this.rangeSlider.updateState({
          position: {
            x: this.position.x,
            y: Math.min(
              this.recentRangePositions.leftFingerPosition.y,
              this.recentRangePositions.rightFingerPosition.y
            ),
          },
          dimensions: {
            width: this.dimensions.width,
            height: 50,
          },
          emitRange: {
            start: this.recentRangePositions.leftFingerPosition,
            end: this.recentRangePositions.rightFingerPosition,
          },
        });
      } else {
        this.rangeSlider = new LinearPlaybackGestureListener({
          position: {
            x: this.position.x,
            y: Math.min(
              this.recentRangePositions.leftFingerPosition.y,
              this.recentRangePositions.rightFingerPosition.y
            ),
          },
          dimensions: {
            width: this.dimensions.width,
            height: 50,
          },
          gestureSubject: this.gestureSubject,
          canvasDimensions: this.canvasDimensions ?? { width: 0, height: 0 },
          emitRange: {
            start: this.recentRangePositions.leftFingerPosition,
            end: this.recentRangePositions.rightFingerPosition,
          },
        });

        this.rangeSlider.subjects[
          LinearPlaybackGestureListener.trackingSubjectKey
        ].subscribe({
          next: (value: any) => {
            this.subjects[ForeshadowingGestureListener.trackingSubjectKey].next(
              value
            );
          },
        });
      }
    }
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
    leftIndex,
    leftThumb,
    rightIndex,
    rightThumb,
  }: ForeshadowingShapePosition) {
    const fingerOneDist = calculateDistance(
      leftIndex as Coordinate2D,
      rightIndex as Coordinate2D
    );

    const fingerTwoDist = calculateDistance(
      leftThumb as Coordinate2D,
      rightThumb as Coordinate2D
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
    leftIndex,
    leftThumb,
    rightIndex,
    rightThumb,
  }: ForeshadowingShapePosition) {
    const leftThumbRightIndexDist = calculateDistance(
      leftThumb as Coordinate2D,
      rightIndex as Coordinate2D
    );

    const rightThumbLeftIndexDist = calculateDistance(
      rightThumb as Coordinate2D,
      leftIndex as Coordinate2D
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
        this.timer = this.startTimeoutInstance({
          onCompletion: () => {
            if (this.initialRangePositions && this.recentRangePositions) {
              const diffs = distanceBetweenPoints(
                Object.values(this.initialRangePositions),
                Object.values(this.recentRangePositions)
              ).map((diff: any) => diff.euclideanDistance);

              if (!containsValueLargerThanMax(diffs, 30)) {
                if (this.context) {
                  if (this.currentShape === ForeshadowingShapes.RANGE) {
                    if (this.currentShape) {
                      this.drawVisualIndicator(this.currentShape);
                      this.placeListenerInPosition();
                    }
                  }

                  this.resetRangeGestureState();
                }
              }
            }
            this.timer = undefined;
          },
          timeout: 1000,
        });
      } else {
        this.recentRangePositions = newRangePosition;
      }
    }
  }

  private drawVisualIndicator(shape: ForeshadowingShapes) {
    if (this.context) {
      const fillStyle = "#EE4B2B";
      const opacity = 0.5;

      this.clearCanvas();

      if (
        shape === ForeshadowingShapes.RECTANGLE &&
        this.recentShapePositions
      ) {
        const rectDimensions = {
          width:
            this.recentShapePositions.rightThumb.x -
            this.recentShapePositions.rightIndex.x,
          height:
            this.recentShapePositions.rightIndex.y -
            this.recentShapePositions.rightThumb.y,
        };
        const rectCoordinates = {
          x: this.recentShapePositions.rightIndex.x,
          y: this.recentShapePositions.rightThumb.y,
        };

        drawRect({
          context: this.context,
          coordinates: rectCoordinates,
          dimensions: rectDimensions,
          stroke: true,
          strokeStyle: fillStyle,
          opacity,
        });

        this.subjects[
          ForeshadowingGestureListener.foreshadowingAreaSubjectKey
        ].next({
          position: rectCoordinates,
          dimensions: rectDimensions,
        });
      }
      if (shape === ForeshadowingShapes.CIRCLE && this.recentShapePositions) {
        const circleRadius =
          (this.recentShapePositions.rightThumb.y -
            this.recentShapePositions.rightIndex.y) /
          2;
        const circlePosition = {
          x: this.recentShapePositions.rightIndex.x,
          y: this.recentShapePositions.rightIndex.y + circleRadius,
        };
        drawCircle({
          context: this.context,
          radius: circleRadius,
          coordinates: circlePosition,
          fill: true,
          fillStyle,
          opacity,
        });
      }

      if (shape === ForeshadowingShapes.RANGE && this.recentRangePositions) {
        const lineWidth = 15;
        const startCoordinates = {
          x: this.recentRangePositions.leftFingerPosition.x,
          y: this.recentRangePositions.leftFingerPosition.y,
        };

        const endCoordinates = {
          x: this.recentRangePositions.rightFingerPosition.x,
          y: this.recentRangePositions.rightFingerPosition.y,
        };

        drawLine({
          context: this.context,
          startCoordinates,
          endCoordinates,
          lineWidth,
          strokeStyle: fillStyle,
        });
      }
    }
  }

  private handleShapeGesture(fingerData: {
    left: ProcessedGestureListenerFingerData;
    right: ProcessedGestureListenerFingerData;
  }) {
    const [leftIndexLandmarkId, leftThumbLandmarkId] =
      fingerData.left.fingersToTrack;
    const leftIndex = fingerData.left.fingerPositions[
      leftIndexLandmarkId
    ] as Coordinate2D;
    const leftThumb = fingerData.left.fingerPositions[
      leftThumbLandmarkId
    ] as Coordinate2D;

    const [rightIndexLandmarkId, rightThumbLandmarkId] =
      fingerData.right.fingersToTrack;
    const rightIndex = fingerData.right.fingerPositions[
      rightIndexLandmarkId
    ] as Coordinate2D;
    const rightThumb = fingerData.right.fingerPositions[
      rightThumbLandmarkId
    ] as Coordinate2D;

    if (
      leftIndex.x === undefined ||
      leftIndex.y === undefined ||
      leftThumb.x === undefined ||
      leftThumb.y === undefined ||
      rightIndex.x === undefined ||
      rightIndex.y === undefined ||
      rightThumb.x === undefined ||
      rightThumb.y === undefined
    ) {
      throw new Error(
        "handleShapeGesture - one of the finger positions is undefined"
      );
    }

    const leftIndexInRange = this.isWithinObjectBounds(leftIndex);
    const leftThumbInRange = this.isWithinObjectBounds(leftThumb);
    const rightIndexInRange = this.isWithinObjectBounds(rightIndex);
    const rightThumbInRange = this.isWithinObjectBounds(rightThumb);

    const canEmit =
      leftIndexInRange &&
      leftThumbInRange &&
      rightIndexInRange &&
      rightThumbInRange;

    const newShapePosition = {
      leftIndex,
      leftThumb,
      rightIndex,
      rightThumb,
    } as ForeshadowingShapePosition;
    const isCircle = this.isCircleShape(newShapePosition);
    const isRectangle = this.isRectShape(newShapePosition);

    if (canEmit && (isCircle || isRectangle)) {
      if (!this.timer) {
        this.initialShapePositions = newShapePosition;
        this.currentShape = isCircle
          ? ForeshadowingShapes.CIRCLE
          : isRectangle
          ? ForeshadowingShapes.RECTANGLE
          : undefined;

        this.timer = this.startTimeoutInstance({
          onCompletion: () => {
            if (this.initialShapePositions && this.recentShapePositions) {
              const diffs = distanceBetweenPoints(
                Object.values(this.initialShapePositions),
                Object.values(this.recentShapePositions)
              ).map((diff) => diff.euclideanDistance);

              if (!containsValueLargerThanMax(diffs, 30)) {
                if (this.currentShape) {
                  this.drawVisualIndicator(this.currentShape);
                }
              }
            }
            this.timer = undefined;
          },
          timeout: 1000,
        });
      } else {
        this.recentShapePositions = newShapePosition;
      }
    }
  }

  // Implemented to only track one finger and one hand
  protected handleNewData(fingerData: {
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

  renderReferencePoints() {
    if (this.context) {
      this.clearCanvas();
      this.renderBorder();
    }
  }
}
