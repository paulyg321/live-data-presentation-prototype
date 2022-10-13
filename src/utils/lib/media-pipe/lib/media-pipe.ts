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
    { className: POSES.NONE, probability: -Infinity } as PredictionObject
  );

  let validatedPose;
  switch (currentPose.className) {
    case POSES.PLAYBACK:
      validatedPose = validatePlayback(
        canvasCtx,
        multiHandLandmarks,
        chartDimensions,
        handIndices
      );
      break;
    case POSES.EMPHASIS:
      validatedPose = validateEmphasis(
        canvasCtx,
        multiHandLandmarks,
        chartDimensions,
        handIndices,
        POSES.EMPHASIS
      );
      break;
    case POSES.NONE:
    default:
      validatedPose = {
        class: POSES.NONE,
        left: handIndices.left
          ? multiHandLandmarks[handIndices.left]
          : undefined,
        right: handIndices.right
          ? multiHandLandmarks[handIndices.right]
          : undefined,
      };
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

  const leftHandLandmarks =
    handIndices.left !== undefined
      ? multiHandLandmarks[handIndices.left]
      : undefined;
  const rightHandLandmarks =
    handIndices.right !== undefined
      ? multiHandLandmarks[handIndices.right]
      : undefined;

  // Verify left hand is pointing
  if (leftHandLandmarks && rightHandLandmarks) {
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
      return {
        class: POSES.PLAYBACK,
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

  const leftHandLandmarks =
    handIndices.left !== undefined
      ? multiHandLandmarks[handIndices.left]
      : undefined;
  const rightHandLandmarks =
    handIndices.right !== undefined
      ? multiHandLandmarks[handIndices.right]
      : undefined;

  if (leftHandLandmarks && rightHandLandmarks) {
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
      return {
        class: type,
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
