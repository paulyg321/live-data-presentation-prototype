import _ from "lodash";
import type { Coordinate2D } from "../../chart";
import type { CanvasElementListener } from "../../interactions";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";
import { PlaybackSubjectType } from "./subjects";

export interface LinearListenerEmitRange {
  start: Coordinate2D;
  end: Coordinate2D;
}

export interface LinearPlaybackGestureListenerConstructorArgs
  extends GestureListenerConstructorArgs {
  emitRange?: LinearListenerEmitRange;
}

export class LinearPlaybackGestureListener extends GestureListener {
  static playbackSubjectKey = "playbackSubject";
  private emitRange:
    | {
        start: Coordinate2D;
        end: Coordinate2D;
      }
    | undefined;

  constructor({
    position,
    dimensions,
    handsToTrack = {
      dominant: HANDS.RIGHT,
      nonDominant: HANDS.LEFT,
    },
    gestureTypes = [
      {
        rightHand: SupportedGestures.POINTING,
        leftHand: SupportedGestures.POINTING,
      },
    ],
    gestureSubject,
    canvasDimensions,
    emitRange,
    resetKeys,
    subjects,
    eventContext,
  }: LinearPlaybackGestureListenerConstructorArgs) {
    super({
      position,
      dimensions,
      handsToTrack,
      gestureTypes,
      gestureSubject,
      canvasDimensions,
      resetKeys,
      subjects,
      eventContext,
    });

    this.emitRange = emitRange;
  }

  private ratioTravelledBetweenSpecifiedRange(
    value: number,
    range: {
      min: number;
      max: number;
    }
  ) {
    return (value - range.min) / (range.max - range.min);
  }

  private isWithinEmitRange(
    value: number,
    range: {
      min: number | undefined;
      max: number | undefined;
    }
  ) {
    if (range.min && range.max) {
      if (range.min === range.max) return false;

      return _.inRange(value, range.min, range.max);
    }

    return true;
  }

  updateState({
    position,
    dimensions,
    handsToTrack,
    emitRange,
  }: Partial<LinearPlaybackGestureListenerConstructorArgs>): void {
    super.updateState({
      position,
      dimensions,
      handsToTrack,
    });

    if (emitRange) {
      this.emitRange = emitRange;
    }
  }

  resetHandler(): void {
    this.emitRange = undefined;
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

    const isInBounds = this.isWithinObjectBounds(fingerPosition);
    const isInEmitRange = this.isWithinEmitRange(fingerPosition.x, {
      min: this.emitRange?.start.x,
      max: this.emitRange?.end.x,
    });

    const canEmit = isInBounds && isInEmitRange;

    if (!canEmit) {
      return;
    }

    const trackingValue = this.ratioTravelledBetweenSpecifiedRange(
      fingerPosition.x,
      {
        min: this.position.x,
        max: this.position.x + this.dimensions.width,
      }
    );

    this.publishToSubjectIfExists(
      LinearPlaybackGestureListener.playbackSubjectKey,
      { type: PlaybackSubjectType.DISCRETE, value: trackingValue }
    );
  }

  draw() {
    this.clearCanvas();
    this.renderBorder();
    this.canvasListener?.draw();
  }
}
