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
  static playbackSubjectKey = "playbackSubject";
  static snackbarSubjectKey = "snackbarSubject";

  private rotations = 0;
  private angleStack: number[] = [];
  private mode: RadialTrackerMode = RadialTrackerMode.NORMAL;
  private fingerDistance = 0;
  animationState: AnimationState = {
    extent: 0,
    isPlaying: false,
  };
  private currentAngle = 0;
  private strokeRecognizer: DollarRecognizer;
  private stroke: Coordinate2D[] = [];

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
      subjects: {
        [RadialPlaybackGestureListener.playbackSubjectKey]: playbackSubject,
        [RadialPlaybackGestureListener.snackbarSubjectKey]: snackbarSubject,
      },
      drawingUtils,
    });

    this.mode = mode;
    this.strokeRecognizer = new DollarRecognizer();
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

  private renderCenterPoint() {
    if (this.animationState.isPlaying) return;

    const centerPoint = this.getCenterPoint();
    const fontSize = 40;
    this.drawingUtils?.modifyContextStyleAndDraw(
      {
        fillStyle: "skyblue",
        fontSize,
      },
      (context) => {
        this.drawingUtils?.drawText({
          coordinates: centerPoint,
          text: this.rotations.toString(),
          xScale: (value: number) => {
            return value - fontSize / 4;
          },
          yScale: (value: number) => {
            return value + fontSize / 4;
          },
          context,
        });
      },
      ["preview", "presenter"]
    );
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

  private renderAnimationContext() {
    if (!this.animationState.isPlaying) return;
    const centerPoint = this.getCenterPoint();
    const endAngle = 2 * Math.PI * this.animationState.extent;
    this.drawingUtils?.modifyContextStyleAndDraw(
      {
        strokeStyle: "#90EE90",
        opacity: 0.3,
        lineWidth: 10,
      },
      (context) => {
        this.drawingUtils?.drawCircle({
          coordinates: centerPoint,
          radius: this.dimensions.width / 2,
          startAngle: 0,
          endAngle,
          stroke: true,
          drawLineToCenter: true,
          context,
        });
      },
      ["presenter", "preview"]
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

  renderStrokePath() {
    this.stroke.forEach((stroke) => {
      this.drawingUtils.modifyContextStyleAndDraw(
        {
          // fillStyle: "orange",
          // opacity: 0.4,
        },
        (context) => {
          this.drawingUtils.drawCircle({
            coordinates: stroke,
            radius: 3,
            context,
            fill: true,
          });
        }
      );
    });
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

  // Implemented to only track one finger and one hand
  protected handleNewData(
    fingerData: ListenerProcessedFingerData,
    handCount: number
  ): void {
    const dominantHand = fingerData[this.handsToTrack.dominant];
    const isPinch = this.isPinchGesture(
      fingerData,
      this.handsToTrack.nonDominant
    );

    if (!dominantHand) return;

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

    if (isInBounds && isPinch) {
      this.stroke.push(indexFingerPosition);
    } else if (!isPinch) {
      if (this.stroke.length < 5) return;

      if (this.addGesture) {
        this.strokeRecognizer.addGesture("radial", this.stroke);
        this.publishToSubjectIfExists(
          RadialPlaybackGestureListener.snackbarSubjectKey,
          {
            open: true,
            text: "Added new dialing gesture",
            variant: "success",
          }
        );
      } else {
        const result = this.strokeRecognizer.recognize(this.stroke, false);
        if (result.name === "radial") {
          this.stroke.forEach((point: Coordinate2D) => {
            CIRCLEFIT.addPoint(point.x, point.y);
          });
          const fit = CIRCLEFIT.compute();
          const affect = this.convertDistanceToAffect(fit.radius);

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
              affect,
              duration: 3000,
            }
          );
          CIRCLEFIT.resetPoints();
        }
      }

      this.stroke = [];
    }
  }

  cancelAnimation() {
    this.publishToSubjectIfExists(
      RadialPlaybackGestureListener.playbackSubjectKey,
      undefined
    );
    this.updateState({
      animationState: {
        isPlaying: false,
        extent: 0,
      },
    });
  }

  draw() {
    this.renderCenterPoint();
    this.renderCurrentState();
    this.renderBorder();
    this.renderAnimationContext();
    this.renderStrokePath();
    this.renderReferenceCircles();
  }
}
