import { calculateDistance, HAND_LANDMARK_IDS, VERTICAL_ORDER } from "@/utils";

export function handleEmphasis() {
  let emphasisStack: any[] = [];
  let timeoutId: any;
  let shouldIncrement = true;
  let emphasisCount = 0;
  let previousEmphasisDistance = 0;
  let processedLandmarks: any;

  function handleInitialEmphasisPoseDetection() {
    const previousPose = emphasisStack[0];
    const diff = calculateDistance(
      previousPose.handPosition.left[HAND_LANDMARK_IDS.middle_finger_tip],
      processedLandmarks.left[HAND_LANDMARK_IDS.middle_finger_tip]
    );
    if (diff.euclideanDistance < 30) {
      emphasisStack.push({
        handPosition: {
          left: processedLandmarks.left,
          right: processedLandmarks.right,
        },
        distance: {
          left: calculateDistance(
            processedLandmarks.left[HAND_LANDMARK_IDS.middle_finger_tip],
            processedLandmarks.left[HAND_LANDMARK_IDS.wrist]
          ),
          right: calculateDistance(
            processedLandmarks.right[HAND_LANDMARK_IDS.middle_finger_tip],
            processedLandmarks.right[HAND_LANDMARK_IDS.wrist]
          ),
        },
      });
    } else {
      emphasisStack = [];
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  }

  return {
    emphasisHandler: (landMarks: any, count: number) => {
      processedLandmarks = landMarks;
      emphasisCount = count;
      if (emphasisStack.length === 0) {
        emphasisStack.push({
          handPosition: {
            left: processedLandmarks.left,
            right: processedLandmarks.right,
          },
          distance: {
            left: calculateDistance(
              processedLandmarks.left[HAND_LANDMARK_IDS.middle_finger_tip],
              processedLandmarks.left[HAND_LANDMARK_IDS.wrist]
            ),
            right: calculateDistance(
              processedLandmarks.right[HAND_LANDMARK_IDS.middle_finger_tip],
              processedLandmarks.right[HAND_LANDMARK_IDS.wrist]
            ),
          },
        });
      } else if (emphasisStack.length === 1) {
        if (!timeoutId) {
          timeoutId = setTimeout(handleInitialEmphasisPoseDetection, 1000);
        }
      } else {
        const previousPose = emphasisStack[1];
        // order is important here
        const diff = calculateDistance(
          previousPose.handPosition.left[HAND_LANDMARK_IDS.middle_finger_tip],
          processedLandmarks.left[HAND_LANDMARK_IDS.middle_finger_tip]
        );
        if (
          diff.verticalDistance.value > 0 &&
          diff.verticalDistance.order === VERTICAL_ORDER.ABOVE
        ) {
          if (
            previousEmphasisDistance > diff.verticalDistance.value &&
            shouldIncrement
          ) {
            if (emphasisCount < 3) {
              emphasisCount = emphasisCount + 1;
              shouldIncrement = false;
            }
          } else {
            previousEmphasisDistance = diff.verticalDistance.value;
          }
        } else {
          shouldIncrement = true;
        }
      }

      return {
        stack: emphasisStack,
        count: emphasisCount,
      };
    },
    resetEmphasis: () => {
      emphasisStack = [];
      clearTimeout(timeoutId);
      timeoutId = undefined;
    },
  };
}
