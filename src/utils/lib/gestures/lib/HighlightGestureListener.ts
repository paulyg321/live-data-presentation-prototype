import { highlightSubject } from "@/utils";
import type { Subject } from "rxjs";
import { calculateDistance } from "../../calculations";
import type { Coordinate2D } from "../../chart";
import { startTimeoutInstance } from "../../timer";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";

export interface HighlightGestureListenerConstructorArgs
  extends GestureListenerConstructorArgs {
  subjects?: Record<string, Subject<any>>;
}

export class HighlightGestureListener extends GestureListener {
  private lastPosition?: Coordinate2D;

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
    canvasDimensions,
    resetKeys,
    drawingUtils,
  }: HighlightGestureListenerConstructorArgs) {
    super({
      position,
      dimensions,
      handsToTrack,
      gestureTypes,
      canvasDimensions,
      resetKeys,
      drawingUtils,
    });
  }

  updateState({
    position,
    dimensions,
    handsToTrack,
  }: Partial<HighlightGestureListenerConstructorArgs>): void {
    super.updateState({
      position,
      dimensions,
      handsToTrack,
    });
  }

  resetHandler(): void {
    this.lastPosition = undefined;
    this.publishToSubjectIfExists(HighlightGestureListener.highlighSubjectKey, {
      x: 0,
      y: 0,
    });
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

    const [indexFinger] = dominantHand.fingersToTrack;
    const indexFingerPosition = dominantHand.fingerPositions[
      indexFinger
    ] as Coordinate2D;

    if (
      indexFingerPosition.x === undefined ||
      indexFingerPosition.y === undefined
    ) {
      return;
    }

    const isInBounds = this.isWithinObjectBounds(indexFingerPosition);

    if (!isInBounds) {
      this.lastPosition = undefined;
      return;
    }

    this.publishToSubjectIfExists(
      HighlightGestureListener.highlighSubjectKey,
      indexFingerPosition
    );

    this.lastPosition = indexFingerPosition;

    // if (!this.timer) {
    //   this.timer = startTimeoutInstance({
    //     onCompletion: () => {
    //       if (this.lastPosition) {
    //         const distance = calculateDistance(
    //           indexFingerPosition,
    //           this.lastPosition
    //         );
    //         if (distance.euclideanDistance < 40) {
    //           this.publishToSubjectIfExists(
    //             HighlightGestureListener.highlighSubjectKey,
    //             this.lastPosition
    //           );
    //         }
    //       }
    //       this.timer = undefined;
    //       this.lastPosition = undefined;
    //     },
    //     timeout: 1000,
    //   });
    // } else {
    //   this.lastPosition = indexFingerPosition;
    // }
  }

  drawLastPosition() {
    if (!this.lastPosition) return;
    this.drawingUtils.modifyContextStyleAndDraw({}, (context) => {
      this.drawingUtils.drawCircle({
        coordinates: this.lastPosition as Coordinate2D,
        radius: 2.5,
        fill: true,
        context,
      });
    });
  }

  draw() {
    this.renderBorder();
    this.drawLastPosition();
  }
}
