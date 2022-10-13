<script setup lang="ts">
import { drawXAxis, drawYAxis } from "@/utils";
import { computed, onMounted, ref } from "vue";
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
  chartSize: number;
}>();

const canvas = ref<HTMLCanvasElement | null>();
const canvasCtx = ref<CanvasRenderingContext2D | null>();
const fontSize = computed(() => {
  return Math.round(6 + 6 * props.chartSize);
});

function handleDrawAxes() {
  if (canvasCtx.value) {
    canvasCtx.value.clearRect(0, 0, props.width, props.height);
    drawXAxis(
      canvasCtx.value,
      props.xAxis?.xScale,
      props.xAxis?.Y ?? 0,
      props.xAxis?.xExtent ?? [0, 0],
      fontSize.value
    );

    drawYAxis(
      canvasCtx.value,
      props.yAxis?.yScale,
      props.yAxis?.X ?? 0,
      props.yAxis?.yExtent ?? [0, 0],
      fontSize.value
    );
  }
  requestAnimationFrame(handleDrawAxes);
}

onMounted(() => {
  if (canvas.value) {
    canvasCtx.value = canvas.value.getContext("2d");
  }
  handleDrawAxes();
});
</script>

<template>
  <canvas :width="width" :height="height" ref="canvas"></canvas>
</template>

<style></style>
