<script setup lang="ts">
import { drawXAxis, drawYAxis } from "@/utils";
import { onMounted, ref } from "vue";
// --- TYPES ---
type XAxisArgs = {
  xScale: any;
  Y: number;
  xExtent: number[];
};
type YAxisArgs = {
  yScale: any;
  X: number;
  yExtent: number[];
};

// --- PROPS ---
const props = defineProps<{
  xAxis?: XAxisArgs;
  yAxis?: YAxisArgs;
  width: number;
  height: number;
}>();

const canvas = ref<HTMLCanvasElement | null>();
const canvasCtx = ref<CanvasRenderingContext2D | null>();

onMounted(() => {
  if (canvas.value) {
    canvasCtx.value = canvas.value.getContext("2d");
  }
  if (canvasCtx.value) {
    drawXAxis(
      canvasCtx.value,
      props.xAxis?.xScale,
      props.xAxis?.Y ?? 0,
      props.xAxis?.xExtent ?? [0, 0]
    );

    console.log("here");
    drawYAxis(
      canvasCtx.value,
      props.yAxis?.yScale,
      props.yAxis?.X ?? 0,
      props.yAxis?.yExtent ?? [0, 0]
    );
  }
});
</script>

<template>
  <canvas :width="width" :height="height" ref="canvas"></canvas>
</template>

<style></style>
