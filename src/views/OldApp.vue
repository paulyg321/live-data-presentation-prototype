<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import * as handtrack from "handtrackjs";
import * as d3 from "d3";
import _ from "lodash";

interface VideoSourcesTypes {
  label: string;
  id: string;
}

const stream = ref();
const video = ref<HTMLVideoElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const context = computed(() => canvas.value?.getContext("2d"));
let model: any = null;
const videoSources = ref<VideoSourcesTypes[]>([]);
const currentSource = ref<string>("");
const endIndex = ref(0);
const firstPathSelected = ref(false);
const secondPathSelected = ref(false);

const firstPath = new Array(100)
  .fill(0)
  .map((val, index) => ({ x: index, y: getRandomArbitrary(40, 100) }));

const secondPath = new Array(100)
  .fill(0)
  .map((val, index) => ({ x: index, y: getRandomArbitrary(100, 150) }));

const firstLine = {
  path: firstPath,
  bounds: getLineArea(firstPath),
};

const secondLine = {
  path: secondPath,
  bounds: getLineArea(secondPath),
};

function getLineArea(path: any) {
  return path.reduce(
    (aggregated: any, p: any) => {
      if (p.x >= aggregated.maxX) {
        aggregated.maxX = p.x;
      }
      if (p.y >= aggregated.maxY) {
        aggregated.maxY = p.y;
      }
      if (p.x <= aggregated.minX) {
        aggregated.minX = p.x;
      }
      if (p.y <= aggregated.minY) {
        aggregated.minY = p.y;
      }

      return aggregated;
    },
    {
      maxX: -Infinity,
      maxY: -Infinity,
      minX: Infinity,
      minY: Infinity,
    }
  );
}

const modelParams = {
  flipHorizontal: true, // flip e.g for video
  maxNumBoxes: 20, // maximum number of boxes to detect
  iouThreshold: 0.5, // ioU threshold for non-max suppression
  scoreThreshold: 0.6, // confidence threshold for predictions.
  modelSize: "large",
};

const colorMap = {
  open: "#374151",
  closed: "#B91C1C",
  pinch: "#F59E0B",
  point: "#10B981",
  face: "#3B82F6",
  tip: "#6366F1",
  pinchtip: "#EC4899",
};

async function setModel() {
  const lmodel = await handtrack.load(modelParams);
  model = lmodel;
}

async function getVideoSources() {
  const mediaDevices = await navigator.mediaDevices.enumerateDevices();
  mediaDevices.forEach((device) => {
    if (device.kind === "videoinput") {
      videoSources.value.push({
        label: device.label,
        id: device.deviceId,
      });
    }
  });
}

async function getVideoStream() {
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: currentSource.value,
      },
    });
  } catch (error) {
    console.log("error", error);
  }
}

async function runDetection() {
  if (model) {
    const predictions = await model.detect(video.value);
    console.log(video.value);
    renderPredictions(predictions, canvas.value, context.value, video.value);
    requestAnimationFrame(runDetection);
  }
}

function handleLoadedMetadata() {
  if (video.value) {
    video.value.width = 640;
    video.value.height =
      video.value.width * (video.value.videoHeight / video.value.videoWidth); //* (3 / 4);
    video.value.play();
  }
}

function handleChangeSource(event: any) {
  currentSource.value = event.target.value;
  getVideoStream();
}

