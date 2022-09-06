<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<script setup lang="ts">
import { onMounted, ref, toRaw, computed } from "vue";
import { Hands } from "@mediapipe/hands";

import {
  CLASSES,
  HAND_LANDMARK_IDS,
  validateCurrentPose,
  type MultiHandednessObject,
} from "@/utils";

// components
import WebcamVue from "@/components/lib/WebCam.vue";
import CanvasWrapper from "@/components/lib/CanvasWrapper.vue";
import ChartAxes from "@/components/lib/axes/ChartAxes.vue";
import ChartWrapper from "@/components/lib/axes/ChartWrapper.vue";
import LineCanvas from "@/components/lib/line/LineCanvas.vue";

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
const handPosition = computed(() => {
  const isPlayback = currentPose.value?.class === CLASSES.PLAYBACK;

  if (
    currentPose.value?.right &&
    isPlayback &&
    canvas.value &&
    currentPose.value?.left
  ) {
    const right_xPos =
      (1 - currentPose?.value.right[HAND_LANDMARK_IDS.middle_finger_tip].x) *
      canvas.value?.width;

    const right_yPos =
      currentPose?.value.right[HAND_LANDMARK_IDS.middle_finger_tip].y *
      canvas.value.height;

    const left_xPos =
      (1 - currentPose?.value.left[HAND_LANDMARK_IDS.index_finger_tip].x) *
      canvas.value?.width;

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

async function renderVideoOnCanvas(video: any) {
  const width = canvas.value?.width || 1280;
  const height = canvas.value?.height || 720;
  canvasCtx.value?.clearRect(0, 0, width, height);
  if (canvasCtx.value) {
    canvasCtx.value?.drawImage(video, 0, 0, width || 1280, height || 720);
    currentPose.value = validateCurrentPose(
      canvasCtx.value,
      predictions.value,
      multiHandLandmarks.value,
      { width, height },
      multiHandedness.value
    );
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
    <video class="input_video" ref="video"></video>
    <CanvasWrapper
      :width="1020"
      :height="765"
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
          :handPosition="handPosition"
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
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}
</style>
