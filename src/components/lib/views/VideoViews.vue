<script setup lang="ts">
import { onMounted, ref } from "vue";

type VideoViewsProps = {
  width: number;
  height: number;
  canvas: HTMLCanvasElement | null;
  canvasCtx: CanvasRenderingContext2D | null | undefined;
  className?: string;
};
const props = defineProps<VideoViewsProps>();

const canvas = ref<HTMLCanvasElement | null>(null);
const canvasCtx = ref<CanvasRenderingContext2D | null>(null);

function renderCanvas() {
  if (props.canvas) {
    canvasCtx.value?.clearRect(0, 0, props.width, props.height);
    canvasCtx.value?.drawImage(props.canvas, 0, 0);
  }
  requestAnimationFrame(renderCanvas);
}

onMounted(() => {
  if (canvas.value) {
    canvasCtx.value = canvas.value.getContext("2d");
  }
  renderCanvas();
});
</script>

<template>
  <canvas
    :width="width"
    :height="height"
    :class="className"
    ref="canvas"
  ></canvas>
</template>

<style>
</style>
