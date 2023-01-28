import * as d3 from "d3";
import { Subject } from "rxjs";

enum MotionTrackerMode {
  NORMAL = "normal",
  TRACKING = "tracking",
}

export class MotionAndPositionTracker {
  private position: { x: number; y: number };
  private size: { width: number; height: number };
  private centerPoint: { x: number; y: number };
  rotations = 0;
  angleStack: number[] = [];
  private timer: d3.Timer | undefined = undefined;
  private mode: MotionTrackerMode = MotionTrackerMode.NORMAL;
  trackingSubject: Subject<any>;
  playbackSubject: Subject<any>;

  constructor({
    position,
    size,
  }: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  }) {
    this.position = position;
    this.size = size;
    this.centerPoint = {
      x: position.x + size.width / 2,
      y: position.y + size.height / 2,
    };
    this.trackingSubject = new Subject();
    this.playbackSubject = new Subject();
  }

  isInTrackingArea(position: { x: number; y: number }) {
    const { x: minX, y: minY } = this.position;
    const { maxX, maxY } = {
      maxX: this.position.x + this.size.width,
      maxY: this.position.y + this.size.height,
    };

    if (
      position.x > minX &&
      position.x < maxX &&
      position.y > minY &&
      position.y < maxY
    ) {
      return {
        canTrack: true,
        trackingValue: this.calculateLinearTrackingPercentage(position),
      };
    }

    return {
      canTrack: false,
      trackingValue: undefined,
    };
  }

  calculateLinearTrackingPercentage(position: { x: number; y: number }) {
    const { x: minX } = this.position;

    return (position.x - minX) / this.size.width;
  }

  // TODO: track the angles and count revolutions
  // A revolution is - [fill a stack with 0, 90, 180 and 360] in order, the stack clears after a second.
  // If a full revolution is made before the end of a d3.timmer sequence then we play the animation
  // if a full revolution is made before the end of d3.timer but a second revolution is started, switch to tracking
  calculateAngleFromCenter(position: { x: number; y: number }) {
    const { canTrack } = this.isInTrackingArea(position);

    if (canTrack) {
      const dx = this.centerPoint.x - position.x;
      const dy = this.centerPoint.y - position.y;

      let theta = Math.atan2(-dy, -dx);
      theta *= 180 / Math.PI;
      if (theta < 0) theta += 360;

      this.handleNewAngle(theta);
      return theta;
    }
    return undefined;
  }

  renderCenterPoint({ ctx }: { ctx: CanvasRenderingContext2D }) {
    ctx.beginPath();
    ctx.fillStyle = "red";
    ctx.arc(this.centerPoint.x, this.centerPoint.y, 5, 0, 2 * Math.PI, false);
    ctx.fill();
  }

  handleNewAngle(theta: number) {
    if (this.rotations >= 1 && this.mode === MotionTrackerMode.TRACKING) {
      this.trackingSubject.next(theta / 360);
    } else if (theta <= 90 && this.angleStack.length === 0) {
      this.angleStack.push(theta);
      // start timer to empty stack if no rotations are completed
      if (this.rotations === 0) {
        this.timer = d3.timer((elapsed) => {
          const boundedTimeStep = Math.min(elapsed / 3000, 1);
          if (boundedTimeStep === 1) {
            if (this.rotations === 0) {
              this.angleStack = [];
            } else if (this.rotations === 1) {
              this.mode = MotionTrackerMode.TRACKING;
              this.angleStack = [];
            } else {
              this.playbackSubject.next(true);
            }
            this.timer?.stop();
          }
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
}
