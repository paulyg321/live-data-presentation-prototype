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
  SupportedGestures,
  AffectOptions,
  ListenerMode,
} from "@/utils";

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
    trackedFingers = [
      HAND_LANDMARK_IDS.index_finger_tip,
      HAND_LANDMARK_IDS.thumb_tip,
    ],
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
      animationState,
      poseDuration,
      resetPauseDuration,
      numHands,
      trackedFingers,
    });
  }

  private getRectDataFromState() {
    const rightThumb =
      this.state.posePosition?.right[HAND_LANDMARK_IDS.thumb_tip];
    const leftIndex =
      this.state.posePosition?.left[HAND_LANDMARK_IDS.index_finger_tip];

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
    this.state.posePosition = undefined;
    this.state.posePositionToMatch = undefined;
  }

  private drawPoseState() {
    // DRAW REFERENCE POINTS
    [HANDS.LEFT, HANDS.RIGHT].forEach((hand: HANDS) => {
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

  private handlePoseGesture(
    rightHandCoords: Coordinate2D[],
    leftHandCoords: Coordinate2D[]
  ) {
    const { newPosePosition, isInBounds } = this.state.trackedFingers.reduce(
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
      this.state.posePosition = newPosePosition;

      if (this.state.timer) return;
      this.state.posePositionToMatch = newPosePosition;

      this.state.timer = startTimeoutInstance({
        onCompletion: () => {
          const [isInPlaceLeft, isInPlaceRight] = [HANDS.LEFT, HANDS.RIGHT].map(
            (hand: HANDS) => {
              if (this.state.posePosition && this.state.posePositionToMatch) {
                const diff = distanceBetweenPoints(
                  Object.values(this.state.posePositionToMatch[hand]),
                  Object.values(this.state.posePosition[hand])
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
            const bounds = this.state.useBounds
              ? this.getRectDataFromState()
              : undefined;
            this.publishToSubject(bounds, AffectOptions.NEUTRAL);
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

  draw() {
    this.renderBorder();
    if (this.state.timer) {
      this.drawPoseState();
    }
  }
}
