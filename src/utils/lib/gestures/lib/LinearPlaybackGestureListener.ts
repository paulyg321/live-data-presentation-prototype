import _ from "lodash";
import type { Subject } from "rxjs";
import type { Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";
import { playbackSubject, PlaybackSubjectType } from "./subjects";
import { calculateDistance } from "../../calculations";
import { startTimeoutInstance, startTimerInstance } from "../../timer";

export interface LinearListenerEmitRange {
  start: Coordinate2D;
  end: Coordinate2D;
}

export interface LinearPlaybackGestureListenerConstructorArgs
  extends GestureListenerConstructorArgs {
  emitRange?: LinearListenerEmitRange;
  subjects?: Record<string, Subject<any>>;
}

export class LinearPlaybackGestureListener extends GestureListener {
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
  }: LinearPlaybackGestureListenerConstructorArgs) {
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

  resetHandler(): void {
    this.stroke = [];
  }

  renderDetectionState() {
    if (!this.startDetecting) return;

    this.drawingUtils.modifyContextStyleAndDraw(
      {
        strokeStyle: "#90EE90",
        opacity: 0.7,
      },
      (context) => {
        this.drawingUtils.drawRect({
          coordinates: this.position,
          dimensions: this.dimensions,
          stroke: true,
          context,
        });
      },
      ["presenter", "preview"]
    );

    this.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: "#90EE90",
        opacity: 0.3,
      },
      (context) => {
        this.drawingUtils.drawRect({
          coordinates: this.position,
          dimensions: {
            ...this.dimensions,
            width: this.dimensions.width * this.detectionExtent,
          },
          fill: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
  }

  handleTrigger() {
    if (this.detectionTimer) return;
    this.triggerDetection(5000, () => {
      if (this.stroke.length < 5) {
        this.stroke = [];
        return;
      }

      if (this.addGesture) {
        if (!this.gestureName) {
          this.stroke = [];
          return;
        };

        this.strokeRecognizer.addGesture(this.gestureName, this.stroke);
        this.publishToSubjectIfExists(GestureListener.snackbarSubjectKey, {
          open: true,
          text: "Added new temporal playback gesture",
          variant: "success",
        });
      } else {
        const result = this.strokeRecognizer.recognize(this.stroke, false);
        if (result.name === "temporal") {
          this.publishToSubjectIfExists(GestureListener.playbackSubjectKey, {
            type: PlaybackSubjectType.CONTINUOUS,
            duration: 3000,
          });
        }
      }

      this.stroke = [];
    });
  }

  protected handleNewData(
    fingerData: ListenerProcessedFingerData,
    handCount: number
  ): void {
    const dominantHand = fingerData[this.handsToTrack.dominant];

    const trigger = this.thumbsTouch(
      fingerData,
      this.handsToTrack.nonDominant,
      this.handsToTrack.dominant
    );

    if (trigger) {
      this.handleTrigger();
      return;
    }

    if (!dominantHand || !this.startDetecting) {
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

    if (isInBounds) {
      this.stroke.push(fingerPosition);
    }
  }

  cancelAnimation() {
    this.publishToSubjectIfExists(
      GestureListener.playbackSubjectKey,
      undefined
    );
  }

  draw() {
    this.renderBorder();
    this.renderStrokePath();
    this.renderDetectionState();
  }
}
