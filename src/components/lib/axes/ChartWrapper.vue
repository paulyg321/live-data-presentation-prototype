<script setup lang="ts">
import * as d3 from "d3";
import { computed } from "vue";

const props = defineProps<{
  width: number;
  height: number;
  x_position: number;
  y_position: number;
}>();

const CHART_DIMENSIONS = computed(() => {
  return {
    width: props.width,
    height: props.height,
    margin: {
      left: 30,
      right: 30,
      top: 30,
      bottom: 30,
    },
  };
});

const CHART_POSITION = computed(() => {
  return {
    x: parseInt(props.x_position),
    y: parseInt(props.y_position),
  };
});

const chartBounds = computed(() => {
  return {
    x: {
      start: CHART_POSITION.value.x + CHART_DIMENSIONS.value.margin.left,
      end:
        CHART_POSITION.value.x +
        (CHART_DIMENSIONS.value.width - CHART_DIMENSIONS.value.margin.right),
    },
    y: {
      start:
        CHART_POSITION.value.y +
        (CHART_DIMENSIONS.value.height - CHART_DIMENSIONS.value.margin.bottom),
      end: CHART_POSITION.value.y + CHART_DIMENSIONS.value.margin.top,
    },
  };
});

// ---- X SCALE FOR AXIS ----

const xDomain = [new Date(2000, 0, 1), new Date(2020, 12, 31)];
const xRange = computed(() => {
  return [chartBounds.value.x.start, chartBounds.value.x.end];
});
const xScale = computed(() => d3.scaleTime(xDomain, xRange.value));
const xAxisVerticalPos = computed(
  () =>
    CHART_POSITION.value.y +
    (CHART_DIMENSIONS.value.height - CHART_DIMENSIONS.value.margin.top)
);

const xAxis = computed(() => ({
  xScale: xScale.value,
  Y: xAxisVerticalPos.value,
  xExtent: xRange.value,
}));

// ---- Y SCALE FOR AXIS ----

const yDomain = [0, 100];
const yRange = computed(() => [
  chartBounds.value.y.start,
  chartBounds.value.y.end,
]);
const yScale = computed(() => d3.scaleLinear(yDomain, yRange.value));
const yAxisHorizontalPos = computed(
  () => CHART_POSITION.value.x + CHART_DIMENSIONS.value.margin.left
);

const yAxis = computed(() => ({
  yScale: yScale.value,
  X: yAxisHorizontalPos.value,
  yExtent: yRange.value,
}));

// ---- X SCALE FOR LINE ---
const xDomainLine = [0, 20];
const xRangeLine = computed(() => [
  chartBounds.value.x.start,
  chartBounds.value.x.end,
]);
const xScaleLine = computed(() =>
  d3.scaleLinear(xDomainLine, xRangeLine.value)
);
</script>

<template>
  <slot
    :xAxis="xAxis"
    :yAxis="yAxis"
    :xScaleLine="xScaleLine"
    :yScale="yScale"
    :chartBounds="chartBounds"
  ></slot>
</template>

<style></style>
