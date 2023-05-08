import { containsValueLargerThanMax } from "../../calculations";
import { distanceBetweenPoints, type Coordinate2D } from "../../chart";
import { HAND_LANDMARK_IDS } from "../../media-pipe";
import { startTimeoutInstance } from "../../timer";
import { ForeshadowingType } from "./ForeshadowingGestureListener";
import {
  DEFAULT_POSE_DURATION,
  DEFAULT_RESET_PAUSE_DURATION,
  GestureListener,
  ListenerMode,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
  type PosePosition,
} from "./GestureListener";
import { HANDS } from "./gesture-utils";
import { SupportedGestures } from "./handGestures";

const REFERENCE_POINT_BOUNDS = 30;

export type RectPoseListenerArgs = GestureListenerConstructorArgs;

export class RectPoseListener extends GestureListener {
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
    mode = ForeshadowingType.SHAPE,
    listenerMode = ListenerMode.POSE,
    animationState = {
      referencePointRadius: REFERENCE_POINT_BOUNDS,
    },
    poseDuration = DEFAULT_POSE_DURATION,
    resetPauseDuration = DEFAULT_RESET_PAUSE_DURATION,
    numHands = 2,
    ...rest
  }: RectPoseListenerArgs) {
    super({
      ...rest,
      handsToTrack,
      gestureTypes,
      mode,
      listenerMode,
      animationState,
      poseDuration,
      resetPauseDuration,
      numHands,
    });
  }

  private publishToSubject() {
    // TODO: Based on settings configure this
    const foreshadowingArea = this.getRectDataFromState();

    this.publishToSubjectIfExists(GestureListener.foreshadowingAreaSubjectKey, {
      area: foreshadowingArea,
      count: this.foreshadowingStatesCount,
      mode: this.foreshadowingStatesMode,
    });
  }

  private getRectDataFromState() {
    const rightThumb = this.posePosition?.right[HAND_LANDMARK_IDS.thumb_tip];
    const leftIndex =
      this.posePosition?.left[HAND_LANDMARK_IDS.index_finger_tip];

    if (leftIndex && rightThumb) {
      const rectDimensions = {
        width: Math.abs(leftIndex.x - rightThumb.x),
        height: Math.abs(leftIndex.y - rightThumb.y),
      };

      return {
        coordinates: leftIndex,
        dimensions: rectDimensions,
      };
    }
    return undefined;
  }

  private resetGestureState() {
    this.resetTimer();
    this.posePosition = undefined;
    this.posePositionToMatch = undefined;
  }

  resetHandler(): void {
    this.publishToSubjectIfExists(
      GestureListener.foreshadowingAreaSubjectKey,
      undefined
    );
    this.resetGestureState();
  }

  draw() {
    this.renderBorder();
    if (this.timer) {
      this.drawPoseState();
    }
  }

  private drawPoseState() {
    // DRAW REFERENCE POINTS
    [HANDS.LEFT, HANDS.RIGHT].forEach((hand: HANDS) => {
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

  private handlePoseGesture(
    rightHandCoords: Coordinate2D[],
    leftHandCoords: Coordinate2D[]
  ) {
    const FINGER_IDS = [
      HAND_LANDMARK_IDS.index_finger_tip,
      HAND_LANDMARK_IDS.thumb_tip,
    ];

    const { newPosePosition, isInBounds } = FINGER_IDS.reduce(
      (
        results: { newPosePosition: PosePosition; isInBounds: boolean },
        currentFingerId: number
      ) => {
        const leftFinger = leftHandCoords[currentFingerId];
        const rightFinger = rightHandCoords[currentFingerId];

        const bothInBounds =
          this.isWithinObjectBounds(rightFinger) &&
          this.isWithinObjectBounds(leftFinger);

        return {
          newPosePosition: {
            left: {
              ...results.newPosePosition?.left,
              [currentFingerId]: leftFinger,
            },
            right: {
              ...results.newPosePosition?.right,
              [currentFingerId]: rightFinger,
            },
          },
          isInBounds: results.isInBounds && bothInBounds,
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

      this.timer = startTimeoutInstance({
        onCompletion: () => {
          const [isInPlaceLeft, isInPlaceRight] = [HANDS.LEFT, HANDS.RIGHT].map(
            (hand: HANDS) => {
              if (this.posePosition && this.posePositionToMatch) {
                const diff = distanceBetweenPoints(
                  Object.values(this.posePositionToMatch[hand]),
                  Object.values(this.posePosition[hand])
                ).map((diff: any) => diff.euclideanDistance);

                return !containsValueLargerThanMax(
                  diff,
                  REFERENCE_POINT_BOUNDS
                );
              }
              return false;
            }
          );

          if (isInPlaceRight && isInPlaceLeft) {
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
        },
      });
    }
  }

  protected handleNewData(fingerData: ListenerProcessedFingerData): void {
    /**
     * NOTE: Don't use this.handsToTrack for emphasis as each hands needs to perform
     * the exact gesture we want so dominant and non dominant hand concept doesn't apply here
     */
    const rightHand = fingerData[HANDS.RIGHT];
    const leftHand = fingerData[HANDS.LEFT];

    if (!rightHand || !leftHand) {
      return;
    }

    this.handlePoseGesture(rightHand.fingerPositions, leftHand.fingerPositions);
  }
}
