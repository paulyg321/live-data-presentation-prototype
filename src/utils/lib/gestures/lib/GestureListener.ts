import {
  clearArea,
  drawRect,
  HANDS,
  HAND_LANDMARK_IDS,
  startTimeoutInstance,
  startTimerInstance,
  SupportedGestures,
  type FingerPositionsData,
  type GestureTrackerValues,
  type TimerInstanceArgs,
  type TimeoutInstanceArgs,
} from "@/utils";
import type { Timer } from "d3";
import type { Subject, Subscription } from "rxjs";
import type { Coordinate2D, Dimensions } from "../../chart";

export interface GestureListenerConstructorArgs {
  position: Coordinate2D;
  dimensions: Dimensions;
  canvasDimensions: Dimensions;
  gestureSubject: Subject<any>;
  handsToTrack?: [HANDS] | [HANDS, HANDS];
  gestureTypes?: {
    rightHand: SupportedGestures;
    leftHand: SupportedGestures;
  }[];
}

export type GestureListenerSubjectMap = { [key: string]: Subject<any> };

export interface ProcessedGestureListenerFingerData {
  detectedGesture: SupportedGestures;
  fingersToTrack: number[];
  fingerPositions: FingerPositionsData;
}

export abstract class GestureListener {
  position: Coordinate2D;
  dimensions: Dimensions;
  subjects: GestureListenerSubjectMap | undefined;
  timer: Timer | undefined;
  context: CanvasRenderingContext2D | undefined;
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions | undefined;
  handsToTrack: undefined | [HANDS] | [HANDS, HANDS];
  gestureTypes:
    | {
        rightHand: SupportedGestures;
        leftHand: SupportedGestures;
      }[] = [];
  gestureSubject: Subject<any>;
  private gestureSubscription: Subscription | undefined;

  constructor({
    position,
    dimensions,
    handsToTrack,
    gestureTypes,
    gestureSubject,
    canvasDimensions,
  }: GestureListenerConstructorArgs) {
    this.position = position;
    this.dimensions = dimensions;
    this.handsToTrack = handsToTrack;
    this.gestureTypes = gestureTypes ?? [];
    // Set up listener for gesture subject
    this.gestureSubject = gestureSubject;
    this.gestureSubscription = this.gestureSubject.subscribe({
      next: (data: any) => this.handler(data),
    });
    this.canvasDimensions = canvasDimensions;
  }

  protected abstract handleNewData(fingerData: {
    left?: ProcessedGestureListenerFingerData;
    right?: ProcessedGestureListenerFingerData;
  }): void;

  abstract renderReferencePoints(): void;

  static convertGestureAndLandmarksToPositions({
    landmarkData,
    gestureData,
    gestureType,
  }: {
    landmarkData: any;
    gestureData: any;
    gestureType: SupportedGestures;
  }): ProcessedGestureListenerFingerData | undefined {
    let fingersToTrack = [HAND_LANDMARK_IDS.index_finger_tip];

    if (gestureType === SupportedGestures.POINTING) {
      fingersToTrack = [HAND_LANDMARK_IDS.index_finger_tip];
    } else if (gestureType === SupportedGestures.OPEN_HAND) {
      fingersToTrack = [HAND_LANDMARK_IDS.middle_finger_tip];
    } else if (
      gestureType === SupportedGestures.FORESHADOWING_LEFT_L ||
      gestureType === SupportedGestures.FORESHADOWING_RIGHT_L ||
      gestureType === SupportedGestures.FORESHADOWING_RIGHT_C ||
      gestureType === SupportedGestures.FORESHADOWING_LEFT_C
    ) {
      fingersToTrack = [
        HAND_LANDMARK_IDS.index_finger_tip,
        HAND_LANDMARK_IDS.thumb_tip,
      ];
    }

    if (landmarkData && gestureData) {
      const matchesSpecifiedGesture = gestureData.gestures.some(
        (gesture: any) => gesture.name === gestureType
      );
      if (gestureData.gestures.length > 0 && matchesSpecifiedGesture) {
        const fingerPositions = fingersToTrack.reduce(
          (currentPositionMap, nextFinger) => {
            return {
              ...currentPositionMap,
              [nextFinger]: {
                x: landmarkData[nextFinger].x ?? undefined,
                y: landmarkData[nextFinger].y ?? undefined,
              },
            };
          },
          {} as FingerPositionsData
        );
        return {
          detectedGesture: gestureType,
          fingersToTrack,
          fingerPositions,
        };
      }
    }

    return undefined;
  }

