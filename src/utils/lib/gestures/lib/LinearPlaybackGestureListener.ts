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

export interface LinearPlaybackGestureListenerConstructorArgs
  extends GestureListenerConstructorArgs {
  gestureTypes: {
    rightHand: SupportedGestures;
    leftHand: SupportedGestures;
  }[];
}

export class LinearPlaybackGestureListener extends GestureListener {
  subjects: GestureListenerSubjectMap = {
    trackingSubject: new Subject(),
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
  }: LinearPlaybackGestureListenerConstructorArgs) {
    super({
      position,
      size,
      handsToTrack,
    });

    this.gestureTypes = gestureTypes;
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

  // Implemented to only track one finger and one hand
  handleNewData(fingerData: {
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

      const canEmit = this.isWithinObjectBounds(fingerPosition);

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
}
