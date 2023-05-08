import {
  CanvasElementListener,
  DrawingUtils,
  gestureSubject,
  HANDS,
  HAND_LANDMARK_IDS,
  SupportedGestures,
  type GestureTrackerValues,
  calculateDistance,
  DollarRecognizer,
  emphasisSubject,
  highlightSubject,
  foreshadowingAreaSubject,
  playbackSubject,
  snackbarSubject,
  startTimerInstance,
  getCircleFit,
  startTimeoutInstance,
  selectionSubject,
  ForeshadowingStatesMode,
} from "@/utils";
import type { Timer } from "d3";
import type { Subject, Subscription } from "rxjs";
import type { Coordinate2D, Dimensions } from "../../chart";

export const DEFAULT_TRIGGER_DURATION = 5000; // 5 SECONDS
export const DEFAULT_POSE_DURATION = 1000; // 1 second
export const DEFAULT_RESET_PAUSE_DURATION = 2000; // 2 seconds

export enum ListenerType {
  TEMPORAL = "temporal",
  RADIAL = "radial",
  FORESHADOWING = "foreshadowing",
  SELECTION = "selection",
  RECT_POSE = "rect-pose",
  RANGE_POSE = "range-pose",
  POINT_POSE = "point-pose",
  OPEN_HAND_POSE = "open-hand-pose",
  STROKE_LISTENER = "stroke-listener",
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
  drawingUtils: DrawingUtils;
  mode?: any;
  listenerMode?: ListenerMode;
  trackedFingers?: number[];
  animationState?: Record<string, any>;
  strokeTriggerName?: string;
  poseDuration?: number;
  resetPauseDuration?: number;
  addGesture?: boolean;
  gestureName?: string;
  triggerDuration?: number;
  selectionKeys?: string[];
  numHands?: number;
  foreshadowingStatesMode?: ForeshadowingStatesMode;
  foreshadowingStatesCount?: number;
}

export type GestureListenerSubjectMap = { [key: string]: Subject<any> };

export interface ProcessedGestureListenerFingerData {
  detectedGesture: SupportedGestures;
  fingerPositions: Coordinate2D[];
}

export type PosePosition = Record<HANDS, Record<number, Coordinate2D>>;

export enum ListenerMode {
  POSE = "pose",
  STROKE = "stroke",
}

export abstract class GestureListener {
  static snackbarSubjectKey = "snackbarSubject";
  static playbackSubjectKey = "playbackSubject";
  static emphasisSubjectKey = "emphasisSubject";
  static foreshadowingAreaSubjectKey = "foreshadowingAreaSubject";
  static highlighSubjectKey = "highlightSubject";
  static selectionSubjectKey = "selectionSubject";
  static circleFitter = getCircleFit();

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

  stroke: Coordinate2D[] = [];
  strokeRecognizer = new DollarRecognizer();
  addGesture: boolean;
  gestureName?: string;
  strokeTriggerName?: string;

  detectionTimer: Timer | undefined;
  startDetecting = false;

  listenerMode?: ListenerMode;
  posePosition?: PosePosition;
  posePositionToMatch?: PosePosition;
  trackedFingers: number[];
  mode: any;

  poseDuration?: number;
  resetPauseDuration?: number;
  triggerDuration?: number;

  animationState: Record<string, any>;

  selectionKeys: string[] = [];
  numHands?: number;
  foreshadowingStatesMode?: ForeshadowingStatesMode;
  foreshadowingStatesCount?: number;

