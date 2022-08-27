<script setup lang="ts">
import * as d3 from "d3";

const props = defineProps<{
  width: number;
  height: number;
}>();

const CHART_DIMENSIONS = {
  width: props.width * 0.75,
  height: props.height * 0.75,
  margin: {
    left: 30,
    right: 30,
    top: 30,
    bottom: 30,
  },
};

const CHART_POSITION = {
  x: (props.width - CHART_DIMENSIONS.width) / 2,
  y: 0,
};

const chartBounds = {
  start: CHART_POSITION.x + CHART_DIMENSIONS.margin.left,
  end:
    CHART_POSITION.x + (CHART_DIMENSIONS.width - CHART_DIMENSIONS.margin.right),
};

// ---- X SCALE FOR AXIS ----

const xDomain = [new Date(2000, 0, 1), new Date(2020, 12, 31)];
const xRange = [chartBounds.start, chartBounds.end];
const xScale = d3.scaleTime(xDomain, xRange);
const xAxisVerticalPos = CHART_DIMENSIONS.height - CHART_DIMENSIONS.margin.top;

const xAxis = {
  xScale,
  Y: xAxisVerticalPos,
  xExtent: xRange,
};

// ---- Y SCALE FOR AXIS ----

const yDomain = [0, 100];
const yRange = [
  CHART_DIMENSIONS.margin.top,
  CHART_DIMENSIONS.height - CHART_DIMENSIONS.margin.bottom,
];
const yScale = d3.scaleLinear(yDomain, yRange);
const yAxisHorizontalPos = CHART_POSITION.x + CHART_DIMENSIONS.margin.left;

const yAxis = {
  yScale,
  X: yAxisHorizontalPos,
  yExtent: yRange,
};

// ---- X SCALE FOR LINE ---
const xDomainLine = [0, 100];
const xRangeLine = [chartBounds.start, chartBounds.end];
const xScaleLine = d3.scaleLinear(xDomainLine, xRangeLine);
</script>

<template>
  <slot :xAxis="xAxis" :yAxis="yAxis" :xScaleLine="xScaleLine"></slot>
</template>

<style></style>
