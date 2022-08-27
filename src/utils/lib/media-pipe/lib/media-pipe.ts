import {
  calculateAngleBetweenPoints,
  calculateDistance,
} from "../../calculations";
import type { ChartDimensions } from "../../chart";
import { CLASSES, type PredictionObject } from "../../teachable-machine";
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
        // In mediapipe 0 is for the left hand but it's inverted so left is right
        if (handedness.index === 0) {
          return index;
        }
        return rightHandIndex;
      },
      undefined
    ),
    left: multiHandedness.reduce(
      (leftHandIndex: number | undefined, handedness, index) => {
        // In mediapipe 1 is for the left hand but it's inverted so right is left
        if (handedness.index === 1) {
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
  chartDimensions: ChartDimensions,
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
    { className: CLASSES.NONE, probability: -Infinity } as PredictionObject
  );

  let validatedPose;
  switch (currentPose.className) {
    case CLASSES.PLAYBACK:
      validatedPose = validatePlayback(
        canvasCtx,
        multiHandLandmarks,
        chartDimensions,
        handIndices
      );
      break;
    case CLASSES.EMPHASIS:
      validatedPose = validateEmphasis(
        canvasCtx,
        multiHandLandmarks,
        chartDimensions,
        handIndices,
        CLASSES.EMPHASIS
      );
      break;
    case CLASSES.NONE:
    default:
      validatedPose = CLASSES.NONE;
      break;
  }
  return validatedPose;
}

function validatePlayback(
  canvasCtx: CanvasRenderingContext2D,
  multiHandLandmarks: any,
  chartDimensions: ChartDimensions,
  handIndices: {
    left?: number;
    right?: number;
  }
) {
  // 8, 5, 0 indicate landmarks on the index finger tip (8), MCP joint of the index finger (5), wrist (0)
  const LANDMARKS_TO_VALIDATE = [
    HAND_LANDMARK_IDS.index_finger_tip,
    HAND_LANDMARK_IDS.index_finger_mcp,
    HAND_LANDMARK_IDS.wrist,
  ];

  // Verify left hand is pointing
  if (handIndices.left !== undefined && handIndices.right !== undefined) {
    const leftHandLandmarks = multiHandLandmarks[handIndices.left];

    const parsedLandmarks: ParsedLandmarksObject = LANDMARKS_TO_VALIDATE.reduce(
      (parsedLandmarks, landmark) => {
        const x = chartDimensions.width * leftHandLandmarks[landmark].x;
        const y = chartDimensions.height * leftHandLandmarks[landmark].y;
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 5, 0, 2 * Math.PI, false);
        // canvasCtx.arc(rightX, rightY, 5, 0, 2 * Math.PI, false);
        canvasCtx.fillStyle = "red";
        canvasCtx.fill();
        parsedLandmarks[landmark] = {
          x: mirrorLandmarkHorizontally(chartDimensions.width, x),
          y,
        };

        return parsedLandmarks;
      },
      {} as ParsedLandmarksObject
    );

    if (isCorrectPlaybackSelectionHandLandmark(parsedLandmarks)) {
      return CLASSES.PLAYBACK;
    }
  } else {
    return CLASSES.NONE;
  }
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
  canvasCtx: CanvasRenderingContext2D,
  multiHandLandmarks: any,
  chartDimensions: ChartDimensions,
  handIndices: {
    left?: number;
    right?: number;
  },
  type: string
) {
  const LANDMARKS_TO_VALIDATE = [
    HAND_LANDMARK_IDS.middle_finger_tip,
    HAND_LANDMARK_IDS.wrist,
  ];

  if (handIndices.left === undefined || handIndices.right === undefined) {
    return CLASSES.NONE;
  }

  const leftHandLandmarks = multiHandLandmarks[handIndices.left];
  const rightHandLandmarks = multiHandLandmarks[handIndices.right];

  const parsedLandmarks: {
    left: ParsedLandmarksObject;
    right: ParsedLandmarksObject;
  } = LANDMARKS_TO_VALIDATE.reduce(
    (parsedLandmarks, landmark) => {
      const leftX = chartDimensions.width * leftHandLandmarks[landmark].x;
      const leftY = chartDimensions.height * leftHandLandmarks[landmark].y;
      const rightX = chartDimensions.width * rightHandLandmarks[landmark].x;
      const rightY = chartDimensions.height * rightHandLandmarks[landmark].y;

      canvasCtx.beginPath();
      canvasCtx.arc(leftX, leftY, 5, 0, 2 * Math.PI, false);
      // canvasCtx.arc(rightX, rightY, 5, 0, 2 * Math.PI, false);
      canvasCtx.fillStyle = "red";
      canvasCtx.fill();

      parsedLandmarks.left[landmark] = {
        x: mirrorLandmarkHorizontally(chartDimensions.width, leftX),
        y: leftY,
      };
      parsedLandmarks.right[landmark] = {
        x: chartDimensions.width - rightX,
        y: rightY,
      };

      return parsedLandmarks;
    },
    { left: {}, right: {} } as {
      left: ParsedLandmarksObject;
      right: ParsedLandmarksObject;
    }
  );

  if (
    isCorrectInitiateEmphasisHandLandmark({
      leftHand: parsedLandmarks.left,
      rightHand: parsedLandmarks.right,
    })
  ) {
    return type;
  }

  return CLASSES.NONE;
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
      handDistance.horizontalDistance < 400 &&
      handDistance.verticalDistance < 300
    ) {
      return true;
    }
    return false;
  }

  return false;
}
