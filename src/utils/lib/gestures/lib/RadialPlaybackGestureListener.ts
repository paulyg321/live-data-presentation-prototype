import _ from "lodash";
import { Subject } from "rxjs";
import type { Coordinate2D } from "../../chart";
import { clearArea, drawCircle, drawLine, drawText } from "../../drawing";
import { HANDS } from "./gesture-utils";
import {
  GestureListener,
  type GestureListenerConstructorArgs,
  type GestureListenerSubjectMap,
  type ProcessedGestureListenerFingerData,
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
  static discreteTrackingSubjectKey = "discreteTrackingSubject";
  static continuousTrackingSubjectKey = "continuousTrackingSubject";

  private rotations = 0;
  private angleStack: number[] = [];
  private mode: RadialTrackerMode = RadialTrackerMode.NORMAL;
  subjects: GestureListenerSubjectMap = {
    [RadialPlaybackGestureListener.discreteTrackingSubjectKey]: new Subject(),
    [RadialPlaybackGestureListener.continuousTrackingSubjectKey]: new Subject(),
  };

  constructor({
    position,
    dimensions,
    handsToTrack = [HANDS.RIGHT],
    gestureTypes = [
      {
        rightHand: SupportedGestures.POINTING,
        leftHand: SupportedGestures.POINTING,
      },
    ],
    gestureSubject,
    canvasDimensions,
    mode,
  }: RadialPlaybackGestureListenerConstructorArgs) {
    super({
      position,
      dimensions,
      handsToTrack,
      gestureTypes,
      gestureSubject,
      canvasDimensions,
    });

    this.mode = mode;
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

  // ----------------- INTERACTIONS WITH CANVAS ----------------------
  private renderState() {
    // TODO: Use this to render visual indicators
  }

  private renderCenterPoint() {
    const centerPoint = this.getCenterPoint();
    const fontSize = 60;
    if (this.context) {
      drawText({
        context: this.context,
        coordinates: centerPoint,
        text: this.rotations.toString(),
        fillStyle: "skyblue",
        fontSize,
        xScale: (value: number) => {
          return value - fontSize / 4;
        },
        yScale: (value: number) => {
          return value + fontSize / 4;
        },
      });
    }
  }

  private renderReferenceLine(fingerPosition: Coordinate2D, angle: number) {
    const centerPoint = this.getCenterPoint();
    const endAngle = this.angleStack.length > 0 ? angle * (Math.PI / 180) : 0;
    if (this.context) {
      this.renderReferencePoints();
      drawLine({
        context: this.context,
        startCoordinates: centerPoint,
        endCoordinates: fingerPosition,
        strokeStyle: "skyblue",
      });
      drawCircle({
        context: this.context,
        coordinates: centerPoint,
        radius: this.dimensions.width / 2,
        startAngle: 0,
        endAngle,
        fill: true,
        fillStyle: "#90EE90",
        drawLineToCenter: true,
        opacity: 0.3,
      });
    }
  }

  setTrackingMode(mode: RadialTrackerMode) {
    this.mode = mode;
  }

  resetAngleState() {
    this.rotations = 0;
    this.angleStack = [];
  }

  private handleNewAngle(theta: number) {
    if (this.rotations >= 1 && this.mode === RadialTrackerMode.TRACKING) {
      this.subjects[
        RadialPlaybackGestureListener.discreteTrackingSubjectKey
      ].next(theta / 360);
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
          if (this.rotations >= 1 && this.mode === RadialTrackerMode.NORMAL) {
            this.subjects[
              RadialPlaybackGestureListener.continuousTrackingSubjectKey
            ].next(true);
            this.resetAngleState();
          }
          this.timer = undefined;
        };

        if (isFirstRotation) {
          this.timer = this.startTimeoutInstance({
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
    }
  }

  // Implemented to only track one finger and one hand
  protected handleNewData(fingerData: {
    left?: ProcessedGestureListenerFingerData;
    right?: ProcessedGestureListenerFingerData;
  }): void {
    let dominantHand;

    if (fingerData.left) {
      dominantHand = fingerData.left;
    } else if (fingerData.right) {
      dominantHand = fingerData.right;
    }

    if (dominantHand) {
      const [fingerToTrack] = dominantHand.fingersToTrack;
      const fingerPosition = dominantHand.fingerPositions[
        fingerToTrack
      ] as Coordinate2D;

      if (fingerPosition.x === undefined || fingerPosition.y === undefined) {
        return;
      }

      const canEmit = this.isWithinObjectBounds(fingerPosition);

      if (canEmit) {
        const angle = this.calculateAngleFromCenter(fingerPosition);
        this.handleNewAngle(angle);
        this.renderReferenceLine(fingerPosition, angle);
      } else {
        this.resetAngleState();
        this.renderReferencePoints();
      }
    }
  }

  renderBorder() {
    const centerPoint = this.getCenterPoint();
    if (this.context) {
      drawCircle({
        context: this.context,
        coordinates: centerPoint,
        radius: this.dimensions.width / 2,
        strokeStyle: "skyblue",
        stroke: true,
      });
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
}
