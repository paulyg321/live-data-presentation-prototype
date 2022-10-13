<script setup lang="ts">
import { computed, onMounted, ref, watch, type ComputedRef } from "vue";
import {
  generateLineData,
  keepBetween,
  Legend,
  legendPosition,
  Line,
  MOCK_LINE,
  MOCK_LINE_2,
  MOCK_LINE_3,
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
  yScale: any;
  className?: string;
  handPosition?: {
    left: Coordinates;
    right: Coordinates;
  };
  fps: number;
  chartSize: number;
}>();
const lineCanvas = ref<HTMLCanvasElement | null>(null);
const lineCanvasCtx = ref<CanvasRenderingContext2D | null>(null);
const legendCanvas = ref<HTMLCanvasElement | null>(null);
const legendCanvasCtx = ref<CanvasRenderingContext2D | null>(null);
const lines = ref<Line[]>([]);
const then = ref(Date.now());

const handTracker = computed(() => {
  return new Line({
    data: [],
    context: lineCanvasCtx.value,
    xScale: props.xScale,
    canvasDimensions: props.canvasDimensions,
    color: "white",
    label: "Hand Tracker",
    endIndex: 20,
  });
});
const lineData = computed(() => {
  return MOCK_LINE.map((point) => ({
    ...point,
    y: props.yScale(point.y * props.chartSize),
  }));
});
const lineData2 = computed(() => {
  return MOCK_LINE_2.map((point) => ({
    ...point,
    y: props.yScale(point.y * props.chartSize),
  }));
});
const lineData3 = computed(() => {
  return MOCK_LINE_3.map((point) => ({
    ...point,
    y: props.yScale(point.y * props.chartSize),
  }));
});

watch(
  () => props.chartBounds,
  () => {
    lines.value = lines.value.map((line) => {
      switch (line.getLabel()) {
        case "USA":
          line.setData(lineData.value);
          break;
        case "Canada":
          line.setData(lineData2.value);
          break;
        case "Mexico":
          line.setData(lineData3.value);
          break;
        default:
          break;
      }
      line.setXscale(props.xScale);
      line.setYscale(props.yScale);
      return line;
    });
  }
);

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

const legends = computed(() => {
  return lines.value?.map((line: any, index: number) => {
    return new Legend({
      label: line.getLabel(),
      context: legendCanvasCtx.value,
      color: line.getColor(),
      position: {
        x: legendPosition.x,
        y: legendPosition.y + index * Legend.height,
      },
      line: line as Line,
    });
  });
});

function drawLines() {
  const now = Date.now();
  const difference = now - then.value;
  if (difference > 1000 / EMPHASIS_TO_FPS[props.fps]) {
    lineCanvasCtx.value?.clearRect(
      0,
      0,
      props.canvasDimensions.width,
      props.canvasDimensions.height
    );
    if (lineCanvasCtx.value) {
      lineCanvasCtx.value.fillStyle = "rgba(0,0,0,0.6)";
    }
    legends.value?.forEach((legend: any) => {
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
  legends.value?.forEach((legend: any) => {
    legend.drawLegend();
  });
}

function initializeLines() {
  const endIndex = 20;
  lines.value = [
    new Line({
      data: lineData.value,
      context: lineCanvasCtx.value,
      xScale: props.xScale,
      canvasDimensions: props.canvasDimensions,
      color: "rgba(4,217,255,0.8)",
      label: "USA",
      endIndex,
    }),
    new Line({
      data: lineData2.value,
      context: lineCanvasCtx.value,
      xScale: props.xScale,
      canvasDimensions: props.canvasDimensions,
      color: "rgba(247,33,25,0.8)",
      label: "Canada",
      endIndex,
    }),
    new Line({
      data: lineData3.value,
      context: lineCanvasCtx.value,
      xScale: props.xScale,
      canvasDimensions: props.canvasDimensions,
      color: "rgba(0,255,0,0.6)",
      label: "Mexico",
      endIndex,
    }),
  ];
}

onMounted(() => {
  if (lineCanvas.value) {
    lineCanvasCtx.value = lineCanvas.value.getContext("2d");
  }
  if (legendCanvas.value) {
    legendCanvasCtx.value = legendCanvas.value.getContext("2d");
  }
  initializeLines();
  drawLines();
  drawLegend();
});
</script>

<template>
  <canvas
    :width="canvasDimensions.width"
    :height="canvasDimensions.height"
    :class="className"
    ref="lineCanvas"
  ></canvas>
  <canvas
    :width="canvasDimensions.width"
    :height="canvasDimensions.height"
    :class="className"
    ref="legendCanvas"
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
