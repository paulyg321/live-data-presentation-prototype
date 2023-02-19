import { calculateDistance, HAND_LANDMARK_IDS } from "@/utils";

export function handlePlayback() {
  let stack: any[] = [];
  let timeoutId: any;
  let processedLandmarks: any;

  function handleInitialPlaybackPoseDetection() {
    const previousPose = stack[0];
    const diff = calculateDistance(
      previousPose.handPosition.left[HAND_LANDMARK_IDS.index_finger_tip],
      processedLandmarks.left[HAND_LANDMARK_IDS.index_finger_tip]
    );
    if (diff.euclideanDistance < 30) {
      stack.push({
        handPosition: {
          left: processedLandmarks.left,
          right: processedLandmarks.right,
        },
      });
    } else {
      stack = [];
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  }

  return {
    playbackHandler: (landMarks: any) => {
      processedLandmarks = landMarks;
      if (stack.length === 0) {
        stack.push({
          handPosition: {
            left: processedLandmarks.left,
            right: processedLandmarks.right,
          },
        });
      } else if (stack.length === 1) {
        if (!timeoutId) {
          timeoutId = setTimeout(handleInitialPlaybackPoseDetection, 1000);
        }
      } else if (stack.length === 2) {
        return true;
      }

      return false;
    },
    resetPlayback: () => {
      stack = [];
      clearTimeout(timeoutId);
      timeoutId = undefined;
    },
  };
}
