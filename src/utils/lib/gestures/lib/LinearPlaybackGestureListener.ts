import { Subject } from "rxjs";
import type { Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type GestureListenerSubjectMap,
  type ListenerProcessedFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";

export interface LinearListenerEmitRange {
  start: Coordinate2D;
  end: Coordinate2D;
}

export interface LinearPlaybackGestureListenerConstructorArgs
  extends GestureListenerConstructorArgs {
  emitRange?: LinearListenerEmitRange;
}

export class LinearPlaybackGestureListener extends GestureListener {
  static trackingSubjectKey = "trackingSubject";
  private emitRange:
    | {
        start: Coordinate2D;
        end: Coordinate2D;
      }
    | undefined;
  subjects: GestureListenerSubjectMap = {
    [LinearPlaybackGestureListener.trackingSubjectKey]: new Subject(),
  };

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
  }: LinearPlaybackGestureListenerConstructorArgs) {
    super({
      position,
      dimensions,
      handsToTrack,
      gestureTypes,
      gestureSubject,
      canvasDimensions,
      resetKeys,
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
      if (value >= range.min && value <= range.max) {
        return true;
      }
      return false;
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

  renderReferencePoints() {
    if (this.context) {
      this.clearCanvas();
      this.renderBorder();
    }
  }

  resetHandler(): void {
    console.log("RESET LINEAR LISTENER");
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
    this.subjects.trackingSubject.next(trackingValue);
  }
}