  protected resetTimer() {
    if (this.timer) {
      this.timer.stop();
      this.timer = undefined;
    }
  }

  protected startTimerInstance({
    onCompletion,
    onTick,
    timeout,
  }: TimerInstanceArgs) {
    this.resetTimer();
    return startTimerInstance({ onCompletion, onTick, timeout });
  }

  protected startTimeoutInstance({
    onCompletion,
    timeout,
  }: TimeoutInstanceArgs) {
    this.resetTimer();
    return startTimeoutInstance({ onCompletion, timeout });
  }

  protected renderBorder() {
    if (this.context) {
      drawRect({
        context: this.context,
        coordinates: this.position,
        dimensions: this.dimensions,
        stroke: true,
        strokeStyle: "skyblue",
      });
    }
  }

  protected clearCanvas() {
    if (this.context) {
      clearArea({
        context: this.context,
        coordinates: { x: 0, y: 0 },
        dimensions: this.canvasDimensions,
      });
    }
  }

  protected clearListenerArea() {
    if (this.context) {
      clearArea({
        context: this.context,
        coordinates: this.position,
        dimensions: this.dimensions,
      });
    }
  }

  // Add method to linearListener called "canEmit" that checks if limit field variable is set
  // if its set then we compare positions to the limit to see if we're good to emit.
  unsubscribe() {
    this.gestureSubscription?.unsubscribe();
  }

  getSubject(key: string) {
    if (this.subjects) {
      const includesKey = Object.keys(this.subjects).includes(key);

      if (!includesKey) {
        throw new Error(
          `getGestureSubject - unable to find subject with key ${key}`
        );
      }

      return this.subjects[key];
    }
  }

  updateState({
    position,
    dimensions,
    handsToTrack,
  }: Partial<GestureListenerConstructorArgs>) {
    if (position) {
      this.position = position;
    }
    if (dimensions) {
      this.dimensions = dimensions;
    }
    if (handsToTrack) {
      this.handsToTrack = handsToTrack;
    }
  }

  setContext(ctx: CanvasRenderingContext2D) {
    this.context = ctx;
  }

  setCanvasDimensions(dimensions: Dimensions) {
    this.canvasDimensions = dimensions;
  }

  setHandsToTrack(hands: [HANDS, HANDS]) {
    this.handsToTrack = hands;
  }

  isWithinObjectBounds(position: Coordinate2D) {
    const { x: minX, y: minY } = this.position;
    const { maxX, maxY } = {
      maxX: this.position.x + this.dimensions.width,
      maxY: this.position.y + this.dimensions.height,
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

  // Whenever new gesture data comes we track the hand and gestures configured in the class
  handler(gestureData: GestureTrackerValues) {
    if (!this.handsToTrack) return;

    const {
      rightHandLandmarks,
      rightHandGestures,
      leftHandLandmarks,
      leftHandGestures,
    } = gestureData;

    let rightHandData: ProcessedGestureListenerFingerData | undefined;
    let leftHandData: ProcessedGestureListenerFingerData | undefined;

    this.gestureTypes.forEach(
      (gestureType: {
        rightHand: SupportedGestures;
        leftHand: SupportedGestures;
      }) => {
        if (this.handsToTrack?.includes(HANDS.RIGHT)) {
          rightHandData = GestureListener.convertGestureAndLandmarksToPositions(
            {
              landmarkData: rightHandLandmarks,
              gestureData: rightHandGestures,
              gestureType: gestureType.rightHand,
            }
          );
        }

        if (this.handsToTrack?.includes(HANDS.LEFT)) {
          leftHandData = GestureListener.convertGestureAndLandmarksToPositions({
            landmarkData: leftHandLandmarks,
            gestureData: leftHandGestures,
            gestureType: gestureType.leftHand,
          });
        }

        if (rightHandData || leftHandData) {
          this.handleNewData({
            right: rightHandData,
            left: leftHandData,
          });
        }
      }
    );
  }
}
