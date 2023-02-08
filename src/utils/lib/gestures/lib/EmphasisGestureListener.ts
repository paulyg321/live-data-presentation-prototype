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

export interface EmphasisGestureListenerConstructorArgs
  extends GestureListenerConstructorArgs {
  gestureTypes: {
    rightHand: SupportedGestures;
    leftHand: SupportedGestures;
  }[];
}

export class EmphasisGestureListener extends GestureListener {
  private emphasisLevel = 0;
  private isPreviousPositionInRange = false;
  subjects: GestureListenerSubjectMap = {
    emphasisLevelSubject: new Subject(),
  };

  constructor({
    position,
    size,
    handsToTrack = [HANDS.RIGHT],
    gestureTypes = [
      {
        rightHand: SupportedGestures.OPEN_HAND,
        leftHand: SupportedGestures.OPEN_HAND,
      },
    ],
  }: EmphasisGestureListenerConstructorArgs) {
    super({
      position,
      size,
      handsToTrack,
    });

    this.gestureTypes = gestureTypes;
  }

  // ----------------- INTERACTIONS WITH CANVAS ----------------------
  private renderState() {
    // TODO: Use this to render visual indicators
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

      if (canEmit) {
        if (this.timer === undefined) {
          this.timer = this.startTimerInstance({
            execute: {
              onTick: () => {
                if (this.emphasisLevel === 0) {
                  this.resetTimer();
                } else {
                  this.emphasisLevel -= 1;
                  this.subjects.emphasisLevelSubject.next(this.emphasisLevel);
                }
              },
              onCompletion: () => {
                this.emphasisLevel = 0;
                this.resetTimer();
              },
            },
            timeout: 20000,
          });
        }

        if (
          this.isPreviousPositionInRange === false &&
          this.emphasisLevel < 150
        ) {
          this.emphasisLevel += 25;
          this.subjects.emphasisLevelSubject.next(this.emphasisLevel);
        }

        this.isPreviousPositionInRange = true;
      } else {
        this.isPreviousPositionInRange = false;
      }
    }
  }
}
