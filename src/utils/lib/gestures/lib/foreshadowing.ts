import { calculateDistance, HAND_LANDMARK_IDS } from "@/utils";

export function handlePointing() {
  let stack: any[] = [];
  let timeoutId: any;
  let processedLandmarks: any;
  let currentHand: "left" | "right" | undefined;

  function handleHoldPointingPose(prevIndex: number, reset: () => void) {
    if (!currentHand) return;
    const previousPose = stack[prevIndex];
    const diff = calculateDistance(
      previousPose.handPosition[currentHand][
        HAND_LANDMARK_IDS.index_finger_tip
      ],
      processedLandmarks[currentHand][HAND_LANDMARK_IDS.index_finger_tip]
    );
    console.log(diff.euclideanDistance);
    if (diff.euclideanDistance < 30) {
      stack.push({
        handPosition: {
          left: processedLandmarks.left,
          right: processedLandmarks.right,
        },
      });
    } else {
      reset();
    }
  }

  function resetAllState() {
    stack = [];
    clearTimeout(timeoutId);
    timeoutId = undefined;
    currentHand = undefined;
  }

  function partialReset(startIndex: number, endIndex: number) {
    stack = stack.slice(startIndex, endIndex);
    clearTimeout(timeoutId);
    timeoutId = undefined;
  }

  return {
    pointingHandler: (landMarks: any) => {
      processedLandmarks = landMarks;
      if (stack.length === 0) {
        stack.push({
          handPosition: {
            left: processedLandmarks.left,
            right: processedLandmarks.right,
          },
        });

        if (processedLandmarks.left !== undefined) {
          currentHand = "left";
        } else if (processedLandmarks.right !== undefined) {
          currentHand = "right";
        }
      } else if (stack.length === 1) {
        if (!timeoutId) {
          timeoutId = setTimeout(
            () => handleHoldPointingPose(0, resetAllState),
            1000
          );
        }
      } else if (stack.length === 2) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        stack.push({
          handPosition: {
            left: processedLandmarks.left,
            right: processedLandmarks.right,
          },
        });
      } else if (stack.length === 3) {
        if (!timeoutId) {
          timeoutId = setTimeout(
            () => handleHoldPointingPose(2, () => partialReset(0, 2)),
            1000
          );
        }
      }

      return stack;
    },
    resetPointing: () => {
      stack = [];
      clearTimeout(timeoutId);
      timeoutId = undefined;
    },
  };
}
