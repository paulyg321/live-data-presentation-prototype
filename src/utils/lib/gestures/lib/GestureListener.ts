import {
  HANDS,
  HAND_LANDMARK_IDS,
  startTimerInstance,
  SupportedGestures,
  type FingerPositionsData,
  type GestureTrackerValues,
  type TimerInstanceArgs,
} from "@/utils";
import type { Timer } from "d3";
import type { Subject } from "rxjs";
import type { Coordinate2D, Dimensions } from "../../chart";

export interface GestureListenerConstructorArgs {
  position: Coordinate2D;
  size: Dimensions;
  handsToTrack?: [HANDS] | [HANDS, HANDS];
}

export type GestureListenerSubjectMap = { [key: string]: Subject<any> };

export interface ProcessedGestureListenerFingerData {
  detectedGesture: SupportedGestures;
  fingersToTrack: number[];
  fingerPositions: FingerPositionsData;
}

export abstract class GestureListener {
  position: Coordinate2D;
  size: Dimensions;
  subjects: GestureListenerSubjectMap | undefined;
  timer: Timer | undefined;
  context: CanvasRenderingContext2D | undefined;
  handsToTrack: undefined | [HANDS] | [HANDS, HANDS];
  gestureTypes:
    | {
        rightHand: SupportedGestures;
        leftHand: SupportedGestures;
      }[] = [];

  constructor({
    position,
    size,
    handsToTrack,
  }: GestureListenerConstructorArgs) {
    this.position = position;
    this.size = size;
    this.handsToTrack = handsToTrack;
  }

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

  isWithinObjectBounds(position: Coordinate2D) {
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

  setContext(ctx: CanvasRenderingContext2D) {
    this.context = ctx;
  }

  setHandsToTrack(hands: [HANDS, HANDS]) {
    this.handsToTrack = hands;
  }

  resetTimer() {
    if (this.timer) {
      this.timer.stop();
      this.timer = undefined;
    }
  }

  startTimerInstance({ execute, timeout }: TimerInstanceArgs) {
    this.resetTimer();
    return startTimerInstance({ execute, timeout });
  }

  // Whenever new gesture data comes we track the hand and gestures configured in the class
  handler(gestureData: GestureTrackerValues) {
    if (this.handsToTrack) return;

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

  abstract handleNewData(fingerData: {
    left?: ProcessedGestureListenerFingerData;
    right?: ProcessedGestureListenerFingerData;
  }): void;
}
