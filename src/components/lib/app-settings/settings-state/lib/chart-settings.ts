import * as d3 from "d3";
import { reactive, computed, ref } from "vue";
import {
  Chart,
  DrawingMode,
  type Coordinate2D,
  type Dimensions,
  type PartialCoordinate2D,
} from "@/utils";

const initialChartWidth = 400;

export const ChartSettings = reactive<{
  dimensions: Dimensions;
  changeDimensions: (width: number) => void;
  position: Coordinate2D;
  changePosition: (coord: PartialCoordinate2D) => void;
  charts: Chart[];
  currentChart?: Chart;
  setCurrentChart: (index: number) => void;
  addChart: (newChart: any) => void;
  changeMargins: (margin: number) => void;
  drawingMode: DrawingMode;
  setDrawingMode: (mode: DrawingMode) => void;
  canvasKeys: string[];
  setCanvasKeys: () => void;
}>({
  canvasKeys: [],
  setCanvasKeys() {
    /**
     * Get keys of all the lines/chart items to be plotted and create a legend key for them
     * This gets used to render the canvases needed for the items and their legend items
     *
     * the keys are used to access the canvas Contexts using CanvasSettings.canvasCtx[<key>]
     */
    const animatedElements = this.currentChart?.getAnimatedElements();

    if (animatedElements) {
      this.canvasKeys = Object.keys(animatedElements).reduce(
        (keys, key: string) => {
          return [...keys, key, `${key}-legend`];
        },
        [] as string[]
      );
    }
  },
  dimensions: {
    width: initialChartWidth,
    height: initialChartWidth * (3 / 4),
    margin: {
      left: 30,
      right: 30,
      top: 30,
      bottom: 30,
    },
  },
  changeDimensions(width: number) {
    const newDimensions = {
      width,
      height: width * (3 / 4),
    };

    this.dimensions = newDimensions;

    if (this.currentChart) {
      this.currentChart.updateState({
        dimensions: newDimensions,
      });
      ChartSettings.currentChart?.draw();
    }
  },
  changeMargins(margin: number) {
    const newDimensions = {
      ...this.dimensions,
      margin: {
        left: margin,
        right: margin,
        top: margin,
        bottom: margin,
      },
    };

    this.dimensions = newDimensions;

    if (this.currentChart) {
      this.currentChart.updateState({
        dimensions: newDimensions,
      });
      ChartSettings.currentChart?.draw();
    }
  },
  position: {
    x: 0,
    y: 0,
  },
  changePosition(coords: PartialCoordinate2D) {
    const newPosition = {
      ...this.position,
      ...(coords.x ? { x: coords.x } : {}),
      ...(coords.y ? { y: coords.y } : {}),
    };

    this.position = newPosition;

    if (this.currentChart) {
      this.currentChart.updateState({
        position: newPosition,
      });
      ChartSettings.currentChart?.draw();
    }
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
    const currentChart = new Chart({
      ...this.charts[index],
    });

    this.currentChart = currentChart;

    // Effects
    this.setCanvasKeys();
  },
  drawingMode: DrawingMode.DROP,
  setDrawingMode(mode: DrawingMode) {
    this.drawingMode = mode;
  },
});

export const animationTrack = ref(1);
