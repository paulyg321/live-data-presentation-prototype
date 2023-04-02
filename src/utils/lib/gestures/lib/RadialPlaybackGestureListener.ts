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

export class RadialPlaybackGestureListener extends GestureListener {
  static playbackSubjectKey = "playbackSubject";

  private rotations = 0;
  private angleStack: number[] = [];
  private mode: RadialTrackerMode = RadialTrackerMode.NORMAL;
  private fingerDistance = 0;

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
  }: RadialPlaybackGestureListenerConstructorArgs) {
    super({
      position,
      dimensions,
      handsToTrack,
      gestureTypes,
      gestureSubject,
      canvasDimensions,
      resetKeys,
      subjects,
    });

    this.mode = mode;
  }

  private convertDistanceToAffect(distance: number) {
    if (distance <= 40) return Affect.TENDERNESS;
    if (distance > 40 && distance < 100) return Affect.EXCITEMENT;
    return Affect.JOY;
  }

  private getCenterPoint(): Coordinate2D {
    return {
      x: this.position.x + this.dimensions.width / 2,
      y: this.position.y + this.dimensions.height / 2,
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
    const centerPoint = this.getCenterPoint();
    const fontSize = 40;
    if (this.context) {
      this.drawingUtils?.modifyContextStyleAndDraw(
        {
          fillStyle: "skyblue",
          fontSize,
        },
        () => {
          this.drawingUtils?.drawText({
            coordinates: centerPoint,
            text: this.rotations.toString(),
            xScale: (value: number) => {
              return value - fontSize / 4;
            },
            yScale: (value: number) => {
              return value + fontSize / 4;
            },
          });
        }
      );
    }
  }

  private renderCurrentState(angle: number) {
    const centerPoint = this.getCenterPoint();
    const endAngle = this.angleStack.length > 0 ? angle * (Math.PI / 180) : 0;
    if (this.context) {
      this.renderReferencePoints();
      this.drawingUtils?.modifyContextStyleAndDraw(
        {
          fillStyle: "#90EE90",
          opacity: 0.3,
        },
        () => {
          this.drawingUtils?.drawCircle({
            coordinates: centerPoint,
            radius: this.dimensions.width / 2,
            startAngle: 0,
            endAngle,
            fill: true,
            drawLineToCenter: true,
          });
        }
      );
    }
  }

  private renderAnimationContext(percentComplete: number) {
    const centerPoint = this.getCenterPoint();
    const endAngle = 2 * Math.PI * percentComplete;
    if (this.context) {
      if (percentComplete === 1) {
        this.renderReferencePoints();
      } else {
        this.clearCanvas();
        this.drawingUtils?.modifyContextStyleAndDraw(
          {
            strokeStyle: "#90EE90",
            opacity: 0.3,
            lineWidth: 10,
          },
          () => {
            this.drawingUtils?.drawCircle({
              coordinates: centerPoint,
              radius: this.dimensions.width / 2,
              startAngle: 0,
              endAngle,
              stroke: true,
              drawLineToCenter: true,
            });
          }
        );
      }
    }
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
                  this.renderAnimationContext(percentComplete),
                affect: this.convertDistanceToAffect(this.fingerDistance),
                duration,
              }
            );
            this.resetAngleState();
          }
          this.timer?.stop();
          this.timer = undefined;
        };

        if (isFirstRotation) {
          this.timer?.stop();
          this.timer = undefined;
          this.timer = startTimerInstance({
            // onTick: (timestep?: number) => {
            //   if (!timestep) return;
            //   this.renderCurrentState(theta);
            //   const centerPoint = this.getCenterPoint();
            //   this.drawingUtils?.modifyContextStyleAndDraw(
            //     {
            //       fillStyle: "red",
            //       opacity: 0.1,
            //     },
            //     () => {
            //       this.drawingUtils?.drawCircle({
            //         context: this.context,
            //         coordinates: centerPoint,
            //         radius: (this.dimensions.width / 2) * timestep,
            //         fill: true,
            //       });
            //     }
            //   );
            // },
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

  private clearAllVisualIndicators() {
    this.renderReferencePoints(true);
  }

  setTrackingMode(mode: RadialTrackerMode) {
    this.mode = mode;
  }

  renderBorder() {
    const centerPoint = this.getCenterPoint();
    if (this.context) {
      this.drawingUtils?.modifyContextStyleAndDraw(
        {
          strokeStyle: "skyblue",
        },
        () => {
          this.drawingUtils?.drawCircle({
            context: this.context,
            coordinates: centerPoint,
            radius: this.dimensions.width / 2,
            stroke: true,
          });
        }
      );
    }
  }

  renderReferencePoints(clear = true) {
    if (this.context) {
      if (clear) {
        this.clearCanvas();
      }
      this.renderCenterPoint();
      this.renderBorder();
    }
  }

  resetHandler(): void {
    this.resetAngleState();
    this.renderReferencePoints(true);
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
      this.publishToSubjectIfExists(
        RadialPlaybackGestureListener.playbackSubjectKey,
        undefined
      );
      const angle = this.calculateAngleFromCenter(indexFingerPosition);
      this.handleNewAngle(angle, distanceBetweenFingers);
      this.renderCurrentState(angle);
    }
    // else {
    //   this.resetAngleState();
    //   this.clearAllVisualIndicators();
    // }
  }
}
