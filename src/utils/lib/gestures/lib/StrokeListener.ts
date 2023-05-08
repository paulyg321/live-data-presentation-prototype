import { PlaybackSubjectType, HAND_LANDMARK_IDS } from "@/utils";
import { Affect, type Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  ListenerMode,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
  DEFAULT_TRIGGER_DURATION,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";

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
    canvasDimensions,
    mode,
    resetKeys,
    drawingUtils,
    strokeTriggerName = "radial",
    listenerMode = ListenerMode.STROKE,
    triggerDuration = DEFAULT_TRIGGER_DURATION,
    numHands = 1,
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
      mode,
      listenerMode,
      strokeTriggerName,
      triggerDuration,
      numHands,
    });
  }

  private convertDistanceToAffect(distance: number) {
    const radius = this.dimensions.width / 2;
    const oneThirdRadius = radius * (1 / 3);
    const twoThirdRadius = radius * (2 / 3);

    if (distance <= oneThirdRadius) return Affect.TENDERNESS;
    if (distance <= twoThirdRadius) return Affect.EXCITEMENT;
    return Affect.JOY;
  }

  private getCenterPoint(): Coordinate2D {
    return {
      x: this.position.x + this.dimensions.width / 2,
      y: this.position.y + this.dimensions.width / 2,
    };
  }

  renderBorder() {
    const centerPoint = this.getCenterPoint();
    this.drawingUtils?.modifyContextStyleAndDraw(
      {
        strokeStyle: "skyblue",
      },
      (context) => {
        this.drawingUtils?.drawCircle({
          coordinates: centerPoint,
          radius: this.dimensions.width / 2,
          stroke: true,
          context,
        });
      },
      ["preview", "presenter"]
    );
  }

  renderDetectionState() {
    if (!this.startDetecting) return;

    const centerPoint = this.getCenterPoint();
    this.drawingUtils.modifyContextStyleAndDraw(
      {
        strokeStyle: "#90EE90",
        opacity: 0.7,
      },
      (context) => {
        this.drawingUtils?.drawCircle({
          coordinates: centerPoint,
          radius: this.dimensions.width / 2,
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
        this.drawingUtils?.drawCircle({
          coordinates: centerPoint,
          radius:
            (this.dimensions.width / 2) * this.animationState.detectionExtent,
          fill: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
  }

  renderReferenceCircles() {
    const radius = this.dimensions.width / 2;
    const oneThirdRadius = radius * (1 / 3);
    const twoThirdRadius = radius * (2 / 3);

    const centerPoint = this.getCenterPoint();
    [oneThirdRadius, twoThirdRadius].forEach(
      (value: number) => {
        this.drawingUtils.modifyContextStyleAndDraw(
          {
            strokeStyle: "skyblue",
          },
          (context) => {
            this.drawingUtils.drawCircle({
              coordinates: centerPoint,
              radius: value,
              stroke: true,
              context,
            });
          }
        );
      },
      ["preview", "presenter"]
    );
  }

  resetHandler(): void {
    console.log("RESET - RADIAL");
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
          text: "Added new dialing playback gesture",
          variant: "success",
        });
      } else {
        const result = this.strokeRecognizer.recognize(this.stroke, false);
        if (result.name === this.strokeTriggerName) {
          let affect;

          if (this.strokeTriggerName === "radial") {
            this.stroke.forEach((point: Coordinate2D) => {
              GestureListener.circleFitter.addPoint(point.x, point.y);
            });
            const fit = GestureListener.circleFitter.compute();
            affect = this.convertDistanceToAffect(fit.radius);
          }

          this.publishToSubjectIfExists(GestureListener.playbackSubjectKey, {
            type: PlaybackSubjectType.CONTINUOUS,
            affect,
          });
          GestureListener.circleFitter.resetPoints();
        }
      }

      this.stroke = [];
    });
  }

  // Implemented to only track one finger and one hand
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
      this.stroke.push(indexFingerPosition);
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
  }
}
