import {
  calculateDistance,
  PlaybackSubjectType,
  startTimeoutInstance,
  startTimerInstance,
} from "@/utils";
import _ from "lodash";
import { Affect, type Coordinate2D } from "../../chart";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type ListenerProcessedFingerData,
} from "./GestureListener";
import { SupportedGestures } from "./handGestures";

export enum RadialTrackerMode {
  NORMAL = "normal",
  TRACKING = "tracking",
}

export interface RadialPlaybackGestureListenerConstructorArgs
  extends GestureListenerConstructorArgs {
  mode: RadialTrackerMode;
}

export interface AnimationState {
  extent: number;
  isPlaying: boolean;
}

export class RadialPlaybackGestureListener extends GestureListener {
  static playbackSubjectKey = "playbackSubject";

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
    gestureSubject,
    canvasDimensions,
    mode,
    resetKeys,
    subjects,
    drawingUtils
  }: RadialPlaybackGestureListenerConstructorArgs) {
    super({
      position,
      dimensions: {
        width: dimensions.width,
        height: dimensions.width,
      },
      handsToTrack,
      gestureTypes,
      gestureSubject,
      canvasDimensions,
      resetKeys,
      subjects,
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
    if (distance <= 40) return Affect.TENDERNESS;
    if (distance > 40 && distance < 100) return Affect.EXCITEMENT;
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
          context
        });
      }
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
          context
        });
      }
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
          context
        });
      }
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
                value: (percentComplete: number) =>
                  this.updateState({
                    animationState: {
                      isPlaying: true,
                      extent: percentComplete,
                    },
                  }),
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
          context
        });
      }
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
    let distanceBetweenFingers = 0;
    // const nonDominantHand = fingerData[this.handsToTrack.nonDominant];

    // Don't want non dominant hand in the frame
    if (!dominantHand || handCount === 2) {
      return;
    }

    const [indexFinger, thumb] = dominantHand.fingersToTrack;
    const indexFingerPosition = dominantHand.fingerPositions[
      indexFinger
    ] as Coordinate2D;
    const thumbPosition = dominantHand.fingerPositions[thumb] as Coordinate2D;

    if (
      indexFingerPosition.x === undefined ||
      indexFingerPosition.y === undefined
    ) {
      return;
    }

    if (thumbPosition) {
      ({ euclideanDistance: distanceBetweenFingers } = calculateDistance(
        indexFingerPosition,
        thumbPosition
      ));

      this.convertDistanceToAffect(distanceBetweenFingers);
    }

    const canEmit = this.isWithinObjectBounds(indexFingerPosition);

    if (canEmit) {
      // CANCEL THE ANIMATION

      const angle = this.calculateAngleFromCenter(indexFingerPosition);
      this.currentAngle = angle;
      this.handleNewAngle(angle, distanceBetweenFingers);
    }
    // else {
    //   this.resetAngleState();
    //   this.clearAllVisualIndicators();
    // }
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
  }
}
