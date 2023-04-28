import {
  CanvasElementListener,
  DrawingUtils,
  gestureSubject,
  HANDS,
  HAND_LANDMARK_IDS,
  SupportedGestures,
  type FingerPositionsData,
  type GestureTrackerValues,
} from "@/utils";
import type { Timer } from "d3";
import type { Subject, Subscription } from "rxjs";
import type { Coordinate2D, Dimensions } from "../../chart";

export enum ListenerType {
  TEMPORAL = "temporal",
  RADIAL = "radial",
  FORESHADOWING = "foreshadowing",
}

export type ListenerProcessedFingerData = Record<
  HANDS,
  ProcessedGestureListenerFingerData | undefined
>;

export interface GestureListenerConstructorArgs {
  position: Coordinate2D;
  dimensions: Dimensions;
  canvasDimensions: Dimensions;
  // Ordered from most dominant to least dominant
  handsToTrack?: {
    dominant: HANDS;
    nonDominant: HANDS;
  };
  gestureTypes?: {
    rightHand: SupportedGestures;
    leftHand: SupportedGestures;
  }[];
  resetKeys?: Set<string>;
  subjects?: GestureListenerSubjectMap;
  drawingUtils: DrawingUtils;
}

export type GestureListenerSubjectMap = { [key: string]: Subject<any> };

export interface ProcessedGestureListenerFingerData {
  detectedGesture: SupportedGestures;
  fingersToTrack: number[];
  fingerPositions: FingerPositionsData;
}

export abstract class GestureListener {
  canvasListener?: CanvasElementListener;
  position: Coordinate2D;
  dimensions: Dimensions;
  subjects: GestureListenerSubjectMap | undefined;
  timer: Timer | undefined;
  canvasDimensions: Dimensions;
  // Ordered from most dominant to least dominant
  gestureSubject: Subject<any>;
  resetKeys: Set<string> | undefined;

  handsToTrack: {
    dominant: HANDS;
    nonDominant: HANDS;
  };
  gestureTypes:
    | {
        rightHand: SupportedGestures;
        leftHand: SupportedGestures;
      }[];

  private gestureSubscription: Subscription | undefined;
  protected addGesture: boolean;

  protected drawingUtils: DrawingUtils;

  constructor({
    position,
    dimensions,
    handsToTrack = {
      dominant: HANDS.RIGHT,
      nonDominant: HANDS.LEFT,
    },
    gestureTypes = [],
    canvasDimensions,
    subjects,
    // ACCEPTED VALUES - https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
    resetKeys,
    drawingUtils,
  }: GestureListenerConstructorArgs) {
    this.position = position;
    this.dimensions = dimensions;
    this.canvasListener = new CanvasElementListener({
      position: this.position,
      dimensions: this.dimensions,
      isCircle: false,
      updateFn: (value) => {
        this.updateState(value);
      },
      drawingUtils,
    });
    this.handsToTrack = handsToTrack;
    this.gestureTypes = gestureTypes;
    // Set up listener for gesture subject
    this.gestureSubject = gestureSubject;
    this.gestureSubscription = this.gestureSubject.subscribe({
      next: (data: any) => this.handler(data),
    });
    this.canvasDimensions = canvasDimensions;
    this.subjects = subjects;
    if (resetKeys && resetKeys.size > 0) {
      this.resetKeys = resetKeys;
      this.setResetHandler();
    }
    this.drawingUtils = drawingUtils;
    this.addGesture = false;
  }

  private setResetHandler() {
    this.resetKeys?.forEach((resetKey: string) => {
      document.addEventListener("keypress", (event) => {
        if (event.code == resetKey) {
          this.resetHandler();
        }
      });
    });
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
      /**
       * TODO: make fingerstotrack a field variable for the class and make this method non-static
       * - this allows the gesture listener to decide itself on the fingers it wants to track
       * we also won't need to pass fingersToTrack with the object
       *  */
      fingersToTrack = [
        HAND_LANDMARK_IDS.index_finger_tip,
        HAND_LANDMARK_IDS.thumb_tip,
      ];
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

  abstract resetHandler(): void;
  abstract draw(): void;

  protected abstract handleNewData(
    fingerData: ListenerProcessedFingerData,
    handCount: number
  ): void;

  protected publishToSubjectIfExists(subjectKey: string, value: any) {
    if (this.subjects && this.subjects[subjectKey]) {
      this.subjects[subjectKey].next(value);
    }
  }

  protected getSubjectByKey(subjectKey: string) {
    if (this.subjects && this.subjects[subjectKey]) {
      return this.subjects[subjectKey];
    }
    return undefined;
  }

  protected resetTimer() {
    if (this.timer) {
      this.timer.stop();
      this.timer = undefined;
    }
  }

  protected renderBorder() {
    this.drawingUtils?.modifyContextStyleAndDraw(
      {
        strokeStyle: "skyblue",
      },
      (context) => {
        this.drawingUtils?.drawRect({
          coordinates: this.position,
          dimensions: this.dimensions,
          stroke: true,
          context
        });
      },
      ["presenter", "preview"]
    );
  }

  // protected clearCanvas() {
  //   this.drawingUtils?.clearArea({
  //     coordinates: { x: 0, y: 0 },
  //     dimensions: this.canvasDimensions,
  //   });
  // }

  // protected clearListenerArea() {
  //   this.drawingUtils?.clearArea({
  //     coordinates: this.position,
  //     dimensions: this.dimensions,
  //   });
  // }

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
    canvasDimensions,
    addGesture,
  }: Partial<GestureListenerConstructorArgs> | any) {
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
    if (addGesture !== undefined) {
      this.addGesture = addGesture;
    }
  }

  setCanvasDimensions(dimensions: Dimensions) {
    this.canvasDimensions = dimensions;
  }

  setHandsToTrack(hands: { dominant: HANDS; nonDominant: HANDS }) {
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

    const landmarks = [rightHandLandmarks, leftHandLandmarks];
    const handCount = landmarks.filter((value: unknown) => value).length;

    let rightHandData: ProcessedGestureListenerFingerData | undefined;
    let leftHandData: ProcessedGestureListenerFingerData | undefined;

    this.gestureTypes.forEach(
      (gestureType: {
        rightHand: SupportedGestures;
        leftHand: SupportedGestures;
      }) => {
        rightHandData = GestureListener.convertGestureAndLandmarksToPositions({
          landmarkData: rightHandLandmarks,
          gestureData: rightHandGestures,
          gestureType: gestureType.rightHand,
        });

        leftHandData = GestureListener.convertGestureAndLandmarksToPositions({
          landmarkData: leftHandLandmarks,
          gestureData: leftHandGestures,
          gestureType: gestureType.leftHand,
        });

        this.handleNewData(
          {
            [HANDS.RIGHT]: rightHandData,
            [HANDS.LEFT]: leftHandData,
          },
          handCount
        );
      }
    );
  }
}
