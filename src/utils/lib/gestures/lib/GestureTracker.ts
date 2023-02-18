import fp from "fingerpose";
import type { Results } from "@mediapipe/hands";
import {
  getLeftVsRightIndex,
  getLandmarksPerHand,
  type Coordinate3D,
  type Dimensions,
  foreshadowingLeftC,
  foreshadowingLeftL,
  foreshadowingRightC,
  foreshadowingRightL,
  openHandGesture,
  pointingGesture,
} from "@/utils";
import { Subject } from "rxjs";

export interface GestureTrackerValues {
  leftHandLandmarks: any;
  rightHandLandmarks: any;
  rightHandGestures: any;
  leftHandGestures: any;
}

export class GestureTracker {
  private gestureEstimatorInstance: any;
  private canvasDimensions: Dimensions;
  gestureSubject: Subject<any>;

  constructor({
    canvasDimensions,
    gestures = [
      pointingGesture,
      openHandGesture,
      foreshadowingLeftL,
      foreshadowingRightL,
      foreshadowingLeftC,
      foreshadowingRightC,
    ],
  }: {
    canvasDimensions: Dimensions;
    gestures?: any;
  }) {
    this.canvasDimensions = canvasDimensions;
    this.gestureEstimatorInstance = new fp.GestureEstimator(gestures);
    this.gestureSubject = new Subject<any>();
  }

  changeCanvasDimensions(canvasDimensions: Dimensions) {
    this.canvasDimensions = canvasDimensions;
  }

  async handleMediaPipeResults(results: Results) {
    let leftHandGestures;
    let rightHandGestures;
    const { multiHandLandmarks, multiHandedness } = results;
    const handIndices = getLeftVsRightIndex(multiHandedness);
    const { leftHandLandmarks, rightHandLandmarks } = getLandmarksPerHand(
      this.canvasDimensions,
      multiHandLandmarks,
      handIndices
    );

    if (handIndices.left != undefined) {
      leftHandGestures = this.gestureEstimatorInstance.estimate(
        multiHandLandmarks[handIndices.left].map((point: Coordinate3D) => {
          // BECAUSE VIDEO IS MIRRORED WE MIRROR THE X Value
          return [-point.x, point.y, point.z];
        }),
        8.5
      );
    }

    if (handIndices.right != undefined) {
      rightHandGestures = this.gestureEstimatorInstance.estimate(
        multiHandLandmarks[handIndices.right].map((point: Coordinate3D) => {
          // BECAUSE VIDEO IS MIRRORED WE MIRROR THE X Value
          return [-point.x, point.y, point.z];
        }),
        8.5
      );
    }

    this.gestureSubject.next({
      rightHandGestures,
      leftHandGestures,
      leftHandLandmarks,
      rightHandLandmarks,
    });
  }
}
