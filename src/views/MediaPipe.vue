<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<script setup lang="ts">
import { onMounted, ref, toRaw, computed } from "vue";
import { Hands } from "@mediapipe/hands";

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

const MIN_DIFF = 70;

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
const emphasisCount = ref<number>(1);
const shouldIncrement = ref<boolean>(true);

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
          timeoutId.value = setTimeout(handleInitialPoseDetection, 2000);
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
          if (previousEmphasisDistance.value > diff.verticalDistance.value && shouldIncrement.value) {
            emphasisCount.value = emphasisCount.value + 1;
            console.log(emphasisCount.value);
            shouldIncrement.value = false;
          } else {
            previousEmphasisDistance.value = diff.verticalDistance.value;
          }
        } else {
          shouldIncrement.value = true;
        }
      }
    }
    emphasisStack.value.forEach((pose) => {
      if (canvasCtx.value) {
        canvasCtx.value?.beginPath();
        canvasCtx.value?.arc(
          pose.handPosition.left[HAND_LANDMARK_IDS.middle_finger_tip].x,
          pose.handPosition.left[HAND_LANDMARK_IDS.middle_finger_tip].y,
          5,
          0,
          2 * Math.PI,
          false
        );
        canvasCtx.value.fillStyle = "blue";
        canvasCtx.value?.fill();
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
  if (hands.value) {
    await toRaw(hands.value).send({ image: video });
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
  <div class="about">
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
      </ChartWrapper>
    </CanvasWrapper>
    <WebcamVue
      @loaded-data="runDetection"
      @loaded-metadata="setVideoDimensions"
    />
  </div>
</template>

<style>
.about {
  width: 100vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
