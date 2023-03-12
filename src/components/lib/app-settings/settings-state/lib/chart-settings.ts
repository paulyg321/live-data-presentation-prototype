import * as d3 from "d3";
import { reactive, ref } from "vue";
import {
  AnimatedCircle,
  AnimatedLine,
  Chart,
  DrawingMode,
  AnimatedLineDrawingModeToEaseFunctionMap,
  AnimatedCircleDrawingModeToEaseFunctionMap,
  type Coordinate2D,
  type Dimensions,
  type PartialCoordinate2D,
  ChartTypeValue,
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
  addChart: (newChart: Chart) => void;
  iterateOverChartItems: (
    callbackFn: (items: AnimatedCircle | AnimatedLine) => void
  ) => void;
  changeMargins: (margin: number) => void;
  canvasKeys: string[];
  setCanvasKeys: () => void;
  animationMode: DrawingMode;
  setAnimationMode: (mode: DrawingMode) => void;
  handlePlay: (type: string, callbackFn?: any) => void;
  selectedChartItems: string[];
  addSelectedChartItem: (itemKey: string) => void;
  removeSelectedChartItem: (itemKey: string) => void;
  isItemSelected: (itemKey: AnimatedCircle | AnimatedLine | string) => boolean;
  playbackExtent: number;
  setPlaybackExtent: (value: number) => void;
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
    const elementKeys =
      animatedElements?.map(
        (item: AnimatedLine | AnimatedCircle) => item.key
      ) ?? [];

    this.canvasKeys = [...elementKeys, "legend"];
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
      this.currentChart?.drawAll();
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
      this.currentChart?.drawAll();
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
      this.currentChart?.drawAll();
    }
  },
  charts: localStorage.getItem("charts")
    ? JSON.parse(localStorage.getItem("charts") || "")
    : [],
  currentChart: undefined,
  addChart(newChart: Chart) {
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
  iterateOverChartItems(
    callbackFn: (item: AnimatedCircle | AnimatedLine) => void
  ) {
    (this.currentChart?.getAnimatedElements() ?? []).forEach(
      (item: AnimatedCircle | AnimatedLine) => {
        callbackFn(item);
      }
    );
  },

  // States for drawing
  animationMode: DrawingMode.UNDULATE_ANIMATION,
  setAnimationMode(mode: DrawingMode) {
    this.animationMode = mode;
  },
  handlePlay(type: string, callbackFn?: any) {
    const play = ({ item }: { item: any }) => {
      let transitionFunction,
        duration = 3000;

      if (this.currentChart?.type.value === ChartTypeValue.LINE) {
        ({ transitionFunction, duration } =
          AnimatedLineDrawingModeToEaseFunctionMap[`${this.animationMode}`]);
      }
      if (this.currentChart?.type.value === ChartTypeValue.SCATTER) {
        ({ transitionFunction, duration } =
          AnimatedCircleDrawingModeToEaseFunctionMap[`${this.animationMode}`]);
      }

      item.updateState({ duration });

      if (type === "prev") {
        item.animateToPreviousState({
          playRemainingStates: false,
          transitionFunction,
          mode: this.animationMode,
          callbackFn,
        });
      } else if (type === "next") {
        item.animateToNextState({
          playRemainingStates: false,
          transitionFunction,
          mode: this.animationMode,
          callbackFn,
        });
      } else if (type === "all") {
        item.animateToNextState({
          playRemainingStates: true,
          transitionFunction,
          mode: this.animationMode,
          callbackFn,
        });
      }
    };

    this.iterateOverChartItems((item: AnimatedCircle | AnimatedLine) => {
      if (this.selectedChartItems.length === 0) {
        play({
          item,
        });
      } else if (this.isItemSelected(item)) {
        play({
          item,
        });
      }
    });
  },
  selectedChartItems: [],
  removeSelectedChartItem(itemKey: string) {
    this.selectedChartItems = this.selectedChartItems.filter((item: string) => {
      return item !== itemKey;
    });
  },
  addSelectedChartItem(itemKey: string) {
    this.selectedChartItems = [...this.selectedChartItems, itemKey];
  },
  isItemSelected(item: AnimatedCircle | AnimatedLine | string) {
    if (typeof item === "string") {
      return this.selectedChartItems.includes(item);
    }

    return (
      this.selectedChartItems.includes(item.key) ||
      this.selectedChartItems.includes(item.group)
    );
  },
  playbackExtent: 1,
  setPlaybackExtent(value: number) {
    if (value > 1 || value < 0) {
      return;
    }

    this.playbackExtent = value;
  },
});
