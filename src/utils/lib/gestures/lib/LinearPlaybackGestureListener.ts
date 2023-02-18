import { Subject } from "rxjs";
import type { Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type GestureListenerSubjectMap,
  type ProcessedGestureListenerFingerData,
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
    size,
    handsToTrack = [HANDS.RIGHT],
    gestureTypes = [
      {
        rightHand: SupportedGestures.POINTING,
        leftHand: SupportedGestures.POINTING,
      },
    ],
    gestureSubject,
    canvasDimensions,
    emitRange,
  }: LinearPlaybackGestureListenerConstructorArgs) {
    super({
      position,
      size,
      handsToTrack,
      gestureTypes,
      gestureSubject,
      canvasDimensions,
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

  // Implemented to only track one finger and one hand
  protected handleNewData(fingerData: {
    left?: ProcessedGestureListenerFingerData;
    right?: ProcessedGestureListenerFingerData;
  }): void {
    let dominantHand;

    if (fingerData.left) {
      dominantHand = fingerData.left;
    } else if (fingerData.right) {
      dominantHand = fingerData.right;
    }

    if (dominantHand) {
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

      // EMIT NEW TRACKING VALUE
      if (canEmit) {
        const trackingValue = this.ratioTravelledBetweenSpecifiedRange(
          fingerPosition.x,
          {
            min: this.position.x,
            max: this.position.x + this.size.width,
          }
        );
        this.subjects.trackingSubject.next(trackingValue);
      }
    }
  }

  updateState({
    position,
    size,
    handsToTrack,
    emitRange,
  }: Partial<LinearPlaybackGestureListenerConstructorArgs>): void {
    super.updateState({
      position,
      size,
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
}
