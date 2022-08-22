<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<script setup lang="ts">
import { onMounted, ref, toRaw } from "vue";
import { Hands } from "@mediapipe/hands";

import WebcamVue from "./Webcam.vue";

interface PredictionObject {
  className: string;
  probability: number;
}
const MODEL_IDS = {
  first_iteration: "jsB8IiKon",
  second_iteration: "zWA9pkcjy",
};

const URL = `https://teachablemachine.withgoogle.com/models/${MODEL_IDS.second_iteration}`;
const MODEL_URL = `${URL}/model.json`;
const METADATA_URL = `${URL}/metadata.json`;
const MEDIA_PIPE_URL = (file: string) =>
  `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;

const canvas = ref<HTMLCanvasElement | null>(null);
const canvasCtx = ref<CanvasRenderingContext2D | null>(null);
const hands = ref<Hands | null>(null);
const model = ref<tmPose.CustomPoseNet | null>(null);
const maxPredictions = ref<number>(0);
const predictions = ref<PredictionObject[]>([]);

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

async function onResults(results: { image: any; multiHandLandmarks: any }) {
  const width = canvas.value?.width || 1280;
  const height = canvas.value?.height || 720;
  canvasCtx.value?.save();
  canvasCtx.value?.clearRect(0, 0, width, height);
  canvasCtx.value?.scale(-1, 1);
  canvasCtx.value?.translate(-width, 0);
  canvasCtx.value?.drawImage(results.image, 0, 0, width || 1280, height || 720);

  await getPosePrediction(canvas.value);

  if (results.multiHandLandmarks && canvasCtx.value) {
    for (const [index, landmarks] of results.multiHandLandmarks.entries()) {
      landmarks.forEach((mark: any) => {
        if (canvasCtx.value) {
          const x = width * mark.x;
          const y = height * mark.y;
          canvasCtx.value.beginPath();
          canvasCtx.value.arc(x, y, 5, 0, 2 * Math.PI, false);
          canvasCtx.value.fillStyle = "red";
          canvasCtx.value.fill();
        }
      });
    }
  }
  canvasCtx.value?.restore();
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

  const currentPose = predictions.value.reduce(
    (maxPrediction: PredictionObject, currentPrediction: PredictionObject) => {
      if (currentPrediction.probability > maxPrediction.probability) {
        return currentPrediction;
      }
      return maxPrediction;
    },
    { className: "unknown", probability: -Infinity } as PredictionObject
  );

  console.log(currentPose);
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
  }
  initializeHands();
  initializeModel();
});
</script>

<template>
  <div class="about">
    <video class="input_video" ref="video"></video>
    <canvas
      class="output_canvas"
      width="1020"
      height="765"
      ref="canvas"
    ></canvas>
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
