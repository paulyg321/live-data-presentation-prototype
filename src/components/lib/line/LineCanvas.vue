<script setup lang="ts">
import { onMounted, ref } from "vue";
import { generateLineData, keepBetween, Line } from "@/utils";

const props = defineProps<{
  canvasDimensions: {
    width: number;
    height: number;
  };
  xScale: any;
  className?: string;
}>();
const canvas = ref<HTMLCanvasElement | null>(null);
const canvasCtx = ref<CanvasRenderingContext2D | null>(null);
const line = ref<Line[]>([]);
const endIndex = ref<number>(0);
const fps = ref<number>(10);
const then = ref(Date.now());

function initializeLines() {
  const lineData = generateLineData(30, 200);
  const lineData2 = generateLineData(30, 200);

  line.value = [
    ...line.value,
    new Line({
      data: lineData,
      context: canvasCtx.value,
      xScale: props.xScale,
      canvasDimensions: props.canvasDimensions,
      color: "blue",
    }),
    new Line({
      data: lineData2,
      context: canvasCtx.value,
      xScale: props.xScale,
      canvasDimensions: props.canvasDimensions,
      color: "red",
    }),
  ];
}

function handleMouseMove (event: any) {
  const canvasPosition = event.currentTarget.getBoundingClientRect();
  const x = event.pageX - canvasPosition.left;

  const currentIndex = keepBetween({
    value: props.xScale.invert(x),
    range: { start: 0, end: 100 },
    roundValue: true,
  });

  endIndex.value = currentIndex;
}

function drawLines() {
  const now = Date.now();
  const difference = now - then.value;
  if (difference > 1000 / fps.value) {
    canvasCtx.value?.clearRect(
      0,
      0,
      props.canvasDimensions.width,
      props.canvasDimensions.height
    );
    line.value.forEach((line) => {
      line.setEndIndex(endIndex.value);
      line.setIsSelected(true);
      line.drawLine();
    });
    then.value = now;
  }

  requestAnimationFrame(drawLines);
}

onMounted(() => {
  if (canvas.value) {
    canvasCtx.value = canvas.value.getContext("2d");
  }
  initializeLines();
  drawLines();
});
</script>

<template>
  <canvas
    :width="canvasDimensions.width"
    :height="canvasDimensions.height"
    :class="className"
    ref="canvas"
    @mousemove="handleMouseMove"
  ></canvas>
  <p>HERE</p>
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
