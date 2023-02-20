import * as d3 from "d3";
import { reactive, ref } from "vue";
import {
  AnimatedLine,
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
  addChart: (newChart: Chart) => void;
  iterateOverChartItems: (
    callbackFn: (key: string, value: any) => void
  ) => void;
  changeMargins: (margin: number) => void;
  canvasKeys: string[];
  setCanvasKeys: () => void;
  animationMode: DrawingMode;
  setAnimationMode: (mode: DrawingMode) => void;
  transitionFunction: (time: number) => number;
  setTransitionFunction: (transitionFunc: (time: number) => number) => void;
  handlePlay: (type: string) => void;
  selectedChartItems: string[];
  addSelectedChartItem: (itemKey: string) => void;
  removeSelectedChartItem: (itemKey: string) => void;
  isItemSelected: (itemKey: string) => boolean;
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
  iterateOverChartItems(callbackFn: (key: string, value: any) => void) {
    Object.entries(this.currentChart?.getAnimatedElements() ?? {}).forEach(
      ([key, value]: [string, any]) => {
        callbackFn(key, value);
      }
    );
  },

  // States for drawing
  animationMode: DrawingMode.UNDULATE_ANIMATION,
  setAnimationMode(mode: DrawingMode) {
    this.animationMode = mode;
  },
  transitionFunction: (time: number) => d3.easeExpIn(Math.min(1, time + 0.5)),
  setTransitionFunction(transitionFunc: (time: number) => number) {
    this.transitionFunction = transitionFunc;
  },
  handlePlay(type: string) {
    const play = ({ line }: { line: AnimatedLine }) => {
      if (type === "prev") {
        line.animateToPreviousState({
          playRemainingStates: false,
          transitionFunction: this.transitionFunction,
          mode: this.animationMode,
        });
      } else if (type === "next") {
        line.animateToNextState({
          playRemainingStates: false,
          transitionFunction: this.transitionFunction,
          mode: this.animationMode,
        });
      } else if (type === "all") {
        line.animateToNextState({
          playRemainingStates: true,
          transitionFunction: this.transitionFunction,
          mode: this.animationMode,
        });
      }
    };

    this.iterateOverChartItems((key: string, value: AnimatedLine) => {
      if (this.selectedChartItems.length === 0) {
        play({
          line: value,
        });
        return;
      } else if (this.isItemSelected(key)) {
        play({
          line: value,
        });
        return;
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
  isItemSelected(itemKey: string) {
    return this.selectedChartItems.includes(itemKey);
  },
  playbackExtent: 1,
  setPlaybackExtent(value: number) {
    if (value > 1 || value < 0) {
      return;
    }

    this.playbackExtent = value;
  },
});
