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
  type Coordinate2D,
  type Dimensions,
  AffectOptions,
} from "@/utils";
import { StateUpdateType } from "../../chart";
import type { Timer } from "d3";
import type { Subject, Subscription } from "rxjs";

export const DEFAULT_TRIGGER_DURATION = 5000; // 5 SECONDS
export const DEFAULT_POSE_DURATION = 1000; // 1 second
export const DEFAULT_RESET_PAUSE_DURATION = 2000; // 2 seconds
export const DEFAULT_PLAYBACK_SETTINGS = {
  [AffectOptions.NEUTRAL]: {
    duration: 5,
    easeFn: "none",
    playbackMode: StateUpdateType.GROUP_TIMELINE,
    svg: undefined,
  },
  [AffectOptions.POSITIVE]: {
    duration: 5,
    easeFn: "none",
    playbackMode: StateUpdateType.GROUP_TIMELINE,
    svg: undefined,
  },
  [AffectOptions.NEGATIVE]: {
    duration: 5,
    easeFn: "none",
    playbackMode: StateUpdateType.INDIVIDUAL_TWEENS,
    svg: undefined,
  },
};

export enum ListenerType {
  RECT_POSE = "rect-pose",
  RANGE_POSE = "range-pose",
  POINT_POSE = "point-pose",
  OPEN_HAND_POSE = "open-hand-pose",
  THUMB_POSE = "thumb-pose",
  STROKE_LISTENER = "stroke-listener",
}

export interface PlaybackSettingsConfig {
  duration: number;
  easeFn: string;
  playbackMode: StateUpdateType;
  svg?: string;
}

export type PlaybackSettings = Record<AffectOptions, PlaybackSettingsConfig>;

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
  useBounds?: boolean;
  restrictToBounds?: boolean;
  playbackSettings?: PlaybackSettings;
  playbackConfig?: {
    key: AffectOptions;
    value: PlaybackSettingsConfig;
  };
  endKeyframe?: { value: string; index: number };
  strokeRecognizer?: DollarRecognizer;
  selectionLabelKey?: string;
}

export interface GestureListenerState {
  canvasListener?: CanvasElementListener;
  position: Coordinate2D;
  dimensions: Dimensions;
  canvasDimensions: Dimensions;
  drawingUtils: DrawingUtils;

  subjects?: GestureListenerSubjectMap;
  gestureSubject: Subject<any>;

  numHands?: number;
  resetKeys?: Set<string>;
  handsToTrack: {
    dominant: HANDS;
    nonDominant: HANDS;
  };
  gestureTypes:
    | {
        rightHand: SupportedGestures;
        leftHand: SupportedGestures;
      }[];

  // Stroke settings
  stroke: Coordinate2D[];
  strokeRecognizer: DollarRecognizer;
  addGesture: boolean;
  gestureName?: string;
  strokeTriggerName?: string;

  timer?: Timer;
  detectionTimer?: Timer;

  startDetecting: boolean;

  listenerMode?: ListenerMode;

  posePosition?: PosePosition;
  posePositionToMatch?: PosePosition;
  trackedFingers: number[];

  // FORESHADOW & SELECT SETTINGS FOR POSE GESTURES
  useBounds?: boolean;
  restrictToBounds?: boolean;
  poseDuration?: number;
  resetPauseDuration?: number;
  triggerDuration?: number;

  playbackSettings: PlaybackSettings;
  endKeyframe?: { value: string; index: number };

  selectionKeys: string[];
  selectionLabelKey?: string;
  foreshadowingStatesMode?: ForeshadowingStatesMode;
  foreshadowingStatesCount?: number;

  animationState: Record<string, any>;
  gestureSubscription?: Subscription;
}

export type GestureListenerSubjectMap = { [key: string]: Subject<any> };

export interface ProcessedGestureListenerFingerData {
  detectedGesture: SupportedGestures;
  fingerPositions: Coordinate2D[];
}

export type PosePosition = Record<HANDS, Record<number, Coordinate2D>>;

export enum ListenerMode {
  FORESHADOWING = "foreshadowing",
  SELECTION = "selection",
  PLAYBACK = "playback",
  KEYFRAME = "keyframe",
}

export abstract class GestureListener {
  static snackbarSubjectKey = "snackbarSubject";
  static playbackSubjectKey = "playbackSubject";
  static emphasisSubjectKey = "emphasisSubject";
  static foreshadowingAreaSubjectKey = "foreshadowingAreaSubject";
  static highlighSubjectKey = "highlightSubject";
  static selectionSubjectKey = "selectionSubject";
  static circleFitter = getCircleFit();

