<script setup lang="ts">
import { clearArea, drawXAxis, drawYAxis } from "@/utils";
import { onMounted, ref, watchEffect } from "vue";
import { CanvasSettings, ChartSettings } from "../app-settings/settings-state";

type VideoViewsProps = {
  className?: string;
};
const props = defineProps<VideoViewsProps>();

watchEffect(() => {
  handleDrawAxes();
});

function handleDrawAxes() {
  const fontSize = 11;
  const currentChart = ChartSettings.currentChart;
  const context = CanvasSettings.canvasCtx["axes"];

  if (currentChart && context) {
    const { xAxis: xAxisPosition, yAxis: yAxisPosition } =
      currentChart.getAxesPositions();
    const { xScale, yScale } = currentChart.getScales();
    const { xRange, yRange } = currentChart.getRange();

    clearArea({
      context: context,
      coordinates: { x: 0, y: 0 },
      dimensions: CanvasSettings.dimensions,
    });
    drawXAxis(context, xScale, xAxisPosition, xRange, fontSize);

    drawYAxis(context, yScale, yAxisPosition, yRange, fontSize);
  }
}

onMounted(() => {
  handleDrawAxes();
});
</script>

<template>
  <canvas
    :width="CanvasSettings.dimensions.width"
    :height="CanvasSettings.dimensions.height"
    :class="className"
    :ref="(el) => CanvasSettings.setCanvas(el, 'axes')"
  ></canvas>
</template>

<style></style>
