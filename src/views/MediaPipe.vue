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
  handleEmphasis,
  handlePlayback,
  handlePointing,
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
  latest: "NZyGd_Hkq",
};

const URL = `https://teachablemachine.withgoogle.com/models/${MODEL_IDS.latest}`;
const MODEL_URL = `${URL}/model.json`;
const METADATA_URL = `${URL}/metadata.json`;
const MEDIA_PIPE_URL = (file: string) =>
  `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;

const canvas = ref<HTMLCanvasElement | null>(null);
const canvasCtx = ref<CanvasRenderingContext2D | null>(null);
const audienceCanvas = ref<HTMLCanvasElement | null>(null);
const audienceCanvasCtx = ref<CanvasRenderingContext2D | null>(null);
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
const emphasisCount = ref<number>(0);
const emphasisHandler = ref<(landmarks: any, count: number) => any>();
const resetEmphasis = ref<() => any>();

const pointingHandler = ref<(landmarks: any) => any>();
const resetPointing = ref<() => any>();
const pointingStack = ref<any[]>([]);

const isPlaybackMode = ref<boolean>(false);
const playbackHandler = ref<(landmarks: any) => any>();
const resetPlayback = ref<() => void>();

const chartSize = ref<number>(0.75);
const chartXPosition = ref<number>(0);
const chartYPosition = ref<number>(0);

const chartWidth = computed(() => {
  return 640 * chartSize.value;
});

const chartHeight = computed(() => {
  return 480 * chartSize.value;
});

const shouldDecrement = computed(() => {
  return currentPose.value?.class === POSES.EMPHASIS;
});

const playbackHandPosition = computed(() => {
  if (
    currentPose.value?.right &&
    currentPose.value?.left &&
    isPlaybackMode.value &&
    canvas.value
  ) {
    const right_xPos =
      currentPose?.value.right[HAND_LANDMARK_IDS.middle_finger_tip].x;
    const right_yPos =
      currentPose?.value.right[HAND_LANDMARK_IDS.middle_finger_tip].y;
    const left_xPos =
      currentPose?.value.left[HAND_LANDMARK_IDS.middle_finger_tip].x;
    const left_yPos =
      currentPose?.value.left[HAND_LANDMARK_IDS.index_finger_tip].y;

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
  const canvasDimensions = { width, height };
  // RENDER ON AUDIENCE CANVAS
  canvasCtx.value?.clearRect(0, 0, width, height);
  audienceCanvasCtx.value?.clearRect(0, 0, width, height);
  if (canvasCtx.value) {
    // RENDER ON AUDIENCE CANVAS
    canvasCtx.value?.drawImage(video, 0, 0, width || 1280, height || 720);
    // audienceCanvasCtx.value?.drawImage(
    //   video,
    //   0,
    //   0,
    //   width || 1280,
    //   height || 720
    // );
    currentPose.value = validateCurrentPose(
      canvasCtx.value,
      predictions.value,
      multiHandLandmarks.value,
      canvasDimensions,
      multiHandedness.value
    );

    if (multiHandedness.value.length === 0) {
      if (resetPlayback.value) {
        resetPlayback.value();
      }
      if (resetEmphasis.value) {
        resetEmphasis.value();
        emphasisCount.value = 0;
        emphasisStack.value = [];
      }
      if (resetPointing.value) {
        resetPointing.value();
      }
    }

    // POSE HANDLERS
    if (currentPose.value?.class === POSES.EMPHASIS) {
      handleCurrentEmphasis();
    }

    if (currentPose.value?.class === POSES.PLAYBACK) {
      handleCurrentPlayback();
    }

    if (currentPose.value?.class === POSES.POINTING) {
      handleCurrentPointing();
    }

    if (pointingStack.value.length >= 1) {
      pointingStack.value.forEach(({ handPosition }) => {
        console.log(handPosition);
        if (!audienceCanvasCtx.value) return;
        const x = handPosition.right[HAND_LANDMARK_IDS.index_finger_tip].x;
        const y = handPosition.right[HAND_LANDMARK_IDS.index_finger_tip].y;
        audienceCanvasCtx.value?.beginPath();
        audienceCanvasCtx.value?.arc(x, y, 5, 0, 2 * Math.PI, false);
        audienceCanvasCtx.value.fillStyle = "red";
        audienceCanvasCtx.value.fill();
      });
    }
  }
  await getPosePrediction(canvas.value);
}

async function handleCurrentEmphasis() {
  if (emphasisHandler.value) {
    const { stack, count } = emphasisHandler.value(
      {
        left: currentPose.value?.left,
        right: currentPose.value?.right,
      },
      emphasisCount.value
    );
    emphasisStack.value = stack;
    emphasisCount.value = count;
  }
}

async function handleCurrentPlayback() {
  if (playbackHandler.value) {
    isPlaybackMode.value = playbackHandler.value({
      left: currentPose.value?.left,
      right: currentPose.value?.right,
    });
  }
}

async function handleCurrentPointing() {
  if (pointingHandler.value) {
    pointingStack.value = pointingHandler.value({
      left: currentPose.value?.left,
      right: currentPose.value?.right,
    });
  }
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
  // RENDER ON AUDIENCE CANVAS
  if (audienceCanvas.value) {
    audienceCanvasCtx.value = audienceCanvas.value.getContext("2d");
    // const width = audienceCanvas.value?.width || 1280;
    // audienceCanvasCtx.value?.scale(-1, 1);
    // audienceCanvasCtx.value?.translate(-width, 0);
  }
  initializeHands();
  initializeModel();

  const { emphasisHandler: empHandler, resetEmphasis: rstEmphasis } =
    handleEmphasis();
  emphasisHandler.value = empHandler;
  resetEmphasis.value = rstEmphasis;

  const { playbackHandler: pbHandler, resetPlayback: rstPlayback } =
    handlePlayback();
  playbackHandler.value = pbHandler;
  resetPlayback.value = rstPlayback;

  const { pointingHandler: pointHandler, resetPointing: rstPointing } =
    handlePointing();
  pointingHandler.value = pointHandler;
  resetPointing.value = rstPointing;
});
</script>

<template>
  <div class="container">
    <div class="form-container">
      <WebcamVue
        @loaded-data="runDetection"
        @loaded-metadata="setVideoDimensions"
      />
      <div class="form-item">
        <label for="chart-size">Chart Size</label>
        <input
          v-model="chartSize"
          type="range"
          id="chart-size"
          name="chart-size"
          min="0"
          max="1"
          step="0.1"
        />
      </div>
      <div class="form-item">
        <label for="chart-x-position">Chart X Position</label>
        <input
          v-model="chartXPosition"
          type="range"
          id="chart-x-position"
          name="chart-x-position"
          min="0"
          max="300"
        />
      </div>
      <div class="form-item">
        <label for="chart-y-position">Chart Y Position</label>
        <input
          v-model="chartYPosition"
          type="range"
          id="chart-y-position"
          name="chart-y-position"
          min="0"
          max="300"
        />
      </div>
    </div>
    <div class="canvas-container">
      <StyledWindowDiv>
        <CanvasWrapper
          :width="640"
          :height="480"
          v-slot="{ width, height, className }"
        >
          <canvas
            :width="width"
            :height="height"
            :class="className"
            ref="canvas"
          ></canvas>
          <canvas
            :width="width"
            :height="height"
            :class="className"
            ref="audienceCanvas"
          ></canvas>
          <ChartWrapper
            :width="chartWidth"
            :height="chartHeight"
            :x_position="chartXPosition"
            :y_position="chartYPosition"
            :class="className"
            v-slot="{ xAxis, yAxis, xScaleLine, yScale, chartBounds }"
          >
            <ChartAxes
              :width="width"
              :height="height"
              :xAxis="xAxis"
              :yAxis="yAxis"
              :chartBounds="chartBounds"
              :chartSize="chartSize"
            />
            <LineCanvas
              :canvasDimensions="{ width, height }"
              :chartBounds="chartBounds"
              :xScale="xScaleLine"
              :yScale="yScale"
              :className="className"
              :handPosition="playbackHandPosition"
              :fps="emphasisCount"
              :chartSize="chartSize"
            />
            <EmphasisLevelCanvas
              :canvasDimensions="{ width, height }"
              :className="className"
              :level="emphasisCount"
              :decrementEmphasisCount="decrementEmphasisCount"
              :canDecrement="shouldDecrement"
              :emphasisStack="emphasisStack"
            />
          </ChartWrapper>
        </CanvasWrapper>
      </StyledWindowDiv>
      <!-- <StyledWindowDiv>
        <CanvasWrapper
          :width="640"
          :height="480"
          v-slot="{ width, height, className }"
        >
          <canvas
            :width="width"
            :height="height"
            :class="className"
            ref="audienceCanvas"
          ></canvas>
          <ChartWrapper
            :width="chartWidth"
            :height="chartHeight"
            :x_position="0"
            :y_position="0"
            :class="className"
            v-slot="{ xAxis, yAxis, xScaleLine, chartBounds }"
          >
            <ChartAxes
              :width="width"
              :height="height"
              :xAxis="xAxis"
              :yAxis="yAxis"
              :chartBounds="chartBounds"
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
      </StyledWindowDiv> -->
    </div>
  </div>
</template>

<style>
.container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.canvas-container {
  width: 100%;
  display: flex;
  flex-direction: row;
  position: relative;
  justify-content: space-around;
}

.form-container {
  color: black;
}

.form-item {
  display: flex;
  flex-direction: row;
  align-items: center;
}
</style>