  private gestureSubscription: Subscription | undefined;

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
    // ACCEPTED VALUES - https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
    resetKeys,
    drawingUtils,
    trackedFingers = [
      HAND_LANDMARK_IDS.index_finger_tip,
      HAND_LANDMARK_IDS.thumb_tip,
    ],
    listenerMode,
    mode,
    animationState = {},
    poseDuration,
    resetPauseDuration,
    triggerDuration,
    numHands,
    strokeTriggerName,
    selectionKeys,
    foreshadowingStatesMode,
    foreshadowingStatesCount,
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
    this.subjects = {
      [GestureListener.highlighSubjectKey]: highlightSubject,
      [GestureListener.emphasisSubjectKey]: emphasisSubject,
      [GestureListener.playbackSubjectKey]: playbackSubject,
      [GestureListener.foreshadowingAreaSubjectKey]: foreshadowingAreaSubject,
      [GestureListener.snackbarSubjectKey]: snackbarSubject,
      [GestureListener.selectionSubjectKey]: selectionSubject,
    };
    if (resetKeys && resetKeys.size > 0) {
      this.resetKeys = resetKeys;
      this.setResetHandler();
    }
    this.drawingUtils = drawingUtils;
    this.addGesture = false;
    this.strokeRecognizer = new DollarRecognizer();
    this.trackedFingers = trackedFingers;
    this.listenerMode = listenerMode;
    this.mode = mode;
    this.animationState = animationState;
    this.poseDuration = poseDuration;
    this.resetPauseDuration = resetPauseDuration;
    this.triggerDuration = triggerDuration;
    this.numHands = numHands;
    this.strokeTriggerName = strokeTriggerName;
    this.selectionKeys = selectionKeys ?? [];
    this.foreshadowingStatesMode = foreshadowingStatesMode;
    this.foreshadowingStatesCount = foreshadowingStatesCount;
  }

  updateState({
    position,
    dimensions,
    handsToTrack,
    canvasDimensions,
    addGesture,
    gestureName,
    mode,
    listenerMode,
    resetKeys,
    trackedFingers,
    strokeTriggerName,
    poseDuration,
    resetPauseDuration,
    triggerDuration,
    selectionKeys,
    numHands,
    foreshadowingStatesMode,
    foreshadowingStatesCount
  }: Partial<GestureListenerConstructorArgs>) {
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
    if (gestureName) {
      this.gestureName = gestureName;
    }
    if (listenerMode) {
      this.listenerMode = listenerMode;
    }
    if (mode) {
      this.mode = mode;
    }
    if (resetKeys) {
      this.resetKeys = resetKeys;
    }
    if (trackedFingers) {
      this.trackedFingers = trackedFingers;
    }
    if (strokeTriggerName) {
      this.strokeTriggerName = strokeTriggerName;
    }
    if (resetPauseDuration) {
      this.resetPauseDuration = resetPauseDuration;
    }
    if (poseDuration) {
      this.poseDuration = poseDuration;
    }
    if (triggerDuration) {
      this.triggerDuration = triggerDuration;
    }
    if (selectionKeys) {
      this.selectionKeys = selectionKeys;
    }
    if (numHands) {
      this.numHands = numHands;
    }
    if (foreshadowingStatesMode) {
      this.foreshadowingStatesMode = foreshadowingStatesMode;
    }
    if (foreshadowingStatesCount) {
      this.foreshadowingStatesCount = foreshadowingStatesCount;
    }
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

  private validateGesture({
    landmarkData,
    gestureData,
    gestureType,
  }: {
    landmarkData: any;
    gestureData: any;
    gestureType: SupportedGestures;
  }): ProcessedGestureListenerFingerData | undefined {
    const matchesSpecifiedGesture = gestureData.gestures.some(
      (gesture: any) => gesture.name === gestureType
    );

    if (matchesSpecifiedGesture) {
      const fingerPositions = landmarkData.map((finger: any) => {
        return {
          x: finger.x ?? undefined,
          y: finger.y ?? undefined,
        };
      });
      return {
        detectedGesture: gestureType,
        fingerPositions,
      };
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

  resetTimer(time?: number) {
    if (time) {
      startTimeoutInstance({
        onCompletion: () => {
          this.timer = undefined;
        },
        timeout: time,
      });
    } else {
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
          context,
        });
      },
      ["presenter", "preview"]
    );
  }

  renderStrokePath() {
    if (!this.startDetecting) return;
    this.stroke.forEach((stroke) => {
      this.drawingUtils.modifyContextStyleAndDraw(
        {
          fillStyle: "skyBlue",
          opacity: 0.8,
        },
        (context) => {
          this.drawingUtils.drawCircle({
            coordinates: stroke,
            radius: 3,
            context,
            fill: true,
          });
        }
      );
    });
  }

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

  triggerDetection(onComplete: () => void) {
    if (this.detectionTimer) return;
    this.startDetecting = true;
    this.detectionTimer = startTimerInstance({
      onTick: (elapsed?: number) => {
        if (!elapsed) return;
        this.animationState.detectionExtent = elapsed;
      },
      onCompletion: () => {
        this.startDetecting = false;
        this.detectionTimer = undefined;
        this.animationState.detectionExtent = 0;
        onComplete();
      },
      timeout: this.triggerDuration ?? DEFAULT_TRIGGER_DURATION,
    });
  }

  renderDetectionState() {
    if (!this.startDetecting) return;

    this.drawingUtils.modifyContextStyleAndDraw(
      {
        strokeStyle: "#90EE90",
        opacity: 0.7,
      },
      (context) => {
        this.drawingUtils.drawRect({
          coordinates: this.position,
          dimensions: this.dimensions,
          stroke: true,
          context,
        });
      },
      ["presenter", "preview"]
    );

    this.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: "#90EE90",
        opacity: 0.3,
      },
      (context) => {
        this.drawingUtils.drawRect({
          coordinates: this.position,
          dimensions: {
            ...this.dimensions,
            width: this.dimensions.width * this.animationState.detectionExtent,
          },
          fill: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
  }

  protected thumbsTouch(fingerData: ListenerProcessedFingerData) {
    const handOne = fingerData[this.handsToTrack.dominant];
    const handTwo = fingerData[this.handsToTrack.nonDominant];

    if (!handOne || !handTwo) return false;

    const thumbOnePosition = handOne.fingerPositions[
      HAND_LANDMARK_IDS.thumb_tip
    ] as Coordinate2D;
    const thumbTwoPosition = handTwo.fingerPositions[
      HAND_LANDMARK_IDS.thumb_tip
    ] as Coordinate2D;

    const { euclideanDistance } = calculateDistance(
      thumbOnePosition,
      thumbTwoPosition
    );

    return euclideanDistance < 30;
  }

  protected isPinchGesture(fingerData: ListenerProcessedFingerData) {
    const hand = fingerData[this.handsToTrack.dominant];

    if (!hand) return false;

    const indexFingerPosition = hand.fingerPositions[
      HAND_LANDMARK_IDS.index_finger_tip
    ] as Coordinate2D;
    const thumbPosition = hand.fingerPositions[
      HAND_LANDMARK_IDS.thumb_tip
    ] as Coordinate2D;

    const { euclideanDistance } = calculateDistance(
      indexFingerPosition,
      thumbPosition
    );

    return euclideanDistance < 30;
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
        if (rightHandGestures && rightHandLandmarks) {
          rightHandData = this.validateGesture({
            landmarkData: rightHandLandmarks,
            gestureData: rightHandGestures,
            gestureType: gestureType.rightHand,
          });
        }

        if (leftHandGestures && leftHandLandmarks) {
          leftHandData = this.validateGesture({
            landmarkData: leftHandLandmarks,
            gestureData: leftHandGestures,
            gestureType: gestureType.leftHand,
          });
        }

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
