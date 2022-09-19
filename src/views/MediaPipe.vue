<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<script setup lang="ts">
import { onMounted, ref, toRaw, computed } from "vue";
import { Hands } from "@mediapipe/hands";
import StyledWindowDiv from "@/components/lib/styled-components/StyledWindowDiv.vue";

import {
  POSES,
  HAND_LANDMARK_IDS,
  validateCurrentPose,
  type MultiHandednessObject,
  mirrorLandmarkHorizontally,
  calculateDistance,
  scaleLandmarksToChart,
  VERTICAL_ORDER,
} from "@/utils";

// components
import WebcamVue from "@/components/lib/WebCam.vue";
import CanvasWrapper from "@/components/lib/CanvasWrapper.vue";
import ChartAxes from "@/components/lib/axes/ChartAxes.vue";
import ChartWrapper from "@/components/lib/axes/ChartWrapper.vue";
import LineCanvas from "@/components/lib/line/LineCanvas.vue";
import EmphasisLevelCanvas from "../components/lib/line/EmphasisLevelCanvas.vue";

interface PredictionObject {
  className: string;
  probability: number;
}

const MODEL_IDS = {
  first_iteration: "jsB8IiKon",
  second_iteration: "zWA9pkcjy",
  stripped_down: "NZyGd_Hkq",
};

