import { gsap } from "gsap";
import {
  containsValueLargerThanMax,
  HAND_LANDMARK_IDS,
  startTimeoutInstance,
  distanceBetweenPoints,
  type Coordinate2D,
  HANDS,
  GestureListener,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
  type PosePosition,
  DEFAULT_POSE_DURATION,
  DEFAULT_RESET_PAUSE_DURATION,
  DEFAULT_TRIGGER_DURATION,
  SupportedGestures,
  AffectOptions,
  ListenerMode,
} from "@/utils";



export type PointPoseListenerConstructorArgs = GestureListenerConstructorArgs;

const REFERENCE_POINT_BOUNDS = 30;

export class PointPoseListener extends GestureListener {
  constructor({
    handsToTrack = {
      dominant: HANDS.RIGHT,
      nonDominant: HANDS.LEFT,
    },
    gestureTypes = [
      {
        [HANDS.RIGHT]: SupportedGestures.POINTING,
        [HANDS.LEFT]: SupportedGestures.POINTING,
      },
    ],
    trackedFingers = [HAND_LANDMARK_IDS.index_finger_tip],
    animationState = {
      referencePointRadius: 0,
    },
    poseDuration = DEFAULT_POSE_DURATION,
    resetPauseDuration = DEFAULT_RESET_PAUSE_DURATION,
    triggerDuration = DEFAULT_TRIGGER_DURATION,
    selectionKeys,
    numHands = 1,
    ...rest
  }: PointPoseListenerConstructorArgs) {
    super({
      ...rest,
      handsToTrack,
      gestureTypes,
      animationState,
      poseDuration,
      resetPauseDuration,
      numHands,
      triggerDuration,
      selectionKeys,
      trackedFingers,
    });
  }

  private drawPoseState() {
    // DRAW REFERENCE POINTS
    [this.state.handsToTrack.dominant].forEach((hand: HANDS) => {
      this.state.trackedFingers.forEach((fingerId: number) => {
        if (!this.state.posePositionToMatch) return;

        const positionToMatch = this.state.posePositionToMatch[hand][fingerId];

        if (!positionToMatch) return;

        this.state.drawingUtils.modifyContextStyleAndDraw(
          {
            strokeStyle: "green",
            opacity: 0.5,
            lineWidth: 2,
            lineDash: [4, 4],
          },
          (context) => {
            this.state.drawingUtils.drawCircle({
              coordinates: positionToMatch,
              radius: REFERENCE_POINT_BOUNDS,
              stroke: true,
              context,
            });
          },
          ["presenter", "preview"]
        );

        this.state.drawingUtils.modifyContextStyleAndDraw(
          {
            fillStyle: "green",
            opacity: 0.5,
          },
          (context) => {
            this.state.drawingUtils.drawCircle({
              coordinates: positionToMatch,
              radius: this.state.animationState.referencePointRadius,
              fill: true,
              context,
            });
          },
          ["presenter", "preview"]
        );

        if (!this.state.posePosition) return;

        const currentPosition = this.state.posePosition[hand][fingerId];

        if (!currentPosition) return;

        this.state.drawingUtils.modifyContextStyleAndDraw(
          {
            fillStyle: "skyBlue",
            opacity: 0.5,
          },
          (context) => {
            this.state.drawingUtils.drawCircle({
              coordinates: currentPosition,
              radius: 5,
              fill: true,
              context,
            });
          },
          ["presenter", "preview"]
        );
      });
    });
  }

  private resetGestureState() {
    this.state.posePosition = undefined;
    this.state.posePositionToMatch = undefined;
  }

  private handlePoseGesture(handCoords: Coordinate2D[]) {
    const { newPosePosition, isInBounds } = this.state.trackedFingers.reduce(
      (
        results: { newPosePosition: PosePosition; isInBounds: boolean },
        currentFingerId: number
      ) => {
        const finger = handCoords[currentFingerId];

        const isInBounds = this.isWithinObjectBounds(finger);

        return {
          newPosePosition: {
            [this.state.handsToTrack.dominant]: {
              ...results.newPosePosition?.[this.state.handsToTrack.dominant],
              [currentFingerId]: finger,
            },
            [this.state.handsToTrack.nonDominant]: {},
          } as PosePosition,
          isInBounds: results.isInBounds && isInBounds,
        };
      },
      {
        isInBounds: true,
      } as { newPosePosition: PosePosition; isInBounds: boolean }
    );

    if (!isInBounds) {
      this.resetGestureState();
    } else {
      this.state.posePosition = newPosePosition;

      if (this.state.timer) return;
      this.state.posePositionToMatch = newPosePosition;
      this.state.animationState.p;
      this.state.timer = startTimeoutInstance({
        onCompletion: () => {
          let isInPlace = false;
          if (this.state.posePosition && this.state.posePositionToMatch) {
            const diff = distanceBetweenPoints(
              Object.values(
                this.state.posePositionToMatch[this.state.handsToTrack.dominant]
              ),
              Object.values(
                this.state.posePosition[this.state.handsToTrack.dominant]
              )
            ).map((diff: any) => diff.euclideanDistance);

            isInPlace = !containsValueLargerThanMax(
              diff,
              REFERENCE_POINT_BOUNDS
            );
          }

          if (isInPlace) {
            this.publishToSubject(undefined, AffectOptions.NEUTRAL);
            this.resetTimer(this.state.resetPauseDuration);
          } else {
            this.resetTimer();
          }
          this.resetGestureState();
        },
        timeout: this.state.poseDuration ?? DEFAULT_POSE_DURATION,
      });
      gsap.to(this.state.animationState, {
        referencePointRadius: REFERENCE_POINT_BOUNDS,
        duration: this.state.poseDuration ? this.state.poseDuration / 1000 : 2,
        onComplete: () => {
          this.state.animationState.referencePointRadius = 0;
        },
      });
    }
  }

  protected handleNewData(fingerData: ListenerProcessedFingerData): void {
    const dominantHand = fingerData[this.state.handsToTrack.dominant];
    if (!dominantHand) {
      this.resetGestureState();
      return;
    }

    const matchesSpecifiedGesture = dominantHand.gestureData.gestures.some(
      (gesture: any) =>
        this.state.gestureTypes
          .map((type) => type[this.state.handsToTrack.dominant])
          .includes(gesture.name)
    );

    if (matchesSpecifiedGesture) {
      this.handlePoseGesture(dominantHand.fingerPositions);
    } else {
      this.resetGestureState();
    }
  }

  draw() {
    this.renderBorder();
    if (this.state.timer) {
      this.drawPoseState();
    }
  }
}
