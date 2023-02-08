<script setup lang="ts">
import type { Dimensions } from "@/utils";
import { onMounted, ref } from "vue";

const legendPosition = {
  x: 150,
  y: 580,
};

const RECT_HEIGHT = 50;
const RECT_WIDTH = 200;

const props = defineProps<{
  canvasDimensions: Dimensions;
  items: string[];
  className?: string;
}>();
const canvas = ref<HTMLCanvasElement | null>(null);
const canvasCtx = ref<CanvasRenderingContext2D | null>(null);

function drawLegend() {
  canvasCtx.value?.clearRect(
    0,
    0,
    props.canvasDimensions.width,
    props.canvasDimensions.height
  );
  props.items.forEach((item, index) => {
    const Y_POS = legendPosition.y + index * RECT_HEIGHT;
    canvasCtx.value?.strokeRect(
      legendPosition.x,
      Y_POS,
      RECT_WIDTH,
      RECT_HEIGHT
    );
  });
}

onMounted(() => {
  if (canvas.value) {
    canvasCtx.value = canvas.value.getContext("2d");
  }
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
