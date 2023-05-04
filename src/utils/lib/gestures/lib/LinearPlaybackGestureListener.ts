import type { Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  ListenerMode,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
  DEFAULT_TRIGGER_DURATION,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";
import { PlaybackSubjectType } from "./subjects";
import { HAND_LANDMARK_IDS } from "../../media-pipe";

export interface LinearListenerEmitRange {
  start: Coordinate2D;
  end: Coordinate2D;
}

export type LinearPlaybackGestureListenerConstructorArgs =
  GestureListenerConstructorArgs;

export class LinearPlaybackGestureListener extends GestureListener {
  constructor({
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
    strokeTriggerName = "temporal",
    listenerMode = ListenerMode.STROKE,
    triggerDuration = DEFAULT_TRIGGER_DURATION,
    // We use 2 hands to trigger;
    numHands = 1,
    ...rest
  }: LinearPlaybackGestureListenerConstructorArgs) {
    super({
      ...rest,
      handsToTrack,
      gestureTypes,
      strokeTriggerName,
      listenerMode,
      triggerDuration,
      numHands,
    });
  }

  resetHandler(): void {
    this.stroke = [];
  }

  handleTrigger() {
    if (this.detectionTimer) return;
    this.triggerDetection(() => {
      if (this.stroke.length < 5) {
        this.stroke = [];
        return;
      }

      if (this.addGesture) {
        if (!this.gestureName) {
          this.stroke = [];
          return;
        }

        this.strokeRecognizer.addGesture(this.gestureName, this.stroke);
        this.publishToSubjectIfExists(GestureListener.snackbarSubjectKey, {
          open: true,
          text: "Added new temporal playback gesture",
          variant: "success",
        });
      } else {
        const result = this.strokeRecognizer.recognize(this.stroke, false);
        if (result.name === this.strokeTriggerName) {
          this.publishToSubjectIfExists(GestureListener.playbackSubjectKey, {
            type: PlaybackSubjectType.CONTINUOUS,
          });
        }
      }

      this.stroke = [];
    });
  }

  protected handleNewData(fingerData: ListenerProcessedFingerData): void {
    const dominantHand = fingerData[this.handsToTrack.dominant];

    const trigger = this.thumbsTouch(fingerData);

    if (trigger) {
      this.handleTrigger();
      return;
    }

    if (!dominantHand || !this.startDetecting) {
      return;
    }

    const fingerPosition = dominantHand.fingerPositions[
      HAND_LANDMARK_IDS.index_finger_tip
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
