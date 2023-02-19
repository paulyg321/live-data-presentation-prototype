import { EmphasisMeter } from "@/utils";
import { Subject } from "rxjs";
import { DrawingMode, type Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type GestureListenerSubjectMap,
  type ProcessedGestureListenerFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";

export type EmphasisGestureListenerConstructorArgs =
  GestureListenerConstructorArgs;

export class EmphasisGestureListener extends GestureListener {
  static emphasisLevelSubjectKey = "emphasisLevelSubject";

  private emphasisLevel = 0;
  private emphasisMeter: EmphasisMeter | undefined;

  private isPreviousPositionInRange = false;
  subjects: GestureListenerSubjectMap = {
    [EmphasisGestureListener.emphasisLevelSubjectKey]: new Subject(),
  };

  constructor({
    position,
    dimensions,
    handsToTrack = [HANDS.RIGHT, HANDS.LEFT],
    gestureTypes = [
      {
        rightHand: SupportedGestures.OPEN_HAND,
        leftHand: SupportedGestures.OPEN_HAND,
      },
    ],
    gestureSubject,
    canvasDimensions,
  }: EmphasisGestureListenerConstructorArgs) {
    super({
      position,
      dimensions,
      handsToTrack,
      gestureSubject,
      canvasDimensions,
    });

    this.gestureTypes = gestureTypes;
  }

  // ----------------- INTERACTIONS WITH CANVAS ----------------------
  // Implemented to only track one finger and one hand
  protected handleNewData(fingerData: {
    left?: ProcessedGestureListenerFingerData;
    right?: ProcessedGestureListenerFingerData;
  }): void {
    let dominantHand;

    if (fingerData.left) {
      return;
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
            onTick: () => {
              if (this.emphasisLevel === 0) {
                this.resetTimer();
              } else {
                this.emphasisLevel -= 1;
                this.emphasisMeter?.valueHandler(this.emphasisLevel);
              }
            },
            onCompletion: () => {
              this.emphasisLevel = 0;
              this.emphasisMeter?.valueHandler(this.emphasisLevel);
              this.resetTimer();
            },
            timeout: 20000,
          });
        }

        if (
          this.isPreviousPositionInRange === false &&
          this.emphasisLevel < 150
        ) {
          this.emphasisLevel += 25;
          this.emphasisMeter?.valueHandler(this.emphasisLevel);
        }

        this.isPreviousPositionInRange = true;
      } else {
        this.isPreviousPositionInRange = false;
      }
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

  getAnimationBasedOnEmphasisLevel() {
    if (this.emphasisLevel <= 50) {
      return DrawingMode.SEQUENTIAL_TRANSITION;
    } else if (this.emphasisLevel > 50 && this.emphasisLevel <= 100) {
      return DrawingMode.CONCURRENT;
    } else if (this.emphasisLevel > 100 && this.emphasisLevel <= 150) {
      return DrawingMode.DROP;
    }
  }

  renderReferencePoints() {
    if (this.context) {
      this.clearCanvas();
      this.renderBorder();
    }
  }
}
