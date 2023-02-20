import { EmphasisMeter, startIntervalInstance } from "@/utils";
import _ from "lodash";
import { DrawingMode, type Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";

export type EmphasisGestureListenerConstructorArgs =
  GestureListenerConstructorArgs;

export type EmphasisListenerAnimationRangeConfig = [
  // Start value
  number,
  // end value
  number,
  DrawingMode,
  // colors
  string
];

export class EmphasisGestureListener extends GestureListener {
  static currentAnimationSubjectKey = "currentAnimationSubject";
  // These can be changed if we want to support configuration of the behaviour of our emphasis
  static MAX_EMPHASIS = 150;
  static INCREMENT_BY_VALUE = 50;
  static DECREMENT_BY_VALUE = 1;
  static DECREMENT_EVERY = 100;

  // CONFIGURE THESE TO CONFIGURE THE ANIMATIONS AND RANGES FOR EMPHASIS VALUES
  static ANIMATION_RANGES: EmphasisListenerAnimationRangeConfig[] = [
    [0, 51, DrawingMode.UNDULATE_ANIMATION, "#00cf07"],
    [51, 101, DrawingMode.BASELINE_ANIMATION, "#d1b902"],
    [101, 151, DrawingMode.DROP_ANIMATION, "#c40e0e"],
  ];

  // watch for the values around the boundaries of our configured ranges
  static rangeValuesToEmit = EmphasisGestureListener.ANIMATION_RANGES.reduce(
    (
      watchForArray: number[],
      [_, rangeEnd, __]: EmphasisListenerAnimationRangeConfig
    ) => {
      return [...watchForArray, rangeEnd - 1, rangeEnd, rangeEnd + 1];
    },
    [] as number[]
  );

  static getConfigValuesBasedOnRange(value: number): {
    mode: DrawingMode;
    color: string;
  } {
    return EmphasisGestureListener.ANIMATION_RANGES.reduce(
      (
        config: { mode: DrawingMode; color: string },
        [
          rangeStart,
          rangeEnd,
          currentMode,
          currentColor,
        ]: EmphasisListenerAnimationRangeConfig
      ) => {
        if (_.inRange(value, rangeStart, rangeEnd)) {
          return {
            mode: currentMode,
            color: currentColor,
          };
        }
        return config;
      },
      {
        mode: DrawingMode.BASELINE_ANIMATION,
        color: "#00cf07",
      }
    );
  }

  private emphasisLevel = 0;
  private emphasisMeter: EmphasisMeter | undefined;
  private isPreviousPositionInRange = false;

  constructor({
    position,
    dimensions,
    handsToTrack = {
      dominant: HANDS.RIGHT,
      nonDominant: HANDS.LEFT,
    },
    gestureTypes = [
      {
        rightHand: SupportedGestures.OPEN_HAND,
        leftHand: SupportedGestures.OPEN_HAND,
      },
    ],
    gestureSubject,
    canvasDimensions,
    subjects,
    resetKeys,
  }: EmphasisGestureListenerConstructorArgs) {
    super({
      position,
      dimensions,
      handsToTrack,
      gestureSubject,
      canvasDimensions,
      resetKeys,
      subjects,
    });

    this.gestureTypes = gestureTypes;
  }

  private resetStateValues() {
    this.resetTimer();
    this.isPreviousPositionInRange = false;
    this.emphasisMeter?.resetState();
    this.emphasisLevel = 0;
    const currentDrawingMode = this.getAnimationBasedOnEmphasisLevel();
    this.publishToSubjectIfExists(
      EmphasisGestureListener.currentAnimationSubjectKey,
      currentDrawingMode
    );
  }

  private clearAllVisualIndicators() {
    this.renderReferencePoints(true);
  }

  private onLevelIncrement() {
    this.renderVisualIndicators();
    const currentDrawingMode = this.getAnimationBasedOnEmphasisLevel();
    this.publishToSubjectIfExists(
      EmphasisGestureListener.currentAnimationSubjectKey,
      currentDrawingMode
    );
  }

  private onLevelDecrement() {
    this.renderVisualIndicators();

    if (
      EmphasisGestureListener.rangeValuesToEmit.includes(this.emphasisLevel)
    ) {
      const currentDrawingMode = this.getAnimationBasedOnEmphasisLevel();
      this.publishToSubjectIfExists(
        EmphasisGestureListener.currentAnimationSubjectKey,
        currentDrawingMode
      );
    }
  }

  getAnimationBasedOnEmphasisLevel() {
    return EmphasisGestureListener.getConfigValuesBasedOnRange(
      this.emphasisLevel
    ).mode;
  }

  resetHandler(): void {
    this.resetStateValues();
    this.clearAllVisualIndicators();
  }

  startDecrementTimer() {
    if (this.timer === undefined) {
      this.timer = startIntervalInstance({
        onTick: () => {
          if (this.emphasisLevel === 0) {
            this.resetStateValues();
          } else {
            this.emphasisLevel -= EmphasisGestureListener.DECREMENT_BY_VALUE;
            this.onLevelDecrement();
          }
        },
        onCompletion: () => {
          this.onLevelDecrement();
          this.resetStateValues();
        },
        timeout: 20000,
        interval: EmphasisGestureListener.DECREMENT_EVERY,
      });
    }
  }

  setContext(ctx: CanvasRenderingContext2D): void {
    this.context = ctx;
    if (this.canvasDimensions) {
      this.emphasisMeter = new EmphasisMeter({
        canvasDimensions: this.canvasDimensions,
        context: this.context,
      });
    }
  }

  renderVisualIndicators() {
    this.clearCanvas();
    this.emphasisMeter?.valueHandler(this.emphasisLevel);
    this.renderReferencePoints(false);
  }

  renderReferencePoints(clear = true) {
    if (!this.context) {
      return;
    }

    if (clear) {
      this.clearCanvas();
    }

    this.renderBorder();
  }

  protected handleNewData(fingerData: ListenerProcessedFingerData): void {
    const dominantHand = fingerData[this.handsToTrack.dominant];
    const nonDominantHand = fingerData[this.handsToTrack.nonDominant];

    // Don't want non dominant hand in the frame
    if (!dominantHand || nonDominantHand) {
      return;
    }

    const [fingerToTrack] = dominantHand.fingersToTrack;
    const fingerPosition = dominantHand.fingerPositions[
      fingerToTrack
    ] as Coordinate2D;

    if (fingerPosition.x === undefined || fingerPosition.y === undefined) {
      return;
    }

    const canEmit = this.isWithinObjectBounds(fingerPosition);

    if (canEmit) {
      this.startDecrementTimer();

      const lastValueToIncrementAt =
        EmphasisGestureListener.MAX_EMPHASIS -
        EmphasisGestureListener.INCREMENT_BY_VALUE;

      if (
        this.isPreviousPositionInRange === false &&
        this.emphasisLevel <= lastValueToIncrementAt
      ) {
        this.emphasisLevel += EmphasisGestureListener.INCREMENT_BY_VALUE;
        this.onLevelIncrement();
      }
      this.isPreviousPositionInRange = true;
    } else {
      this.isPreviousPositionInRange = false;
    }
  }
}
