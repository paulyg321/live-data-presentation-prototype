<script setup lang="ts">
import { computed, onMounted, ref, type ComputedRef } from "vue";
import {
  generateLineData,
  keepBetween,
  Legend,
  legendPosition,
  Line,
  type Coordinates,
} from "@/utils";

const EMPHASIS_TO_FPS = [10, 20, 40, 60];

const props = defineProps<{
  canvasDimensions: {
    width: number;
    height: number;
  };
  chartBounds: {
    x: {
      start: number;
      end: number;
    };
    y: {
      start: number;
      end: number;
    };
  };
  xScale: any;
  className?: string;
  handPosition?: {
    left: Coordinates;
    right: Coordinates;
  };
  fps: number;
}>();
const canvas = ref<HTMLCanvasElement | null>(null);
const canvasCtx = ref<CanvasRenderingContext2D | null>(null);
const lines = ref<Line[]>([]);
const handTracker = ref<Line>();
const legends = ref<Legend[]>([]);
const then = ref(Date.now());

const computedIndex: ComputedRef<number> = computed(() => {
  if (props.handPosition) {
    const val = keepBetween({
      value: props.xScale.invert(props.handPosition.right.x),
      range: { start: 0, end: 20 },
      roundValue: true,
    });

    return val;
  }

  return computedIndex.value;
});

function initializeLines() {
  const lineData = generateLineData(30, 200);
  const lineData2 = generateLineData(50, 200);
  const lineData3 = generateLineData(80, 300);

  lines.value = [
    ...lines.value,
    new Line({
      data: lineData,
      context: canvasCtx.value,
      xScale: props.xScale,
      canvasDimensions: props.canvasDimensions,
      color: "rgba(4,217,255,0.8)",
      label: "USA",
    }),
    new Line({
      data: lineData2,
      context: canvasCtx.value,
      xScale: props.xScale,
      canvasDimensions: props.canvasDimensions,
      color: "rgba(247,33,25,0.8)",
      label: "Canada",
    }),
    new Line({
      data: lineData3,
      context: canvasCtx.value,
      xScale: props.xScale,
      canvasDimensions: props.canvasDimensions,
      color: "rgba(0,255,0,0.6)",
      label: "Mexico",
    }),
  ];

  handTracker.value = new Line({
    data: [],
    context: canvasCtx.value,
    xScale: props.xScale,
    canvasDimensions: props.canvasDimensions,
    color: "white",
    label: "Hand Tracker",
  });
}

function initializeLegends() {
  legends.value = lines.value.map((line, index) => {
    return new Legend({
      label: line.getLabel(),
      context: canvasCtx.value,
      color: line.getColor(),
      position: {
        x: legendPosition.x,
        y: legendPosition.y + index * Legend.height,
      },
      line: line as Line,
    });
  });
}

function drawLines() {
  const now = Date.now();
  const difference = now - then.value;
  if (difference > 1000 / EMPHASIS_TO_FPS[props.fps]) {
    canvasCtx.value?.clearRect(
      props.chartBounds.x.start,
      props.chartBounds.y.start,
      props.canvasDimensions.width,
      props.chartBounds.y.end - props.chartBounds.y.start
    );
    if (canvasCtx.value) {
      canvasCtx.value.fillStyle = "rgba(0,0,0,0.6)";
    }
    canvasCtx.value?.fillRect(
      props.chartBounds.x.start,
      props.chartBounds.y.start,
      props.chartBounds.x.end - props.chartBounds.x.start,
      props.chartBounds.y.end - props.chartBounds.y.start
    );
    legends.value.forEach((legend, index) => {
      const line = legend.getLine();
      if (props.handPosition) {
        legend.handleHover(props.handPosition.left, computedIndex.value, () => {
          handTracker.value?.setColor(legend.getLine().getColor());
        });
      }

      line.drawLine();
    });
    if (props.handPosition) {
      const RIGHT_X = props.xScale.invert(props.handPosition.right.x);
      handTracker.value?.setData([
        { x: RIGHT_X, y: props.chartBounds.y.start - 10 },
        { x: RIGHT_X, y: props.chartBounds.y.end + 10 },
      ]);
      handTracker.value?.drawLine();
    }
    then.value = now;
  }

  requestAnimationFrame(drawLines);
}

function drawLegend() {
  legends.value.forEach((legend) => {
    legend.drawLegend();
  });
}

onMounted(() => {
  if (canvas.value) {
    canvasCtx.value = canvas.value.getContext("2d");
  }
  initializeLines();
  initializeLegends();
  drawLines();
  drawLegend();
});
</script>

<template>
  <canvas
    :width="canvasDimensions.width"
    :height="canvasDimensions.height"
    :class="className"
    ref="canvas"
  ></canvas>
</template>

<style>
.canvas-wrapper {
  position: relative;
}
.canvas-elements {
  position: absolute;
  left: 0;
  top: 0;
}
</style>
