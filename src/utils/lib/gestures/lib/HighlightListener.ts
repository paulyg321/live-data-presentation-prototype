import {
  HAND_LANDMARK_IDS,
  type Coordinate2D,
  HANDS,
  GestureListener,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
  SupportedGestures,
  DEFAULT_TRIGGER_DURATION,
  startTimeoutInstance,
} from "@/utils";

export type HighlightListenerConstructorArgs = GestureListenerConstructorArgs;

export class HighlightListener extends GestureListener {
  constructor({
    position,
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
    trackedFingers = [HAND_LANDMARK_IDS.index_finger_tip],
    canvasDimensions,
    resetKeys,
    drawingUtils,
    strokeTriggerName = "radial",
    triggerDuration = DEFAULT_TRIGGER_DURATION,
    numHands = 1,
    ...rest
  }: HighlightListenerConstructorArgs) {
    super({
      ...rest,
      position,
      dimensions: canvasDimensions,
      handsToTrack,
      gestureTypes,
      canvasDimensions,
      resetKeys,
      drawingUtils,
      strokeTriggerName,
      triggerDuration,
      numHands,
      trackedFingers,
    });
  }

  handleTrigger(fingerData: ListenerProcessedFingerData) {
    const handOne = fingerData[this.state.handsToTrack.dominant];

    const thumbPosition = handOne?.fingerPositions[
      HAND_LANDMARK_IDS.thumb_tip
    ] as Coordinate2D;

    const isInBounds = this.isWithinObjectBounds(thumbPosition);

    if (isInBounds && !this.state.timer) {
      this.publishToSubject();
      this.state.timer = startTimeoutInstance({
        onCompletion: () => {
          this.resetTimer();
        },
        timeout: this.state.resetPauseDuration ?? 0,
      });
    }
  }

  // Implemented to only track one finger and one hand
  protected handleNewData(fingerData: ListenerProcessedFingerData): void {
    const dominantHand = fingerData[this.state.handsToTrack.dominant];
    if (!dominantHand || !this.state.isActive) {
      return;
    }

    const indexPosition = dominantHand.fingerPositions[
      HAND_LANDMARK_IDS.index_finger_tip
    ] as Coordinate2D;

    this.publishToSubjectIfExists(
      GestureListener.highlighSubjectKey,
      indexPosition
    );
  }

  draw() {
    this.renderBorder();
  }
}