  state: GestureListenerState;

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
    animationState = {},
    poseDuration,
    resetPauseDuration,
    triggerDuration,
    numHands,
    strokeTriggerName,
    selectionKeys,
    foreshadowingStatesMode,
    foreshadowingStatesCount,
    endKeyframe,
    strokeRecognizer = new DollarRecognizer(),
    playbackSettings = DEFAULT_PLAYBACK_SETTINGS,
    selectionLabelKey
  }: GestureListenerConstructorArgs) {
    this.state = {
      position,
      dimensions,
      canvasListener: new CanvasElementListener({
        position: position,
        dimensions: dimensions,
        isCircle: false,
        updateFn: (value) => {
          this.updateState(value);
        },
        drawingUtils,
      }),
      handsToTrack,
      gestureTypes,
      gestureSubject,
      gestureSubscription: gestureSubject.subscribe({
        next: (data: any) => this.handler(data),
      }),
      canvasDimensions,
      subjects: {
        [GestureListener.highlighSubjectKey]: highlightSubject,
        [GestureListener.emphasisSubjectKey]: emphasisSubject,
        [GestureListener.playbackSubjectKey]: playbackSubject,
        [GestureListener.foreshadowingAreaSubjectKey]: foreshadowingAreaSubject,
        [GestureListener.snackbarSubjectKey]: snackbarSubject,
        [GestureListener.selectionSubjectKey]: selectionSubject,
      },
      drawingUtils,
      addGesture: false,
      strokeRecognizer: new DollarRecognizer(strokeRecognizer.unistrokes),
      trackedFingers,
      listenerMode,
      animationState,
      poseDuration,
      resetPauseDuration,
      triggerDuration,
      numHands,
      strokeTriggerName,
      selectionKeys: selectionKeys ?? [],
      foreshadowingStatesMode,
      foreshadowingStatesCount,
      stroke: [],
      timer: undefined,
      resetKeys,
      detectionTimer: undefined,
      startDetecting: false,
      playbackSettings,
      endKeyframe,
      selectionLabelKey,
    };

    this.setResetHandler();
  }

  updateState({
    position,
    dimensions,
    handsToTrack,
    canvasDimensions,
    addGesture,
    gestureName,
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
    foreshadowingStatesCount,
    playbackConfig,
    endKeyframe,
    selectionLabelKey,
  }: Partial<GestureListenerConstructorArgs>) {
    if (position) {
      this.state.position = position;
    }
    if (dimensions) {
      this.state.dimensions = dimensions;
    }
    if (canvasDimensions) {
      this.state.canvasDimensions = canvasDimensions;
    }
    if (handsToTrack) {
      this.state.handsToTrack = handsToTrack;
    }
    if (addGesture !== undefined) {
      this.state.addGesture = addGesture;
    }
    if (gestureName) {
      this.state.gestureName = gestureName;
    }
    if (listenerMode) {
      this.state.listenerMode = listenerMode;
    }
    if (resetKeys) {
      this.state.resetKeys = resetKeys;
    }
    if (trackedFingers) {
      this.state.trackedFingers = trackedFingers;
    }
    if (strokeTriggerName) {
      this.state.strokeTriggerName = strokeTriggerName;
    }
    if (resetPauseDuration) {
      this.state.resetPauseDuration = resetPauseDuration;
    }
    if (poseDuration) {
      this.state.poseDuration = poseDuration;
    }
    if (triggerDuration) {
      this.state.triggerDuration = triggerDuration;
    }
    if (selectionKeys) {
      this.state.selectionKeys = selectionKeys;
    }
    if (numHands) {
      this.state.numHands = numHands;
    }
    if (foreshadowingStatesMode) {
      this.state.foreshadowingStatesMode = foreshadowingStatesMode;
    }
    if (foreshadowingStatesCount) {
      this.state.foreshadowingStatesCount = foreshadowingStatesCount;
    }
    if (playbackConfig) {
      this.state.playbackSettings[playbackConfig.key] = playbackConfig.value;
    }
    if (endKeyframe) {
      this.state.endKeyframe = endKeyframe;
    }
    this.state.selectionLabelKey = selectionLabelKey;
  }

  private setResetHandler() {
    // this.state.resetKeys?.forEach((resetKey: string) => {
    //   document.addEventListener("keypress", (event) => {
    //     if (event.code == resetKey) {
    //       this.resetHandler();
    //     }
    //   });
    // });
  }

  publishToSubject(
    bounds?: {
      coordinates: Coordinate2D;
      dimensions: Dimensions;
    },
    affectKey?: AffectOptions
  ) {
    switch (this.state.listenerMode) {
      case ListenerMode.FORESHADOWING:
        this.publishToSubjectIfExists(
          GestureListener.foreshadowingAreaSubjectKey,
          {
            keys: this.state.selectionKeys,
            count: this.state.foreshadowingStatesCount,
            mode: this.state.foreshadowingStatesMode,
            bounds,
            requireKeyInBounds: this.state.restrictToBounds,
          }
        );
        break;
      case ListenerMode.SELECTION:
        this.publishToSubjectIfExists(GestureListener.selectionSubjectKey, {
          keys: this.state.selectionKeys,
          bounds,
          requireKeyInBounds: this.state.restrictToBounds,
          selectionLabelKey: this.state.selectionLabelKey,
        });
        break;
      case ListenerMode.PLAYBACK:
        if (!affectKey) return;
        this.publishToSubjectIfExists(GestureListener.playbackSubjectKey, {
          type: "config",
          data: this.state.playbackSettings[affectKey],
        });
        break;
      case ListenerMode.KEYFRAME:
        this.publishToSubjectIfExists(GestureListener.playbackSubjectKey, {
          type: "keyframe",
          data: this.state.endKeyframe?.index,
        });
        break;
      default:
        break;
    }
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
    if (this.state.subjects && this.state.subjects[subjectKey]) {
      this.state.subjects[subjectKey].next(value);
    }
  }

  protected getSubjectByKey(subjectKey: string) {
    if (this.state.subjects && this.state.subjects[subjectKey]) {
      return this.state.subjects[subjectKey];
    }
    return undefined;
  }

  resetTimer(time?: number) {
    if (time) {
      startTimeoutInstance({
        onCompletion: () => {
          this.state.timer = undefined;
        },
        timeout: time,
      });
    } else {
      this.state.timer = undefined;
    }
  }

  protected renderKeyframe() {
    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: "skyblue",
        fontSize: 16,
      },
      (context) => {
        this.state.drawingUtils.drawText({
          coordinates: {
            x: this.state.position.x + 10,
            y: this.state.position.y + 20,
          },
          text: this.state.endKeyframe?.value ?? "",
          context,
        });
      },
      ["presenter", "preview"]
    );
  }

  protected renderBorder() {
    this.state.drawingUtils?.modifyContextStyleAndDraw(
      {
        strokeStyle: "skyblue",
      },
      (context) => {
        this.state.drawingUtils?.drawRect({
          coordinates: this.state.position,
          dimensions: this.state.dimensions,
          stroke: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
  }

  renderStrokePath() {
    if (!this.state.startDetecting) return;
    this.state.stroke.forEach((stroke) => {
      this.state.drawingUtils.modifyContextStyleAndDraw(
        {
          fillStyle: "skyBlue",
          opacity: 0.8,
        },
        (context) => {
          this.state.drawingUtils.drawCircle({
            coordinates: stroke,
            radius: 3,
            context,
            fill: true,
          });
        },
        ["presenter", "preview"]
      );
    });
  }

  unsubscribe() {
    this.state.gestureSubscription?.unsubscribe();
  }

  getSubject(key: string) {
    if (this.state.subjects) {
      const includesKey = Object.keys(this.state.subjects).includes(key);

      if (!includesKey) {
        throw new Error(
          `getGestureSubject - unable to find subject with key ${key}`
        );
      }

      return this.state.subjects[key];
    }
  }

  setCanvasDimensions(dimensions: Dimensions) {
    this.state.canvasDimensions = dimensions;
  }

  setHandsToTrack(hands: { dominant: HANDS; nonDominant: HANDS }) {
    this.state.handsToTrack = hands;
  }

  isWithinObjectBounds(position: Coordinate2D) {
    const { x: minX, y: minY } = this.state.position;
    const { maxX, maxY } = {
      maxX: this.state.position.x + this.state.dimensions.width,
      maxY: this.state.position.y + this.state.dimensions.height,
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
    if (this.state.detectionTimer) return;
    this.state.startDetecting = true;
    this.state.detectionTimer = startTimerInstance({
      onTick: (elapsed?: number) => {
        if (!elapsed) return;
        this.state.animationState.detectionExtent = elapsed;
      },
      onCompletion: () => {
        this.state.startDetecting = false;
        this.state.detectionTimer = undefined;
        this.state.animationState.detectionExtent = 0;
        onComplete();
      },
      timeout: this.state.triggerDuration ?? DEFAULT_TRIGGER_DURATION,
    });
  }

  renderDetectionState() {
    if (!this.state.startDetecting) return;

    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        strokeStyle: "#90EE90",
        opacity: 0.7,
      },
      (context) => {
        this.state.drawingUtils.drawRect({
          coordinates: this.state.position,
          dimensions: this.state.dimensions,
          stroke: true,
          context,
        });
      },
      ["presenter", "preview"]
    );

    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: "#90EE90",
        opacity: 0.3,
      },
      (context) => {
        this.state.drawingUtils.drawRect({
          coordinates: this.state.position,
          dimensions: {
            ...this.state.dimensions,
            width:
              this.state.dimensions.width *
              this.state.animationState.detectionExtent,
          },
          fill: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
  }

  protected thumbsTouch(fingerData: ListenerProcessedFingerData) {
    const handOne = fingerData[this.state.handsToTrack.dominant];
    const handTwo = fingerData[this.state.handsToTrack.nonDominant];

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
    const hand = fingerData[this.state.handsToTrack.dominant];

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
    if (!this.state.handsToTrack) return;

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

    this.state.gestureTypes.forEach(
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