const URL = `https://teachablemachine.withgoogle.com/models/${MODEL_IDS.stripped_down}`;
const MODEL_URL = `${URL}/model.json`;
const METADATA_URL = `${URL}/metadata.json`;
const MEDIA_PIPE_URL = (file: string) =>
  `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;

const canvas = ref<HTMLCanvasElement | null>(null);
const canvasCtx = ref<CanvasRenderingContext2D | null>(null);
const hands = ref<Hands | null>(null);
const model = ref<tmPose.CustomPoseNet | null>(null);
const maxPredictions = ref<number>(0);
const multiHandLandmarks = ref<any>([]);
const multiHandedness = ref<any>([]);
const predictions = ref<PredictionObject[]>([]);
const currentPose = ref<{
  class: string;
  left: any;
  right: any;
}>();
const emphasisStack = ref<any[]>([]);
const previousEmphasisDistance = ref<number>(0);
const processedLandmarks = ref<any>();
const timeoutId = ref<any>();
const emphasisCount = ref<number>(0);
const shouldIncrement = ref<boolean>(true);

const shouldDecrement = computed(() => {
  return currentPose.value?.class === POSES.EMPHASIS;
});

const playbackHandPosition = computed(() => {
  const isPlayback = currentPose.value?.class === POSES.PLAYBACK;

  if (
    currentPose.value?.right &&
    isPlayback &&
    canvas.value &&
    currentPose.value?.left
  ) {
    const right_xPos = mirrorLandmarkHorizontally(
      canvas.value?.width,
      currentPose?.value.right[HAND_LANDMARK_IDS.middle_finger_tip].x *
        canvas.value.width
    );

    const right_yPos =
      currentPose?.value.right[HAND_LANDMARK_IDS.middle_finger_tip].y *
      canvas.value.height;

    const left_xPos = mirrorLandmarkHorizontally(
      canvas.value?.width,
      currentPose?.value.left[HAND_LANDMARK_IDS.middle_finger_tip].x *
        canvas.value.width
    );

    const left_yPos =
      currentPose?.value.left[HAND_LANDMARK_IDS.index_finger_tip].y *
      canvas.value.height;
    return {
      left: {
        x: left_xPos,
        y: left_yPos,
      },
      right: {
        x: right_xPos,
        y: right_yPos,
      },
    };
  }

  return undefined;
});

function initializeHands() {
  hands.value = new Hands({
    locateFile: MEDIA_PIPE_URL,
  });
  hands.value.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  hands.value.onResults(onResults);
}

async function initializeModel() {
  model.value = await tmPose.load(MODEL_URL, METADATA_URL);
  maxPredictions.value = model.value.getTotalClasses();
}

function onResults(results: {
  image: any;
  multiHandLandmarks: any;
  multiHandedness: MultiHandednessObject[];
}) {
  multiHandLandmarks.value = results.multiHandLandmarks;
  multiHandedness.value = results.multiHandedness;
}

function handleInitialPoseDetection() {
  const previousPose = emphasisStack.value[0];
  const diff = calculateDistance(
    previousPose.handPosition.left[HAND_LANDMARK_IDS.middle_finger_tip],
    processedLandmarks.value.left[HAND_LANDMARK_IDS.middle_finger_tip]
  );
  if (diff.euclideanDistance < 30) {
    emphasisStack.value.push({
      handPosition: {
        left: processedLandmarks.value.left,
        right: processedLandmarks.value.right,
      },
      distance: {
        left: calculateDistance(
          processedLandmarks.value.left[HAND_LANDMARK_IDS.middle_finger_tip],
          processedLandmarks.value.left[HAND_LANDMARK_IDS.wrist]
        ),
        right: calculateDistance(
          processedLandmarks.value.right[HAND_LANDMARK_IDS.middle_finger_tip],
          processedLandmarks.value.right[HAND_LANDMARK_IDS.wrist]
        ),
      },
    });
  } else {
    emphasisStack.value = [];
    clearTimeout(timeoutId.value);
    timeoutId.value = undefined;
  }
}

async function renderVideoOnCanvas(video: any) {
  const width = canvas.value?.width || 1280;
  const height = canvas.value?.height || 720;
  canvasCtx.value?.clearRect(0, 0, width, height);
  if (canvasCtx.value) {
    canvasCtx.value?.drawImage(video, 0, 0, width || 1280, height || 720);
    const pose = validateCurrentPose(
      canvasCtx.value,
      predictions.value,
      multiHandLandmarks.value,
      { width, height },
      multiHandedness.value
    );
    currentPose.value = pose;
    // if (pose?.class === POSES.NONE) {
    //   emphasisStack.value = [];
    //   timeoutId.value = undefined;
    // }
    // EMPHASIS TRIGGER
    if (pose?.class === POSES.EMPHASIS) {
      processedLandmarks.value = {
        left: scaleLandmarksToChart({
          landmarks: pose.left,
          canvasDimensions: { width, height },
          indices: [
            HAND_LANDMARK_IDS.middle_finger_tip,
            HAND_LANDMARK_IDS.wrist,
          ],
        }),
        right: scaleLandmarksToChart({
          landmarks: pose.right,
          canvasDimensions: { width, height },
          indices: [
            HAND_LANDMARK_IDS.middle_finger_tip,
            HAND_LANDMARK_IDS.wrist,
          ],
        }),
      };
      if (emphasisStack.value.length === 0) {
        emphasisStack.value.push({
          handPosition: {
            left: processedLandmarks.value.left,
            right: processedLandmarks.value.right,
          },
          distance: {
            left: calculateDistance(
              processedLandmarks.value.left[
                HAND_LANDMARK_IDS.middle_finger_tip
              ],
              processedLandmarks.value.left[HAND_LANDMARK_IDS.wrist]
            ),
            right: calculateDistance(
              processedLandmarks.value.right[
                HAND_LANDMARK_IDS.middle_finger_tip
              ],
              processedLandmarks.value.right[HAND_LANDMARK_IDS.wrist]
            ),
          },
        });
      } else if (emphasisStack.value.length === 1) {
        if (!timeoutId.value) {
          timeoutId.value = setTimeout(handleInitialPoseDetection, 1000);
        }
      } else {
        const previousPose = emphasisStack.value[1];
        // order is important here
        const diff = calculateDistance(
          previousPose.handPosition.left[HAND_LANDMARK_IDS.middle_finger_tip],
          processedLandmarks.value.left[HAND_LANDMARK_IDS.middle_finger_tip]
        );
        if (
          diff.verticalDistance.value > 0 &&
          diff.verticalDistance.order === VERTICAL_ORDER.ABOVE
        ) {
          if (
            previousEmphasisDistance.value > diff.verticalDistance.value &&
            shouldIncrement.value
          ) {
            if (emphasisCount.value < 3) {
              emphasisCount.value = emphasisCount.value + 1;
              shouldIncrement.value = false;
            }
          } else {
            previousEmphasisDistance.value = diff.verticalDistance.value;
          }
        } else {
          shouldIncrement.value = true;
        }
      }
    }
    emphasisStack.value.forEach((pose, index) => {
      if (canvasCtx.value && canvas.value && index === 0) {
        canvasCtx.value?.beginPath();
        // canvasCtx.value?.arc(0, 0, 5, 0, 2 * Math.PI, false);
        canvasCtx.value.moveTo(
          0,
          pose.handPosition.left[HAND_LANDMARK_IDS.middle_finger_tip].y
        );
        canvasCtx.value.lineTo(
          canvas.value.width,
          pose.handPosition.left[HAND_LANDMARK_IDS.middle_finger_tip].y
        );
        canvasCtx.value.strokeStyle = "blue";
        canvasCtx.value?.stroke();
      }
    });
    // EMPHASIS TRIGGER
  }
  await getPosePrediction(canvas.value);
}

async function getPosePrediction(video: any) {
  if (model.value) {
    const { posenetOutput } = await toRaw(model.value).estimatePose(
      video,
      true
    );
    if (!posenetOutput) throw new Error("No posenet output");

    predictions.value = await toRaw(model.value).predict(posenetOutput);
  }
}

async function runDetection(video: any) {
  if (hands.value && video) {
    try {
      await toRaw(hands.value).send({ image: video });
    } catch (error) {
      console.log("error", error);
    }
  }
  await renderVideoOnCanvas(video);
  requestAnimationFrame(() => runDetection(video));
}

async function setVideoDimensions(video: any) {
  if (video) {
    video.width = 640;
    video.height = video.width * (video.videoHeight / video.videoWidth); //* (3 / 4);
    video.play();
  }
}

async function decrementEmphasisCount() {
  emphasisCount.value = emphasisCount.value - 1;
}

// CLEAR EXISTING POINTS
window.addEventListener("keypress", (event) => {
  event.preventDefault();
  if (event.key === " " || event.code === "Space") {
    emphasisStack.value = [];
    timeoutId.value = undefined;
  }
});
// CLEAR EXISTING POINTS

onMounted(() => {
  if (canvas.value) {
    canvasCtx.value = canvas.value.getContext("2d");
    const width = canvas.value?.width || 1280;
    canvasCtx.value?.scale(-1, 1);
    canvasCtx.value?.translate(-width, 0);
  }
  initializeHands();
  initializeModel();
});
</script>

<template>
  <StyledWindowDiv>
    <CanvasWrapper
      :width="640"
      :height="480"
      v-slot="{ width, height, className }"
    >
      <canvas
        class="output_canvas"
        :width="width"
        :height="height"
        :class="className"
        ref="canvas"
      ></canvas>
      <ChartWrapper
        :width="width"
        :height="height"
        :class="className"
        v-slot="{ xAxis, yAxis, xScaleLine, chartBounds }"
      >
        <ChartAxes
          :width="width"
          :height="height"
          :xAxis="xAxis"
          :yAxis="yAxis"
        />
        <LineCanvas
          :canvasDimensions="{ width, height }"
          :chartBounds="chartBounds"
          :xScale="xScaleLine"
          :className="className"
          :handPosition="playbackHandPosition"
          :fps="emphasisCount"
        />
        <EmphasisLevelCanvas
          :canvasDimensions="{ width, height }"
          :className="className"
          :level="emphasisCount"
          :decrementEmphasisCount="decrementEmphasisCount"
          :canDecrement="shouldDecrement"
        />
      </ChartWrapper>
    </CanvasWrapper>
    <WebcamVue
      @loaded-data="runDetection"
      @loaded-metadata="setVideoDimensions"
    />
  </StyledWindowDiv>
</template>

<style></style>
