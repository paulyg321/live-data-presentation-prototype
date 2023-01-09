import * as d3 from "d3";
import { reactive, computed } from "vue";
import { Chart } from "@/utils";

const initialChartWidth = 640;

export const ChartSettings = reactive<{
  chartWidth: number;
  chartHeight: number;
  changeChartWidth: (value: number) => void;
  yPosition: number;
  changeYPosition: (value: number) => void;
  xPosition: number;
  changeXPosition: (value: number) => void;
  charts: Chart[];
  currentChart?: Chart;
  setCurrentChart: (index: number) => void;
  addChart: (newChart: any) => void;
  margins: number;
  changeMargins: (margin: number) => void;
}>({
  chartWidth: initialChartWidth,
  chartHeight: initialChartWidth * (3 / 4),
  changeChartWidth(width: number) {
    this.chartWidth = width;
    this.chartHeight = width * (3 / 4);
  },
  yPosition: 0,
  changeYPosition(value: number) {
    this.yPosition = value;
  },
  xPosition: 0,
  changeXPosition(value: number) {
    this.xPosition = value;
  },
  charts: localStorage.getItem("charts")
    ? JSON.parse(localStorage.getItem("charts") || "")
    : [],
  currentChart: undefined,
  addChart(newChart: any) {
    this.charts = [...this.charts, newChart];
    localStorage.setItem("charts", JSON.stringify(this.charts));
  },
  setCurrentChart(index: number) {
    this.currentChart = new Chart({
      ...this.charts[index],
    });
  },
  margins: 30,
  changeMargins(margin: number) {
    this.margins = margin;
  },
});

export const CHART_DIMENSIONS = computed(() => {
  return {
    width: ChartSettings.chartWidth,
    height: ChartSettings.chartHeight,
    margin: {
      left: 30,
      right: 30,
      top: 30,
      bottom: 30,
    },
  };
});

export const CHART_POSITION = computed(() => {
  return {
    x: ChartSettings.xPosition,
    y: ChartSettings.yPosition,
  };
});

export const chartBounds = computed(() => {
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

const xDomain = computed(() => {
  return ChartSettings.currentChart?.xDomain ?? [0, 11];
});
export const xRange = computed(() => {
  return [chartBounds.value.x.start, chartBounds.value.x.end];
});
export const xScale = computed(() => {
  return d3.scaleLinear(xDomain.value, xRange.value);
});
export const xAxisVerticalPos = computed(
  () =>
    CHART_POSITION.value.y +
    (CHART_DIMENSIONS.value.height - CHART_DIMENSIONS.value.margin.top)
);

export const xAxis = computed(() => ({
  xScale: xScale.value,
  Y: xAxisVerticalPos.value,
  xExtent: xRange.value,
}));

// ---- Y SCALE FOR AXIS ----
const yDomain = computed(() => {
  return ChartSettings.currentChart?.yDomain ?? [0, 100];
});
export const yRange = computed(() => [
  chartBounds.value.y.start,
  chartBounds.value.y.end,
]);
export const yScale = computed(() =>
  d3.scaleLinear(yDomain.value, yRange.value)
);
export const yAxisHorizontalPos = computed(
  () => CHART_POSITION.value.x + CHART_DIMENSIONS.value.margin.left
);

export const yAxis = computed(() => ({
  yScale: yScale.value,
  X: yAxisHorizontalPos.value,
  yExtent: yRange.value,
}));
