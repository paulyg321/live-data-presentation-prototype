import {
  EmphasisGestureListener,
  emphasisSubject,
  foreshadowingAreaSubject,
  ForeshadowingAreaSubjectType,
  LineShape,
  playbackSubject,
  startTimeoutInstance,
  type EmphasisGestureListenerConstructorArgs,
} from "@/utils";
import type { Subject } from "rxjs";
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
  subjects?: Record<string, Subject<any>>;
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
  private initialShapePositions: ForeshadowingShapePosition | undefined;
  private recentShapePositions: ForeshadowingShapePosition | undefined;

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
    canvasDimensions,
    resetKeys,
    mode = ForeshadowingShapes.RANGE,
    playbackControllerType,
    drawingUtils,
  }: ForeshadowingGestureListenerConstructorArgs) {
    super({
      position,
      dimensions,
      handsToTrack,
      canvasDimensions,
      resetKeys,
      drawingUtils,
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
        canvasDimensions: this.canvasDimensions,
        resetKeys: this.resetKeys,
        ...(emphasisSubject
          ? {
              subjects: {
                [EmphasisGestureListener.emphasisSubjectKey]: emphasisSubject,
              },
            }
          : {}),
        drawingUtils: this.drawingUtils,
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
          drawingUtils: this.drawingUtils,
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

  private getForeshadowingData() {
    const shape = this.currentShape;
    const isRect = shape === ForeshadowingShapes.RECTANGLE;
    const isCircle = shape === ForeshadowingShapes.CIRCLE;
    const isRange = shape === ForeshadowingShapes.RANGE;

    return {
      shape,
      isRect,
      isCircle,
      isRange,
      rectData: this.getRectDataFromState(),
      circleData: this.getCircleDataFromState(),
      rangeData: this.getRangeDataFromState(),
    };
  }

  private publishToSubject() {
    const { isRect, isCircle, isRange, rectData, circleData, rangeData } =
      this.getForeshadowingData();

    if (isRect && rectData) {
      const { coordinates, dimensions } = rectData;

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
    } else if (isCircle && circleData) {
      const { coordinates, radius } = circleData;

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
    } else if (isRange && rangeData) {
      const { startCoordinates, endCoordinates } = rangeData;

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

  private renderVisualIndicators() {
    if (!this.showVisualIndicators) return;

    const shape = this.currentShape;
    const fillStyle = "black";
    const opacity = 0.2;

    if (shape === ForeshadowingShapes.RECTANGLE && this.recentShapePositions) {
      const rectData = this.getRectDataFromState();

      if (!rectData) return;

      const { coordinates, dimensions } = rectData;
      this.drawingUtils?.modifyContextStyleAndDraw(
        {
          fillStyle,
          opacity,
        },
        (context) => {
          this.drawingUtils?.drawRect({
            coordinates,
            dimensions,
            fill: true,
            context,
          });
        },
        ["presenter", "preview"]
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
        (context) => {
          this.drawingUtils?.drawCircle({
            radius,
            coordinates,
            fill: true,
            context,
          });
        },
        ["presenter", "preview"]
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
        (context) => {
          this.drawingUtils?.drawLine({
            coordinates: [startCoordinates, endCoordinates],
            shape: LineShape.SHARP,
            context,
          });
        },
        ["presenter", "preview"]
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

    if (!canEmit) {
      this.recentRangePositions = undefined;
      this.currentShape = undefined;
    } else {
      this.recentRangePositions = newRangePosition;
      this.currentShape = ForeshadowingShapes.RANGE;

      if (this.timer) return;

      this.timer = startTimeoutInstance({
        onCompletion: () => {
          if (this.recentRangePositions) {
            const diffs = distanceBetweenPoints(
              Object.values(newRangePosition),
              Object.values(this.recentRangePositions)
            ).map((diff: any) => diff.euclideanDistance);

            if (containsValueLargerThanMax(diffs, 30)) {
              this.resetRangeGestureState();
              this.resetTimer();
            } else {
              if (this.currentShape === ForeshadowingShapes.RANGE) {
                this.showVisualIndicators = true;
                this.publishToSubject();
                // this.placeListenerInPosition(this.currentShape);
              }
              // Reset timer after 2 seconds so users have time to move hands out of frame;
              this.resetTimer(2000);
            }
          }
        },
        timeout: 1000,
      });
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

    const newPosition = {
      leftIndex,
      leftThumb,
      rightIndex,
      rightThumb,
    } as ForeshadowingShapePosition;

    const leftIndexInRange = this.isWithinObjectBounds(newPosition.leftIndex);
    const leftThumbInRange = this.isWithinObjectBounds(newPosition.leftThumb);
    const rightIndexInRange = this.isWithinObjectBounds(newPosition.rightIndex);
    const rightThumbInRange = this.isWithinObjectBounds(newPosition.rightThumb);
    const isRectangle = this.isRectShape(newPosition);
    //const isCircleShape = this.isCircleShape(newShapePosition);

    const canEmit =
      leftIndexInRange &&
      leftThumbInRange &&
      rightIndexInRange &&
      rightThumbInRange &&
      isRectangle;

    if (!canEmit) {
      this.recentShapePositions = undefined;
      this.currentShape = undefined;
    } else {
      this.recentShapePositions = newPosition;
      this.currentShape = ForeshadowingShapes.RECTANGLE;

      if (this.timer) return;

      this.timer = startTimeoutInstance({
        onCompletion: () => {
          if (this.recentShapePositions) {
            const diffs = distanceBetweenPoints(
              Object.values(newPosition),
              Object.values(this.recentShapePositions)
            ).map((diff) => diff.euclideanDistance);

            if (containsValueLargerThanMax(diffs, 30)) {
              this.resetRangeGestureState();
              this.resetTimer();
            } else {
              if (this.currentShape) {
                this.showVisualIndicators = true;
                this.publishToSubject();
                // this.placeListenerInPosition(this.currentShape);
              }
              // Reset timer after 2 seconds so users have time to move hands out of frame;
              this.resetTimer(2000);
            }
          }
        },
        timeout: 1000,
      });
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
    this.renderBorder();
    // this.renderVisualIndicators();
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

  resetTimer(time?: number) {
    if (time) {
      this.timer = startTimeoutInstance({
        onCompletion: () => {
          this.timer = undefined;
        },
        timeout: time,
      });
    } else {
      this.timer = undefined;
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
      if (type === ForeshadowingType.RANGE) {
        this.handleRangeGesture(fingerData);
      } else if (type === ForeshadowingType.SHAPE) {
        this.handleShapeGesture(fingerData);
      }
    }
  }
}