function renderPredictions(
  predictions: any = [],
  canvas: any,
  context: any,
  mediasource: any
) {
  // CONSTANTS
  const FLIP_HORIZONTAL = true;
  const CANVAS_DIMENSIONS = {
    width: mediasource.width,
    height: mediasource.height,
  };

  const CHART_DIMENSIONS = {
    width: CANVAS_DIMENSIONS.width * 0.75,
    height: CANVAS_DIMENSIONS.height * 0.75,
    margin: {
      left: 30,
      right: 30,
      top: 30,
      bottom: 30,
    },
  };

  const CHART_POSITION = {
    x: (CANVAS_DIMENSIONS.width - CHART_DIMENSIONS.width) / 2,
    y: 0,
  };

  // const FONT_SIZE = 16;
  // const LINE_WIDTH = 2;

  canvas.width = CANVAS_DIMENSIONS.width;
  canvas.height = CANVAS_DIMENSIONS.width;

  context.save();

  context.clearRect(0, 0, CANVAS_DIMENSIONS.width, CANVAS_DIMENSIONS.height);

  if (FLIP_HORIZONTAL) {
    context.scale(-1, 1);
    context.translate(-CANVAS_DIMENSIONS.width, 0);
  }

  context.drawImage(
    mediasource,
    0,
    0,
    CANVAS_DIMENSIONS.width,
    CANVAS_DIMENSIONS.height
  );

  context.restore();

  const chartBounds = {
    start: CHART_POSITION.x + CHART_DIMENSIONS.margin.left,
    end:
      CHART_POSITION.x +
      (CHART_DIMENSIONS.width - CHART_DIMENSIONS.margin.right),
  };

  const xDomain = [new Date(2000, 0, 1), new Date(2020, 12, 31)];
  const xDomainAlternate = [0, 100];
  const xRange = [chartBounds.start, chartBounds.end];
  const xScale = d3.scaleTime(xDomain, xRange);
  const xScaleAlternate = d3.scaleTime(xDomainAlternate, xRange);
  const xAxisVerticalPos =
    CHART_DIMENSIONS.height - CHART_DIMENSIONS.margin.top;

  drawXAxis(context, xScale, xAxisVerticalPos, xRange);

  const yDomain = [0, 100];
  const yRange = [
    CHART_DIMENSIONS.margin.top,
    CHART_DIMENSIONS.height - CHART_DIMENSIONS.margin.bottom,
  ];
  const yScale = d3.scaleLinear(yDomain, yRange);
  const yAxisHorizontalPos = CHART_POSITION.x + CHART_DIMENSIONS.margin.left;

  drawYAxis(context, yScale, yAxisHorizontalPos, yRange);

  controlEndIndexWithChartGestures(predictions, xScaleAlternate, chartBounds);

  drawLine(context, endIndex.value, xScaleAlternate);
}

function controlEndIndexWithChartGestures(
  predictions: any,
  xScale: any,
  chartBounds: any
) {
  predictions.forEach((prediction: any) => {
    if (prediction.class === 3) {
      if (
        prediction.bbox[0] >= chartBounds.start &&
        prediction.bbox[0] <= chartBounds.end
      ) {
        endIndex.value = xScale.invert(prediction.bbox[0]);
      }
    }
    if (prediction.class === 4) {
      isSelected(prediction, xScale);
    }
  });
}

function isSelected(prediction: any, xScale: any) {
  if (
    xScale.invert(prediction.bbox[0]) >= firstLine.bounds.minX &&
    xScale.invert(prediction.bbox[0]) <= firstLine.bounds.maxX &&
    prediction.bbox[1] >= firstLine.bounds.minY &&
    prediction.bbox[1] <= firstLine.bounds.maxY
  ) {
    debouncedFirstSelect();
  }
  if (
    xScale.invert(prediction.bbox[0]) >= secondLine.bounds.minX &&
    xScale.invert(prediction.bbox[0]) <= secondLine.bounds.maxX &&
    prediction.bbox[1] >= secondLine.bounds.minY &&
    prediction.bbox[1] <= secondLine.bounds.maxY
  ) {
    debouncedSecondSelect();
  }
}

function setFirstSelected() {
  console.log("called");
  firstPathSelected.value = !firstPathSelected.value;
}
function setSecondSelected() {
  console.log("called second");
  secondPathSelected.value = !secondPathSelected.value;
}

const debouncedFirstSelect = _.debounce(setFirstSelected, 1000);
const debouncedSecondSelect = _.debounce(setSecondSelected, 1000);

