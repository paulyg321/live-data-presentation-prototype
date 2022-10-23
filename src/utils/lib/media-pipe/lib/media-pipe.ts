import {
  calculateAngleBetweenPoints,
  calculateDistance,
} from "../../calculations";
import type { ChartDimensions } from "../../chart";
import { POSES, type PredictionObject } from "../../teachable-machine";
import type {
  MultiHandednessObject,
  ParsedLandmarksObject,
} from "../types/lib/media-pipe";
import { HAND_LANDMARK_IDS } from "./constants";

export function mirrorLandmarkHorizontally(
  width: number,
  horizontalPosition: number
) {
  return width - horizontalPosition;
}

export function getLeftVsRightIndex(multiHandedness: MultiHandednessObject[]) {
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

export function validateCurrentPose(
  canvasCtx: CanvasRenderingContext2D,
  predictions: PredictionObject[],
  multiHandLandmarks: any,
  canvasDimensions: ChartDimensions,
  multiHandedness: MultiHandednessObject[]
) {
  const handIndices = getLeftVsRightIndex(multiHandedness);
  const currentPose = predictions.reduce(
    (maxPrediction: PredictionObject, currentPrediction: PredictionObject) => {
      if (currentPrediction.probability > maxPrediction.probability) {
        return currentPrediction;
      }
      return maxPrediction;
    },
    { className: POSES.NONE, probability: -Infinity } as PredictionObject
  );

  const { leftHandLandmarks, rightHandLandmarks, numHands } =
    getLandmarksPerHand(canvasDimensions, multiHandLandmarks, handIndices);

  let validatedPose;

  if (numHands === 1) {
    validatedPose = validatePointing(leftHandLandmarks, rightHandLandmarks);
  } else if (numHands === 2) {
    switch (currentPose.className) {
      case POSES.PLAYBACK:
        validatedPose = validatePlayback(leftHandLandmarks, rightHandLandmarks);
        break;
      case POSES.EMPHASIS:
        validatedPose = validateEmphasis(
          POSES.EMPHASIS,
          leftHandLandmarks,
          rightHandLandmarks
        );
        break;
      case POSES.NONE:
      default:
        validatedPose = {
          class: POSES.NONE,
          left: leftHandLandmarks,
          right: rightHandLandmarks,
        };
        break;
    }
  } else {
    validatedPose = {
      class: POSES.NONE,
      left: leftHandLandmarks,
      right: rightHandLandmarks,
    };
  }
  return validatedPose;
}

function validatePointing(leftHandLandmarks: any, rightHandLandmarks: any) {
  // const LANDMARKS_TO_VALIDATE = [
  //   HAND_LANDMARK_IDS.index_finger_tip,
  //   HAND_LANDMARK_IDS.index_finger_mcp,
  //   HAND_LANDMARK_IDS.middle_finger_tip,
  //   HAND_LANDMARK_IDS.middle_finger_mcp,
  // ];

  if (leftHandLandmarks) {
    if (isCorrectPointingLandmark(leftHandLandmarks)) {
      return {
        class: POSES.POINTING,
        left: leftHandLandmarks,
        right: rightHandLandmarks,
      };
    }

    return {
      class: POSES.NONE,
      left: leftHandLandmarks,
      right: rightHandLandmarks,
    };
  }

  if (rightHandLandmarks) {
    if (isCorrectPointingLandmark(rightHandLandmarks)) {
      return {
        class: POSES.POINTING,
        left: leftHandLandmarks,
        right: rightHandLandmarks,
      };
    }
  }

  return {
    class: POSES.NONE,
    left: leftHandLandmarks,
    right: rightHandLandmarks,
  };
}

function isCorrectPointingLandmark(parsedLandmarks: ParsedLandmarksObject) {
  if (
    parsedLandmarks[HAND_LANDMARK_IDS.index_finger_tip].y <
      parsedLandmarks[HAND_LANDMARK_IDS.index_finger_mcp].y &&
    parsedLandmarks[HAND_LANDMARK_IDS.middle_finger_tip].y >
      parsedLandmarks[HAND_LANDMARK_IDS.middle_finger_mcp].y
  ) {
    return true;
  }

  return false;
}

function validatePlayback(leftHandLandmarks: any, rightHandLandmarks: any) {
  // const LANDMARKS_TO_VALIDATE = [
  //   HAND_LANDMARK_IDS.index_finger_tip,
  //   HAND_LANDMARK_IDS.index_finger_mcp,
  //   HAND_LANDMARK_IDS.wrist,
  // ];

  if (isCorrectPlaybackSelectionHandLandmark(leftHandLandmarks)) {
    return {
      class: POSES.PLAYBACK,
      left: leftHandLandmarks,
      right: rightHandLandmarks,
    };
  }

  return {
    class: POSES.NONE,
    left: leftHandLandmarks,
    right: rightHandLandmarks,
  };
}

function isCorrectPlaybackSelectionHandLandmark(
  parsedLandmarks: ParsedLandmarksObject
) {
  if (
    parsedLandmarks[HAND_LANDMARK_IDS.index_finger_tip].x >
      parsedLandmarks[HAND_LANDMARK_IDS.index_finger_mcp].x &&
    parsedLandmarks[HAND_LANDMARK_IDS.index_finger_tip].x >
      parsedLandmarks[HAND_LANDMARK_IDS.wrist].x
  ) {
    const fingerAngle = calculateAngleBetweenPoints(
      parsedLandmarks[HAND_LANDMARK_IDS.index_finger_mcp],
      parsedLandmarks[HAND_LANDMARK_IDS.index_finger_tip]
    );
    if (fingerAngle < 30 && fingerAngle > -20) {
      return true;
    }
    return false;
  }

  return false;
}

function validateEmphasis(
  type: string,
  leftHandLandmarks: any,
  rightHandLandmarks: any
) {
  // const LANDMARKS_TO_VALIDATE = [
  //   HAND_LANDMARK_IDS.middle_finger_tip,
  //   HAND_LANDMARK_IDS.wrist,
  // ];

  if (
    isCorrectInitiateEmphasisHandLandmark({
      leftHand: leftHandLandmarks,
      rightHand: rightHandLandmarks,
    })
  ) {
    return {
      class: type,
      left: leftHandLandmarks,
      right: rightHandLandmarks,
    };
  }

  return {
    class: POSES.NONE,
    left: leftHandLandmarks,
    right: rightHandLandmarks,
  };
}

// Ensure right landmarks to validate is setup
function isCorrectInitiateEmphasisHandLandmark({
  leftHand,
  rightHand,
}: {
  leftHand: ParsedLandmarksObject;
  rightHand: ParsedLandmarksObject;
}) {
  const condition =
    // Hands are side by side
    leftHand[HAND_LANDMARK_IDS.middle_finger_tip].x <
      rightHand[HAND_LANDMARK_IDS.middle_finger_tip].x &&
    leftHand[HAND_LANDMARK_IDS.wrist].x <
      rightHand[HAND_LANDMARK_IDS.wrist].x &&
    // Hands are positioned pointing upwards
    leftHand[HAND_LANDMARK_IDS.middle_finger_tip].y <
      leftHand[HAND_LANDMARK_IDS.wrist].y &&
    rightHand[HAND_LANDMARK_IDS.middle_finger_tip].y <
      rightHand[HAND_LANDMARK_IDS.wrist].y &&
    // Hands are side by side
    leftHand[HAND_LANDMARK_IDS.wrist].y -
      leftHand[HAND_LANDMARK_IDS.middle_finger_tip].y >
      100 &&
    rightHand[HAND_LANDMARK_IDS.wrist].y -
      rightHand[HAND_LANDMARK_IDS.middle_finger_tip].y >
      100;

  if (condition) {
    const handDistance = calculateDistance(
      leftHand[HAND_LANDMARK_IDS.middle_finger_tip],
      rightHand[HAND_LANDMARK_IDS.middle_finger_tip]
    );

    if (
      handDistance.horizontalDistance.value < 400 &&
      handDistance.verticalDistance.value < 300
    ) {
      return true;
    }
    return false;
  }

  return false;
}

export function scaleLandmarksToChart({
  landmarks,
  canvasDimensions,
  indices,
}: {
  landmarks: any;
  canvasDimensions: {
    width: number;
    height: number;
  };
  indices?: number[];
}) {
  if (indices && indices.length > 0) {
    const processedLandmarks = [...landmarks];

    indices.forEach((index: number) => {
      processedLandmarks[index] = {
        // mirror because the video the prediction is being detected on is flipped
        x: mirrorLandmarkHorizontally(
          canvasDimensions.width,
          canvasDimensions.width * processedLandmarks[index].x
        ),
        y: canvasDimensions.height * processedLandmarks[index].y,
      };
    });

    return processedLandmarks;
  }

  return landmarks.map((landmark: any) => {
    return {
      x: mirrorLandmarkHorizontally(
        canvasDimensions.width,
        canvasDimensions.width * landmark.x
      ),
      y: canvasDimensions.height * landmark.y,
    };
  });
}

function getLandmarksPerHand(
  canvasDimensions: any,
  multiHandLandmarks: any,
  handIndices: {
    left?: number;
    right?: number;
  }
) {
  const leftHandLandmarks =
    handIndices.left !== undefined
      ? scaleLandmarksToChart({
          landmarks: multiHandLandmarks[handIndices.left],
          canvasDimensions,
        })
      : undefined;
  const rightHandLandmarks =
    handIndices.right !== undefined
      ? scaleLandmarksToChart({
          landmarks: multiHandLandmarks[handIndices.right],
          canvasDimensions,
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
