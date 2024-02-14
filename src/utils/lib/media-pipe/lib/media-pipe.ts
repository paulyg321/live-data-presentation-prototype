import type { Handedness } from "@mediapipe/hands";
import type { Dimensions } from "@/utils";

export function mirrorLandmarkHorizontally(
  width: number,
  horizontalPosition: number
) {
  return width - horizontalPosition;
}

export function getLeftVsRightIndex(multiHandedness: Handedness[]) {
  return {
    right: multiHandedness.reduce(
      (rightHandIndex: number | undefined, handedness, index) => {
        if (handedness.label === "Left") {
          return index;
        }
        return rightHandIndex;
      },
      undefined
    ),
    left: multiHandedness.reduce(
      (leftHandIndex: number | undefined, handedness, index) => {
        if (handedness.label === "Right") {
          return index;
        }
        return leftHandIndex;
      },
      undefined
    ),
  };
}

export function scaleLandmarksToCanvas({
  landmarks,
  canvasDimensions,
  indices,
  mirror = true,
}: {
  landmarks: any;
  canvasDimensions: Dimensions;
  indices?: number[];
  mirror?: boolean;
}) {
  if (indices && indices.length > 0) {
    const processedLandmarks = [...landmarks];

    indices.forEach((index: number) => {
      processedLandmarks[index] = {
        // mirror because the video the prediction is being detected on is flipped
        x: mirror
          ? mirrorLandmarkHorizontally(
              canvasDimensions.width,
              canvasDimensions.width * processedLandmarks[index].x
            )
          : processedLandmarks[index].x,
        y: canvasDimensions.height * processedLandmarks[index].y,
        z: processedLandmarks[index].z,
      };
    });

    return processedLandmarks;
  }

  return landmarks.map((landmark: any) => {
    return {
      x: mirror
        ? mirrorLandmarkHorizontally(
            canvasDimensions.width,
            canvasDimensions.width * landmark.x
          )
        : landmark.x,
      y: canvasDimensions.height * landmark.y,
      z: landmark.z,
    };
  });
}

export function getLandmarksPerHand(
  canvasDimensions: any,
  multiHandLandmarks: any,
  handIndices: {
    left?: number;
    right?: number;
  },
  mirror = true
) {
  const leftHandLandmarks =
    handIndices.left !== undefined
      ? scaleLandmarksToCanvas({
          landmarks: multiHandLandmarks[handIndices.left],
          canvasDimensions,
          mirror,
        })
      : undefined;
  const rightHandLandmarks =
    handIndices.right !== undefined
      ? scaleLandmarksToCanvas({
          landmarks: multiHandLandmarks[handIndices.right],
          canvasDimensions,
          mirror,
        })
      : undefined;

  const numHands = [leftHandLandmarks, rightHandLandmarks].reduce(
    (count, currentLandmark) => {
      if (currentLandmark !== undefined) {
        return count + 1;
      }

      return count;
    },
    0
  );

  return {
    leftHandLandmarks,
    rightHandLandmarks,
    numHands,
  };
}
