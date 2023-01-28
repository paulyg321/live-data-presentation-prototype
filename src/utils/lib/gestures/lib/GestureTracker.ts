import fp from "fingerpose";
import type { Results } from "@mediapipe/hands";
import {
  getLeftVsRightIndex,
  getLandmarksPerHand,
  pointingGesture,
  openHandGesture,
} from "@/utils";
import { Subject } from "rxjs";

export class GestureTracker {
  private gestureEstimatorInstance: any;
  private canvasDimensions: { width: number; height: number };
  gestureSubject: Subject<any>;

  constructor({
    canvasDimensions,
  }: {
    canvasDimensions: { width: number; height: number };
  }) {
    this.canvasDimensions = canvasDimensions;
    this.gestureEstimatorInstance = new fp.GestureEstimator([
      // HAVE THESE PASSED AS CONSTRUCTOR ARGS
      pointingGesture,
      openHandGesture,
    ]);
    this.gestureSubject = new Subject();
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
        multiHandLandmarks[handIndices.left].map(
          (point: { x: number; y: number; z: number }) => {
            // BECAUSE VIDEO IS MIRRORED WE MIRROR THE X Value
            return [-point.x, point.y, point.z];
          }
        ),
        8.5
      );
    }

    if (handIndices.right != undefined) {
      rightHandGestures = this.gestureEstimatorInstance.estimate(
        multiHandLandmarks[handIndices.right].map(
          (point: { x: number; y: number; z: number }) => {
            // BECAUSE VIDEO IS MIRRORED WE MIRROR THE X Value
            return [-point.x, point.y, point.z];
          }
        ),
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
