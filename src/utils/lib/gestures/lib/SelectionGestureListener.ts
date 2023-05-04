import { HAND_LANDMARK_IDS, startTimeoutInstance } from "@/utils";
import { containsValueLargerThanMax } from "../../calculations";
import { distanceBetweenPoints, type Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  ListenerMode,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
  type PosePosition,
  DEFAULT_POSE_DURATION,
  DEFAULT_RESET_PAUSE_DURATION,
  DEFAULT_TRIGGER_DURATION,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";
import { gsap } from "gsap";

export type SelectionGestureListenerConstructorArgs =
  GestureListenerConstructorArgs;

const REFERENCE_POINT_BOUNDS = 30;

export class SelectionGestureListener extends GestureListener {
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
      {
        rightHand: SupportedGestures.OPEN_HAND,
        leftHand: SupportedGestures.OPEN_HAND,
      },
    ],
    listenerMode = ListenerMode.POSE,
    animationState = {
      referencePointRadius: 0,
    },
    poseDuration = DEFAULT_POSE_DURATION,
    resetPauseDuration = DEFAULT_RESET_PAUSE_DURATION,
    triggerDuration = DEFAULT_TRIGGER_DURATION,
    selectionKeys,
    numHands = 1,
    ...rest
  }: SelectionGestureListenerConstructorArgs) {
    super({
      ...rest,
      handsToTrack,
      gestureTypes,
      listenerMode,
      animationState,
      poseDuration,
      resetPauseDuration,
      numHands,
      triggerDuration,
      selectionKeys,
    });
  }

  draw() {
    this.renderBorder();
    this.renderStrokePath();
    if (this.timer && this.listenerMode === ListenerMode.POSE) {
      this.drawPoseState();
    }
    if (this.listenerMode === ListenerMode.STROKE) {
      this.renderDetectionState();
    }
  }

  private drawPoseState() {
    // DRAW REFERENCE POINTS
    [this.handsToTrack.dominant].forEach((hand: HANDS) => {
      this.trackedFingers.forEach((fingerId: number) => {
        if (!this.posePositionToMatch) return;

        const positionToMatch = this.posePositionToMatch[hand][fingerId];

        if (!positionToMatch) return;

        this.drawingUtils.modifyContextStyleAndDraw(
          {
            strokeStyle: "green",
            opacity: 0.5,
            lineWidth: 2,
            lineDash: [4, 4],
          },
          (context) => {
            this.drawingUtils.drawCircle({
              coordinates: positionToMatch,
              radius: REFERENCE_POINT_BOUNDS,
              stroke: true,
              context,
            });
          }
        );

        this.drawingUtils.modifyContextStyleAndDraw(
          {
            fillStyle: "green",
            opacity: 0.5,
          },
          (context) => {
            this.drawingUtils.drawCircle({
              coordinates: positionToMatch,
              radius: this.animationState.referencePointRadius,
              fill: true,
              context,
            });
          }
        );

        if (!this.posePosition) return;

        const currentPosition = this.posePosition[hand][fingerId];

        if (!currentPosition) return;

        this.drawingUtils.modifyContextStyleAndDraw(
          {
            fillStyle: "skyBlue",
            opacity: 0.5,
          },
          (context) => {
            this.drawingUtils.drawCircle({
              coordinates: currentPosition,
              radius: 5,
              fill: true,
              context,
            });
          }
        );
      });
    });
  }

  resetHandler(): void {
    this.publishToSubjectIfExists(
      GestureListener.selectionSubjectKey,
      undefined
    );
    this.resetGestureState();
  }

  private resetGestureState() {
    this.posePosition = undefined;
    this.posePositionToMatch = undefined;
  }

  private publishToSubject() {
    this.publishToSubjectIfExists(
      GestureListener.selectionSubjectKey,
      this.selectionKeys
    );
  }

  private handlePoseGesture(handCoords: Coordinate2D[]) {
    const FINGER_IDS = [
      HAND_LANDMARK_IDS.index_finger_tip,
      HAND_LANDMARK_IDS.thumb_tip,
    ];

    const { newPosePosition, isInBounds } = FINGER_IDS.reduce(
      (
        results: { newPosePosition: PosePosition; isInBounds: boolean },
        currentFingerId: number
      ) => {
        const finger = handCoords[currentFingerId];

        const isInBounds = this.isWithinObjectBounds(finger);

        return {
          newPosePosition: {
            [this.handsToTrack.dominant]: {
              ...results.newPosePosition?.[this.handsToTrack.dominant],
              [currentFingerId]: finger,
            },
            [this.handsToTrack.nonDominant]: {},
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
      this.posePosition = newPosePosition;

      if (this.timer) return;
      this.posePositionToMatch = newPosePosition;
      this.animationState.p
      this.timer = startTimeoutInstance({
        onCompletion: () => {
          let isInPlace = false;
          if (this.posePosition && this.posePositionToMatch) {
            const diff = distanceBetweenPoints(
              Object.values(
                this.posePositionToMatch[this.handsToTrack.dominant]
              ),
              Object.values(this.posePosition[this.handsToTrack.dominant])
            ).map((diff: any) => diff.euclideanDistance);

            isInPlace = !containsValueLargerThanMax(
              diff,
              REFERENCE_POINT_BOUNDS
            );
          }

          if (isInPlace) {
            this.publishToSubject();
            this.resetTimer(this.resetPauseDuration);
          } else {
            this.resetTimer();
          }
          this.resetGestureState();
        },
        timeout: this.poseDuration ?? DEFAULT_POSE_DURATION,
      });
      gsap.to(this.animationState, {
        referencePointRadius: REFERENCE_POINT_BOUNDS,
        duration: this.poseDuration ? this.poseDuration / 1000 : 2,
        onComplete: () => {
          this.animationState.referencePointRadius = 0;
        }
      });
    }
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
          text: "Added new selection widget",
          variant: "success",
        });
      } else {
        const result = this.strokeRecognizer.recognize(this.stroke, false);
        if (result.name === this.strokeTriggerName) {
          this.publishToSubject();
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

    if (!dominantHand) {
      return;
    }

    if (this.listenerMode === ListenerMode.POSE) {
      this.handlePoseGesture(dominantHand.fingerPositions);
    } else if (this.listenerMode === ListenerMode.STROKE) {
      const trigger = this.thumbsTouch(fingerData);

      if (trigger) {
        this.handleTrigger();
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
      // this.handleShapeGesture(fingerData);
    }
  }
}
