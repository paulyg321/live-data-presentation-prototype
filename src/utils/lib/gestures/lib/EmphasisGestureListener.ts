import { EmphasisMeter, emphasisSubject, startIntervalInstance } from "@/utils";
import _ from "lodash";
import type { Subject } from "rxjs";
import { DrawingMode, type Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";

export interface EmphasisGestureListenerConstructorArgs extends GestureListenerConstructorArgs {
  subjects?: Record<string, Subject<any>>;
};

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
  static emphasisSubjectKey = "emphasisSubject";
  // These can be changed if we want to support configuration of the behaviour of our emphasis
  static MAX_EMPHASIS = 150;
  static INCREMENT_BY_VALUE = 50;
  static DECREMENT_BY_VALUE = 0;
  static DECREMENT_EVERY = 125;

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
  private emphasisMeter: EmphasisMeter;
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
    resetKeys,
    drawingUtils,
  }: EmphasisGestureListenerConstructorArgs) {
    super({
      position,
      dimensions,
      handsToTrack,
      gestureSubject,
      canvasDimensions,
      resetKeys,
      subjects: {
        [EmphasisGestureListener.emphasisSubjectKey]: emphasisSubject,
      },
      drawingUtils,
    });

    this.gestureTypes = gestureTypes;
    this.emphasisMeter = new EmphasisMeter({
      drawingUtils,
      canvasDimensions,
    });
  }

  private resetStateValues() {
    this.resetTimer();
    this.isPreviousPositionInRange = false;
    this.emphasisMeter?.resetState();
    this.emphasisLevel = 0;
    const currentDrawingMode = this.getAnimationBasedOnEmphasisLevel();
    this.publishToSubjectIfExists(
      EmphasisGestureListener.emphasisSubjectKey,
      currentDrawingMode
    );
  }


  private onLevelIncrement() {
    const currentDrawingMode = this.getAnimationBasedOnEmphasisLevel();
    this.publishToSubjectIfExists(
      EmphasisGestureListener.emphasisSubjectKey,
      currentDrawingMode
    );
  }

  private onLevelDecrement() {
    if (
      EmphasisGestureListener.rangeValuesToEmit.includes(this.emphasisLevel)
    ) {
      const currentDrawingMode = this.getAnimationBasedOnEmphasisLevel();
      this.publishToSubjectIfExists(
        EmphasisGestureListener.emphasisSubjectKey,
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

  renderVisualIndicators() {
    this.emphasisMeter?.valueHandler(this.emphasisLevel);
  }

  draw() {
    this.renderVisualIndicators();
  }

  protected handleNewData(
    fingerData: ListenerProcessedFingerData,
    handCount: number
  ): void {
    const dominantHand = fingerData[this.handsToTrack.dominant];
    // const nonDominantHand = fingerData[this.handsToTrack.nonDominant];

    // Don't want non dominant hand in the frame
    if (!dominantHand || handCount === 2) {
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
