import { Subject } from "rxjs";
import type { Coordinate2D } from "../../chart";
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
  gestureTypes: {
    rightHand: SupportedGestures;
    leftHand: SupportedGestures;
  }[];
}

export class RadialPlaybackGestureListener extends GestureListener {
  private rotations = 0;
  private angleStack: number[] = [];
  private mode: RadialTrackerMode = RadialTrackerMode.NORMAL;
  subjects: GestureListenerSubjectMap = {
    trackingSubject: new Subject(),
    playback: new Subject(),
  };

  constructor({
    position,
    size,
    handsToTrack = [HANDS.RIGHT],
    gestureTypes = [
      {
        rightHand: SupportedGestures.POINTING,
        leftHand: SupportedGestures.POINTING,
      },
    ],
  }: RadialPlaybackGestureListenerConstructorArgs) {
    super({
      position,
      size,
      handsToTrack,
    });

    this.gestureTypes = gestureTypes;
  }

  private getCenterPoint(): Coordinate2D {
    return {
      x: this.position.x + this.size.width / 2,
      y: this.position.y + this.size.height / 2,
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

  setTrackingMode(mode: RadialTrackerMode) {
    this.mode = mode;
  }

  resetAngleState() {
    this.rotations = 0;
    this.angleStack = [];
  }

  private handleNewAngle(theta: number) {
    if (this.rotations >= 1 && this.mode === RadialTrackerMode.TRACKING) {
      this.subjects.trackingSubject.next(theta / 360);
      return;
    }

    if (theta <= 90 && this.angleStack.length === 0) {
      this.angleStack.push(theta);

      // start timer to empty stack if no rotations are completed
      const isFirstRotation = this.rotations === 0;

      const executeAfterTimerEnds = () => {
        if (this.rotations >= 1 && this.mode === RadialTrackerMode.NORMAL) {
          this.subjects.playbackSubject.next(true);
        }
        this.resetAngleState();
      };

      if (isFirstRotation) {
        this.timer = this.startTimerInstance({
          execute: {
            onCompletion: executeAfterTimerEnds,
          },
          timeout: 2000,
        });
      }
    } else if (theta <= 180 && theta > 90 && this.angleStack.length === 1) {
      this.angleStack.push(theta);
    } else if (theta <= 270 && theta > 180 && this.angleStack.length === 2) {
      this.angleStack.push(theta);
    } else if (theta <= 360 && theta > 270 && this.angleStack.length === 3) {
      this.angleStack.push(theta);
      this.rotations++;
      this.angleStack = [];
    }
  }

  // Implemented to only track one finger and one hand
  handleNewData(fingerData: {
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
      }
    }
  }
}