function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function drawLine(ctx: any, finalIndex: number, scale: any) {
  ctx.save();
  let firstPathArray: any = firstLine.path;
  if (firstPathSelected.value) {
    ctx.strokeStyle = "red";
    firstPathArray = firstLine.path.slice(0, finalIndex);
  }
  firstPathArray.forEach((path: any, index: any) => {
    if (index === 0) {
      ctx.moveTo(scale(path.x), path.y);
    }
    ctx.lineTo(scale(path.x), path.y);
  });
  ctx.stroke();
  let secondPathArray: any = secondLine.path;
  if (secondPathSelected.value) {
    ctx.strokeStyle = "black";
    secondPathArray = secondLine.path.slice(0, finalIndex);
  }
  secondPathArray.forEach((path: any, index: any) => {
    if (index === 0) {
      ctx.moveTo(scale(path.x), path.y);
    }
    ctx.lineTo(scale(path.x), path.y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawXAxis(context: any, xScale: any, Y: any, xExtent: any) {
  const [startX, endX] = xExtent;
  const tickSize = 6,
    xTicks = xScale.ticks(), // You may choose tick counts. ex: xScale.ticks(20)
    xTickFormat = xScale.tickFormat(); // you may choose the format. ex: xScale.tickFormat(tickCount, ".0s")

  context.strokeStyle = "black";

  context.beginPath();
  xTicks.forEach((d: any) => {
    context.moveTo(xScale(d), Y);
    context.lineTo(xScale(d), Y + tickSize);
  });
  context.stroke();

  context.beginPath();
  context.moveTo(startX, Y + tickSize);
  context.lineTo(startX, Y);
  context.lineTo(endX, Y);
  context.lineTo(endX, Y + tickSize);
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "black";
  xTicks.forEach((d: any) => {
    context.beginPath();
    context.fillText(xTickFormat(d), xScale(d), Y + tickSize);
  });
}

function drawYAxis(context: any, yScale: any, X: any, yExtent: any) {
  const [startY, endY] = yExtent;
  const tickPadding = 3,
    tickSize = 6,
    yTicks = yScale.ticks(10),
    yTickFormat = yScale.tickFormat();

  context.strokeStyle = "black";
  context.beginPath();
  yTicks.forEach((d: any) => {
    context.moveTo(X, yScale(d));
    context.lineTo(X - tickSize, yScale(d));
  });
  context.stroke();

  context.beginPath();
  context.moveTo(X - tickSize, startY);
  context.lineTo(X, startY);
  context.lineTo(X, endY);
  context.lineTo(X - tickSize, endY);
  context.stroke();

  context.textAlign = "right";
  context.textBaseline = "middle";
  context.fillStyle = "black";
  yTicks.forEach((d: any) => {
    context.beginPath();
    context.fillText(yTickFormat(d), X - tickSize - tickPadding, yScale(d));
  });
}

onMounted(async () => {
  await setModel();
  await getVideoSources();
});
</script>

<template>
  <div id="app-container">
    <h1>Live Presentation Proto</h1>
    <canvas ref="canvas"></canvas>
    <video
      class="canvasbox"
      ref="video"
      autoplay="true"
      :srcObject="stream"
      @loadeddata="runDetection"
      @loadedmetadata="handleLoadedMetadata"
    ></video>
    <select
      :value="currentSource"
      @change="handleChangeSource"
      v-model="currentSource"
    >
      <option value="" disabled selected>Select Camera</option>
      <option
        v-for="videoSource in videoSources"
        :value="videoSource.id"
        :key="videoSource.id"
      >
        {{ videoSource.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
#app-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
}

.canvasbox {
  display: none;
  border-radius: 3px;
  margin-right: 10px;
  width: 450px;
  height: 338px;
  border-bottom: 3px solid #0063ff;
  box-shadow: 0 2px 3px 0 rgba(0, 0, 0, 0.2), 0 4px 10px 0 #00000030;
}
</style>
