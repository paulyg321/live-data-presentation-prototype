import {
  EmphasisGestureListener,
  ForeshadowingAreaSubjectType,
  LineShape,
  startTimeoutInstance,
  type EmphasisGestureListenerConstructorArgs,
} from "@/utils";
import {
  calculateDistance,
  containsValueLargerThanMax,
} from "../../calculations";
import { distanceBetweenPoints, type Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";
import {
  LinearPlaybackGestureListener,
  type LinearPlaybackGestureListenerConstructorArgs,
} from "./LinearPlaybackGestureListener";

export interface ForeshadowingGestureListenerConstructorArgs
  extends GestureListenerConstructorArgs {
  mode?: ForeshadowingShapes;
  playbackControllerType?: "absolute" | "relative";
}

type ForeshadowingResetKeys = "KeyC" | "KeyA" | "KeyE";

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
  static playbackSubjectKey = "playbackSubject";
  static emphasisSubjectKey = "emphasisSubject";
  static foreshadowingAreaSubjectKey = "foreshadowingAreaSubject";

  private initialShapePositions: ForeshadowingShapePosition | undefined;
  private recentShapePositions: ForeshadowingShapePosition | undefined;

  private initialRangePositions: ForeshadowingRangePosition | undefined;
  private recentRangePositions: ForeshadowingRangePosition | undefined;

  private currentShape: ForeshadowingShapes | undefined;

  private emphasisController: EmphasisGestureListener | undefined;
  private mode: ForeshadowingShapes;

  private playbackController: LinearPlaybackGestureListener | undefined;
  private playbackControllerType: "relative" | "absolute" | undefined;
  private showVisualIndicators = false;

  constructor({
    position,
    dimensions,
    handsToTrack = {
      dominant: HANDS.RIGHT,
      nonDominant: HANDS.LEFT,
    },
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
    resetKeys,
    subjects,
    mode = ForeshadowingShapes.RANGE,
    playbackControllerType,
    eventContext,
  }: ForeshadowingGestureListenerConstructorArgs) {
    super({
      position,
      dimensions,
      handsToTrack,
      gestureSubject,
      canvasDimensions,
      resetKeys,
      subjects,
      eventContext,
    });

    this.gestureTypes = gestureTypes;
    this.mode = mode;
    this.playbackControllerType = playbackControllerType;
    this.setModeSwitcher();
  }

  private keyToModeMap: Record<ForeshadowingResetKeys, ForeshadowingShapes> = {
    KeyC: ForeshadowingShapes.CIRCLE,
    KeyA: ForeshadowingShapes.RANGE,
    KeyE: ForeshadowingShapes.RECTANGLE,
  };

  private setModeSwitcher() {
    Object.keys(this.keyToModeMap)?.forEach((modeSwitchKey: string) => {
      document.addEventListener("keypress", (event) => {
        if (event.code === modeSwitchKey) {
          this.mode =
            this.keyToModeMap[modeSwitchKey as ForeshadowingResetKeys];
        }
      });
    });
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

  private placeListenerInPosition(shape: ForeshadowingShapes) {
    if (shape === ForeshadowingShapes.RECTANGLE) {
      const rectData = this.getRectDataFromState();

      if (!rectData) return;

      const { coordinates, dimensions } = rectData;

      const emphasisSubject = this.getSubjectByKey(
        ForeshadowingGestureListener.emphasisSubjectKey
      );

      const emphasisControllerState: EmphasisGestureListenerConstructorArgs = {
        position: coordinates,
        dimensions,
        gestureSubject: this.gestureSubject,
        canvasDimensions: this.canvasDimensions,
        resetKeys: this.resetKeys,
        ...(emphasisSubject
          ? {
              subjects: {
                [EmphasisGestureListener.emphasisSubjectKey]: emphasisSubject,
              },
            }
          : {}),
        context: this.context,
      };

      if (this.emphasisController) {
        this.emphasisController.updateState(emphasisControllerState);
      } else {
        this.emphasisController = new EmphasisGestureListener(
          emphasisControllerState
        );
      }
    }
    if (shape === ForeshadowingShapes.RANGE && this.recentRangePositions) {
      const playbackSubject = this.getSubjectByKey(
        ForeshadowingGestureListener.playbackSubjectKey
      );

      const rangeData = this.getRangeDataFromState();

      if (!rangeData) return;

      let position;

      let dimensions;

      const { startCoordinates, endCoordinates } = rangeData;

      if (this.playbackControllerType === "absolute") {
        const width = endCoordinates.x - startCoordinates.x;

        if (width <= 0) return;

        position = startCoordinates;
        dimensions = {
          width,
          height: 50,
        };
      } else {
        position = {
          x: this.position.x,
          y: Math.min(
            this.recentRangePositions.leftFingerPosition.y,
            this.recentRangePositions.rightFingerPosition.y
          ),
        };

        dimensions = {
          width: this.dimensions.width,
          height: 50,
        };
      }

      const playbackControllerState: LinearPlaybackGestureListenerConstructorArgs =
        {
          position,
          dimensions,
          gestureSubject: this.gestureSubject,
          canvasDimensions: this.canvasDimensions ?? { width: 0, height: 0 },
          emitRange: {
            start: this.recentRangePositions.leftFingerPosition,
            end: this.recentRangePositions.rightFingerPosition,
          },
          ...(playbackSubject
            ? {
                subjects: {
                  [LinearPlaybackGestureListener.playbackSubjectKey]:
                    playbackSubject,
                },
              }
            : {}),
          resetKeys: this.resetKeys,
        };

      if (this.playbackController) {
        this.playbackController.updateState(playbackControllerState);
      } else {
        this.playbackController = new LinearPlaybackGestureListener(
          playbackControllerState
        );
      }
    }
  }

  private resetRangeGestureState() {
    this.resetTimer();
    this.currentShape = undefined;
    this.initialRangePositions = undefined;
    this.recentRangePositions = undefined;
  }

  // private resetPlaybackController() {
  //   this.playbackController?.resetHandler();
  // }

  private resetShapeGestureState() {
    this.resetTimer();
    this.currentShape = undefined;
    this.initialShapePositions = undefined;
    this.recentShapePositions = undefined;
  }

  private resetEmphasisController() {
    this.emphasisController?.updateState({
      dimensions: {
        width: 0,
        height: 0,
      },
    });
    this.emphasisController?.resetHandler();
  }

  private resetPlaybackController() {
    this.playbackController?.updateState({
      dimensions: {
        width: 0,
        height: 0,
      },
    });
    this.playbackController?.resetHandler();
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
      leftThumbRightIndexDist.euclideanDistance < this.dimensions.height &&
      rightThumbLeftIndexDist.euclideanDistance < this.dimensions.height
    ) {
      return true;
    }

    return false;
  }

  private getRangeDataFromState() {
    if (this.recentRangePositions) {
      const startCoordinates = {
        x: this.recentRangePositions.leftFingerPosition.x,
        y: this.recentRangePositions.leftFingerPosition.y,
      };

      const endCoordinates = {
        x: this.recentRangePositions.rightFingerPosition.x,
        y: this.recentRangePositions.rightFingerPosition.y,
      };

      return {
        startCoordinates,
        endCoordinates,
      };
    }

    return undefined;
  }

  private getRectDataFromState() {
    if (this.recentShapePositions) {
      const rectDimensions = {
        width: Math.abs(
          this.recentShapePositions.leftThumb.x -
            this.recentShapePositions.rightThumb.x
        ),
        height: Math.abs(
          this.recentShapePositions.leftIndex.y -
            this.recentShapePositions.rightIndex.y
        ),
      };
      const rectCoordinates = {
        x: this.recentShapePositions.leftThumb.x,
        y: this.recentShapePositions.leftIndex.y,
      };

      return {
        coordinates: rectCoordinates,
        dimensions: rectDimensions,
      };
    }
    return undefined;
  }

  private getCircleDataFromState() {
    if (this.recentShapePositions) {
      const circleRadius =
        (this.recentShapePositions.rightThumb.y -
          this.recentShapePositions.rightIndex.y) /
        2;
      const circlePosition = {
        x: this.recentShapePositions.rightIndex.x,
        y: this.recentShapePositions.rightIndex.y + circleRadius,
      };

      return {
        coordinates: circlePosition,
        radius: circleRadius,
      };
    }

    return undefined;
  }

  private renderVisualIndicators() {
    if (!this.showVisualIndicators) return;


    const shape = this.currentShape;
    const fillStyle = "black";
    const opacity = 0.2;

    this.clearCanvas();

    if (shape === ForeshadowingShapes.RECTANGLE && this.recentShapePositions) {
      const rectData = this.getRectDataFromState();

      if (!rectData) return;

      const { coordinates, dimensions } = rectData;
      this.drawingUtils?.modifyContextStyleAndDraw(
        {
          fillStyle,
          opacity,
        },
        () => {
          this.drawingUtils?.drawRect({
            coordinates,
            dimensions,
            fill: true,
          });
        }
      );

      const foreshadowingArea = {
        position: coordinates,
        dimensions: dimensions,
      };
      this.publishToSubjectIfExists(
        ForeshadowingGestureListener.foreshadowingAreaSubjectKey,
        {
          type: ForeshadowingAreaSubjectType.RECTANGLE,
          area: foreshadowingArea,
        }
      );
    }
    if (shape === ForeshadowingShapes.CIRCLE && this.recentShapePositions) {
      const circleData = this.getCircleDataFromState();

      if (!circleData) return;

      const { radius, coordinates } = circleData;
      this.drawingUtils?.modifyContextStyleAndDraw(
        {
          fillStyle,
          opacity,
        },
        () => {
          this.drawingUtils?.drawCircle({
            radius,
            coordinates,
            fill: true,
          });
        }
      );
      const foreshadowingArea = {
        position: coordinates,
        radius,
      };
      this.publishToSubjectIfExists(
        ForeshadowingGestureListener.foreshadowingAreaSubjectKey,
        {
          type: ForeshadowingAreaSubjectType.CIRCLE,
          area: foreshadowingArea,
        }
      );
    }

    if (shape === ForeshadowingShapes.RANGE && this.recentRangePositions) {
      const lineWidth = 15;
      const rangeData = this.getRangeDataFromState();

      if (!rangeData) return;

      const { startCoordinates, endCoordinates } = rangeData;

      this.drawingUtils?.modifyContextStyleAndDraw(
        {
          lineWidth,
          strokeStyle: "red",
          opacity,
        },
        () => {
          this.drawingUtils?.drawLine({
            coordinates: [startCoordinates, endCoordinates],
            shape: LineShape.SHARP,
          });
        }
      );

      const foreshadowingArea = {
        position: {
          x: startCoordinates.x,
          y: 0,
        },
        dimensions: {
          width: Math.abs(startCoordinates.x - endCoordinates.x),
          height: this.canvasDimensions.height,
        },
      };

      this.publishToSubjectIfExists(
        ForeshadowingGestureListener.foreshadowingAreaSubjectKey,
        {
          type: ForeshadowingAreaSubjectType.RANGE,
          area: foreshadowingArea,
        }
      );
    }
  }

  private handleRangeGesture(fingerData: ListenerProcessedFingerData) {
    const leftHandData = fingerData[HANDS.LEFT];
    const rightHandData = fingerData[HANDS.RIGHT];

    if (!leftHandData || !rightHandData) {
      return;
    }

    const [leftFingerToTrack] = leftHandData.fingersToTrack;
    const leftFingerPosition = leftHandData.fingerPositions[
      leftFingerToTrack
    ] as Coordinate2D;

    const [rightFingerToTrack] = rightHandData.fingersToTrack;
    const rightFingerPosition = rightHandData.fingerPositions[
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
        this.recentRangePositions = newRangePosition;
        this.initialRangePositions = newRangePosition;
        this.currentShape = ForeshadowingShapes.RANGE;
        this.timer = startTimeoutInstance({
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
                      this.showVisualIndicators = true;
                      this.placeListenerInPosition(this.currentShape);
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

  private handleShapeGesture(fingerData: ListenerProcessedFingerData) {
    // this.renderReferencePoints();
    const leftHandData = fingerData[HANDS.LEFT];
    const rightHandData = fingerData[HANDS.RIGHT];

    if (!leftHandData || !rightHandData) {
      return;
    }

    const [leftIndexLandmarkId, leftThumbLandmarkId] =
      leftHandData.fingersToTrack;
    const leftIndex = leftHandData.fingerPositions[
      leftIndexLandmarkId
    ] as Coordinate2D;
    const leftThumb = leftHandData.fingerPositions[
      leftThumbLandmarkId
    ] as Coordinate2D;

    const [rightIndexLandmarkId, rightThumbLandmarkId] =
      rightHandData.fingersToTrack;
    const rightIndex = rightHandData.fingerPositions[
      rightIndexLandmarkId
    ] as Coordinate2D;
    const rightThumb = rightHandData.fingerPositions[
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

    let isRectangle = false;
    let isCircleShape = false;

    if (canEmit) {
      isCircleShape =
        this.isCircleShape(newShapePosition) &&
        this.mode === ForeshadowingShapes.CIRCLE;
      isRectangle =
        this.isRectShape(newShapePosition) &&
        this.mode === ForeshadowingShapes.RECTANGLE;
    }

    if (isRectangle || isCircleShape) {
      if (!this.timer) {
        this.recentShapePositions = newShapePosition;
        this.initialShapePositions = newShapePosition;
        this.currentShape = isCircleShape
          ? ForeshadowingShapes.CIRCLE
          : isRectangle
          ? ForeshadowingShapes.RECTANGLE
          : undefined;

        this.timer = startTimeoutInstance({
          onCompletion: () => {
            if (this.initialShapePositions && this.recentShapePositions) {
              const diffs = distanceBetweenPoints(
                Object.values(this.initialShapePositions),
                Object.values(this.recentShapePositions)
              ).map((diff) => diff.euclideanDistance);

              if (!containsValueLargerThanMax(diffs, 30)) {
                if (this.currentShape) {
                  this.showVisualIndicators = true;
                  this.placeListenerInPosition(this.currentShape);
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

  private clearAllVisualIndicators() {
    this.showVisualIndicators = false;
    this.publishToSubjectIfExists(
      ForeshadowingGestureListener.foreshadowingAreaSubjectKey,
      undefined
    );
  }

  draw() {
    if (!this.context) return;
    this.clearCanvas();
    this.renderBorder();
    this.renderVisualIndicators();
    this.canvasListener?.draw();
  }

  resetHandler(): void {
    this.resetRangeGestureState();
    this.resetShapeGestureState();
    this.resetPlaybackController();
    this.resetEmphasisController();
    this.clearAllVisualIndicators();
  }

  updateState({
    position,
    dimensions,
    handsToTrack,
    canvasDimensions,
    mode,
  }: Partial<ForeshadowingGestureListenerConstructorArgs>) {
    if (position) {
      this.position = position;
    }
    if (dimensions) {
      this.dimensions = dimensions;
    }
    if (canvasDimensions) {
      this.canvasDimensions = canvasDimensions;
    }
    if (handsToTrack) {
      this.handsToTrack = handsToTrack;
    }

    if (mode) {
      this.mode = mode;
    }
  }

  protected handleNewData(fingerData: ListenerProcessedFingerData): void {
    /**
     * NOTE: Don't use this.handsToTrack for emphasis as each hands needs to perform
     * the exact gesture we want so dominant and non dominant hand concept doesn't apply here
     */
    const rightHand = fingerData[HANDS.RIGHT];
    const leftHand = fingerData[HANDS.LEFT];

    if (!rightHand || !leftHand) {
      return;
    }

    const { match, type } = this.verifyGesturesMatch({
      left: leftHand.detectedGesture,
      right: rightHand.detectedGesture,
    });

    if (match) {
      if (
        type === ForeshadowingType.RANGE &&
        this.mode === ForeshadowingShapes.RANGE
      ) {
        this.handleRangeGesture(fingerData);
      } else if (
        type === ForeshadowingType.SHAPE &&
        (this.mode === ForeshadowingShapes.CIRCLE ||
          this.mode === ForeshadowingShapes.RECTANGLE)
      ) {
        this.handleShapeGesture(fingerData);
      }
    }
  }
}
