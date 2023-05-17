import {
  HAND_LANDMARK_IDS,
  type Coordinate2D,
  HANDS,
  GestureListener,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
  SupportedGestures,
  DEFAULT_TRIGGER_DURATION,
  AffectOptions,
  ListenerMode,
} from "@/utils";

export type StrokeListenerConstructorArgs = GestureListenerConstructorArgs;

export class StrokeListener extends GestureListener {
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
    trackedFingers = [HAND_LANDMARK_IDS.index_finger_tip],
    canvasDimensions,
    resetKeys,
    drawingUtils,
    strokeTriggerName = "radial",
    triggerDuration = DEFAULT_TRIGGER_DURATION,
    numHands = 1,
    ...rest
  }: StrokeListenerConstructorArgs) {
    super({
      position,
      dimensions: {
        width: dimensions.width,
        height: dimensions.width,
      },
      handsToTrack,
      gestureTypes,
      canvasDimensions,
      resetKeys,
      drawingUtils,
      strokeTriggerName,
      triggerDuration,
      numHands,
      trackedFingers,
      ...rest,
    });
  }

  private convertDistanceToAffect(distance: number) {
    const radius = this.state.dimensions.width / 2;
    const oneThirdRadius = radius * (1 / 3);
    const twoThirdRadius = radius * (2 / 3);

    if (distance <= oneThirdRadius) return AffectOptions.NEGATIVE;
    if (distance <= twoThirdRadius) return AffectOptions.NEUTRAL;
    return AffectOptions.POSITIVE;
  }

  private getCenterPoint(): Coordinate2D {
    return {
      x: this.state.position.x + this.state.dimensions.width / 2,
      y: this.state.position.y + this.state.dimensions.width / 2,
    };
  }

  renderBorder() {
    const centerPoint = this.getCenterPoint();
    this.state.drawingUtils?.modifyContextStyleAndDraw(
      {
        strokeStyle: "skyblue",
      },
      (context) => {
        this.state.drawingUtils?.drawCircle({
          coordinates: centerPoint,
          radius: this.state.dimensions.width / 2,
          stroke: true,
          context,
        });
      },
      ["preview", "presenter"]
    );
  }

  renderDetectionState() {
    if (!this.state.startDetecting) return;

    const centerPoint = this.getCenterPoint();
    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        strokeStyle: "#90EE90",
        opacity: 0.7,
      },
      (context) => {
        this.state.drawingUtils?.drawCircle({
          coordinates: centerPoint,
          radius: this.state.dimensions.width / 2,
          stroke: true,
          context,
        });
      },
      ["presenter", "preview"]
    );

    this.state.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: "#90EE90",
        opacity: 0.3,
      },
      (context) => {
        this.state.drawingUtils?.drawCircle({
          coordinates: centerPoint,
          radius:
            (this.state.dimensions.width / 2) *
            this.state.animationState.detectionExtent,
          fill: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
  }

  renderReferenceCircles() {
    const radius = this.state.dimensions.width / 2;
    const oneThirdRadius = radius * (1 / 3);
    const twoThirdRadius = radius * (2 / 3);

    const centerPoint = this.getCenterPoint();
    [oneThirdRadius, twoThirdRadius].forEach((value: number) => {
      this.state.drawingUtils.modifyContextStyleAndDraw(
        {
          strokeStyle: "skyblue",
        },
        (context) => {
          this.state.drawingUtils.drawCircle({
            coordinates: centerPoint,
            radius: value,
            stroke: true,
            context,
          });
        },
        ["preview", "presenter"]
      );
    });
  }

  resetHandler(): void {
    console.log("RESET - RADIAL");
  }

  handleTrigger() {
    if (this.state.detectionTimer) return;
    this.triggerDetection(() => {
      if (this.state.stroke.length < 5) {
        this.state.stroke = [];
        return;
      }

      if (this.state.addGesture) {
        if (!this.state.gestureName) {
          this.state.stroke = [];
          return;
        }

        this.state.strokeRecognizer.addGesture(
          this.state.gestureName,
          this.state.stroke
        );
        this.publishToSubjectIfExists(GestureListener.snackbarSubjectKey, {
          open: true,
          text: "Added new dialing playback gesture",
          variant: "success",
        });
      } else {
        const result = this.state.strokeRecognizer.recognize(
          this.state.stroke,
          false
        );
        if (result.name === this.state.strokeTriggerName) {
          let affect;

          if (this.state.strokeTriggerName === "radial") {
            this.state.stroke.forEach((point: Coordinate2D) => {
              GestureListener.circleFitter.addPoint(point.x, point.y);
            });
            const fit = GestureListener.circleFitter.compute();
            affect = this.convertDistanceToAffect(fit.radius);
          }

          this.publishToSubject(undefined, affect);
          GestureListener.circleFitter.resetPoints();
        }
      }

      this.state.stroke = [];
    });
  }

  // Implemented to only track one finger and one hand
  protected handleNewData(fingerData: ListenerProcessedFingerData): void {
    const dominantHand = fingerData[this.state.handsToTrack.dominant];
    const trigger = this.thumbsTouch(fingerData);

    if (trigger) {
      this.handleTrigger();
      return;
    }

    if (!dominantHand || !this.state.startDetecting) {
      return;
    }
    const indexFingerPosition = dominantHand.fingerPositions[
      HAND_LANDMARK_IDS.index_finger_tip
    ] as Coordinate2D;

    if (
      indexFingerPosition.x === undefined ||
      indexFingerPosition.y === undefined
    )
      return;

    const isInBounds = this.isWithinObjectBounds(indexFingerPosition);

    if (isInBounds) {
      this.state.stroke.push(indexFingerPosition);
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
    this.renderReferenceCircles();
    this.renderDetectionState();
    if (this.state.listenerMode === ListenerMode.KEYFRAME) {
      this.renderKeyframe();
    }
  }
}
