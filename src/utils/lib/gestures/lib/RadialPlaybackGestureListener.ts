import {
  calculateDistance,
  DollarRecognizer,
  PlaybackSubjectType,
  startTimeoutInstance,
  startTimerInstance,
  getCircleFit,
  playbackSubject,
  snackbarSubject,
} from "@/utils";
import _ from "lodash";
import type { Subject } from "rxjs";
import { Affect, type Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";

const CIRCLEFIT = getCircleFit();

export enum RadialTrackerMode {
  NORMAL = "normal",
  TRACKING = "tracking",
}

export interface RadialPlaybackGestureListenerConstructorArgs
  extends GestureListenerConstructorArgs {
  mode: RadialTrackerMode;
  subjects?: Record<string, Subject<any>>;
}

export interface AnimationState {
  extent: number;
  isPlaying: boolean;
}

export class RadialPlaybackGestureListener extends GestureListener {
  private rotations = 0;
  private angleStack: number[] = [];
  private mode: RadialTrackerMode = RadialTrackerMode.NORMAL;
  private fingerDistance = 0;
  animationState: AnimationState = {
    extent: 0,
    isPlaying: false,
  };
  private currentAngle = 0;

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
  }: RadialPlaybackGestureListenerConstructorArgs) {
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
    });

    this.mode = mode;
  }

  updateState(
    args: Partial<GestureListenerConstructorArgs> & {
      animationState?: AnimationState;
      currentAngle?: number;
    }
  ) {
    const { animationState, currentAngle } = args;
    super.updateState(args);

    if (animationState) {
      this.animationState = animationState;
    }
    if (currentAngle) {
      this.currentAngle = currentAngle;
    }
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

  private calculateAngleFromCenter(position: Coordinate2D) {
    const centerPoint = this.getCenterPoint();
    const dx = centerPoint.x - position.x;
    const dy = centerPoint.y - position.y;

    let theta = Math.atan2(-dy, -dx);
    theta *= 180 / Math.PI;
    if (theta < 0) theta += 360;

    return theta;
  }

  private renderCurrentState() {
    if (this.animationState.isPlaying) return;
    const angle = this.currentAngle;
    const centerPoint = this.getCenterPoint();
    const endAngle = this.angleStack.length > 0 ? angle * (Math.PI / 180) : 0;
    this.drawingUtils?.modifyContextStyleAndDraw(
      {
        fillStyle: "#90EE90",
        opacity: 0.3,
      },
      (context) => {
        this.drawingUtils?.drawCircle({
          coordinates: centerPoint,
          radius: this.dimensions.width / 2,
          startAngle: 0,
          endAngle,
          fill: true,
          drawLineToCenter: true,
          context,
        });
      },
      ["preview", "presenter"]
    );
  }

  private handleNewAngle(theta: number, distanceBetweenFingers: number) {
    if (this.rotations >= 1 && this.mode === RadialTrackerMode.TRACKING) {
      this.publishToSubjectIfExists(
        RadialPlaybackGestureListener.playbackSubjectKey,
        {
          type: PlaybackSubjectType.DISCRETE,
          value: theta / 360,
        }
      );
    } else if (theta <= 90) {
      if (this.angleStack.length === 4) {
        this.rotations++;
        this.angleStack = [];
      }

      if (this.angleStack.length === 0) {
        this.angleStack.push(theta);

        // start timer to empty stack if no rotations are completed
        const isFirstRotation = this.rotations === 0;

        const executeAfterTimerEnds = () => {
          let duration = 8000;
          if (this.rotations === 2) {
            duration = 4000;
          } else if (this.rotations === 3) {
            duration = 2000;
          }
          if (this.rotations >= 1 && this.mode === RadialTrackerMode.NORMAL) {
            this.publishToSubjectIfExists(
              RadialPlaybackGestureListener.playbackSubjectKey,
              {
                type: PlaybackSubjectType.CONTINUOUS,
                value: (percentComplete: number) => {
                  if (percentComplete === 1) {
                    this.updateState({
                      animationState: {
                        isPlaying: false,
                        extent: 0,
                      },
                    });
                  } else {
                    this.updateState({
                      animationState: {
                        isPlaying: true,
                        extent: percentComplete,
                      },
                    });
                  }
                },
                affect: this.convertDistanceToAffect(this.fingerDistance),
                duration,
              }
            );
          }
          this.resetAngleState();
          this.timer?.stop();
          this.timer = undefined;
        };

        if (isFirstRotation) {
          this.timer?.stop();
          this.timer = undefined;
          this.timer = startTimerInstance({
            onCompletion: executeAfterTimerEnds,
            timeout: 3000,
          });
        }
      }
    } else if (theta <= 180 && theta > 90 && this.angleStack.length === 1) {
      this.angleStack.push(theta);
    } else if (theta <= 270 && theta > 180 && this.angleStack.length === 2) {
      this.angleStack.push(theta);
    } else if (theta <= 360 && theta > 270 && this.angleStack.length === 3) {
      this.angleStack.push(theta);
      this.fingerDistance = distanceBetweenFingers;
    }
  }

  private resetAngleState() {
    this.rotations = 0;
    this.angleStack = [];
  }

  setTrackingMode(mode: RadialTrackerMode) {
    this.mode = mode;
  }

  renderBorder() {
    if (this.animationState.isPlaying) return;

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
          radius: (this.dimensions.width / 2) * this.detectionExtent,
          fill: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
  }

  renderReferenceCircles() {
    if (this.animationState.isPlaying) return;

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
    this.resetAngleState();
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
        }

        this.strokeRecognizer.addGesture(this.gestureName, this.stroke);
        this.publishToSubjectIfExists(GestureListener.snackbarSubjectKey, {
          open: true,
          text: "Added new dialing playback gesture",
          variant: "success",
        });
      } else {
        const result = this.strokeRecognizer.recognize(this.stroke, false);
        if (result.name === "radial") {
          this.stroke.forEach((point: Coordinate2D) => {
            CIRCLEFIT.addPoint(point.x, point.y);
          });
          const fit = CIRCLEFIT.compute();
          const affect = this.convertDistanceToAffect(fit.radius);

          this.publishToSubjectIfExists(GestureListener.playbackSubjectKey, {
            type: PlaybackSubjectType.CONTINUOUS,
            affect,
            duration: 3000,
          });
          CIRCLEFIT.resetPoints();
        }
      }

      this.stroke = [];
    });
  }

  // Implemented to only track one finger and one hand
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

    const [indexFinger] = dominantHand.fingersToTrack;
    const indexFingerPosition = dominantHand.fingerPositions[
      indexFinger
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
      RadialPlaybackGestureListener.playbackSubjectKey,
      undefined
    );
  }

  draw() {
    this.renderCurrentState();
    this.renderBorder();
    this.renderStrokePath();
    this.renderReferenceCircles();
    this.renderDetectionState();
  }
}
