import { computed, reactive, ref, watchEffect } from "vue";
import {
  Affect,
  AnimationExtentVisualizer,
  ForeshadowingStatesMode,
  // AnimatedCircle,
  // AnimatedLine,
  type Chart,
  // DrawingMode,
  // AnimatedLineDrawingModeToEaseFunctionMap,
  // AnimatedCircleDrawingModeToEaseFunctionMap,
  type Coordinate2D,
  type Dimensions,
  type PartialCoordinate2D,
  StateUpdateType,
  type PlaybackSettingsConfig,
  type AnimatedElementPlaybackArgs,
} from "@/utils";
import { StorySettings } from "./stories-settings";
import { CanvasSettings } from "./canvas-settings";
import * as d3 from "d3";

export const initialChartWidth = 400;
export const initialChartDimensions = {
  width: initialChartWidth,
  height: initialChartWidth * (3 / 4),
  margin: {
    left: 30,
    right: 30,
    top: 30,
    bottom: 30,
  },
};

export enum PlaybackType {
  NEXT = "next",
  ALL = "all",
}

export const ChartSettings = reactive<{
  canvasKeys: string[];
  setCanvasKeys: () => void;
  handlePlay: (
    type?: string,
    callbackFn?: any,
    affect?: Affect,
    duration?: number
  ) => void;
  selectedChartItems: string[];
  addSelectedChartItem: (itemKey: string) => void;
  removeSelectedChartItem: (itemKey: string) => void;
  extentVisualizer?: AnimationExtentVisualizer;
  setExtentVisualizer: () => void;
  playbackTimer?: d3.Timer;
  resetTimer: () => void;
  playbackType: PlaybackType;
}>({
  canvasKeys: [],
  setCanvasKeys() {
    /**
     * Get keys of all the lines/chart items to be plotted and create a legend key for them
     * This gets used to render the canvases needed for the items and their legend items
     *
     * the keys are used to access the canvas Contexts using CanvasSettings.canvasCtx[<key>]
     */
    this.canvasKeys = ["preview", "legend"];
  },
  // States for drawing
  // animationMode: DrawingMode.BASELINE_ANIMATION,
  // setAnimationMode(mode: DrawingMode) {
  //   this.animationMode = mode;
  // },
  handlePlay(type?: string, callbackFn?: any, affect?: Affect) {
    const charts = StorySettings.currentStory?.getCharts();
    if (!charts) return;

    charts.forEach((chart) => {
      chart.state.controller?.play({
        states: [
          {
            index: 1,
          },
          {
            index: 6,
            selector: "#st0",
          },
          {
            index: 3,
          },
          // {
          //   index: 3,

          // },
          // {
          //   index: 4,
          // },
          // {
          //   index: 5,
          // },
        ],
        duration: 5,
        updateType: StateUpdateType.INDIVIDUAL_TWEENS,
        // easeFn: "circ.out",
      });
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
  extentVisualizer: undefined,
  setExtentVisualizer() {
    if (!CanvasSettings.generalDrawingUtils) return;
    this.extentVisualizer = new AnimationExtentVisualizer({
      drawingUtils: CanvasSettings.generalDrawingUtils,
      canvasDimensions: CanvasSettings.dimensions,
    });
  },
  playbackTimer: undefined,
  resetTimer() {
    if (this.playbackTimer) {
      this.playbackTimer.stop();
      this.playbackTimer = undefined;
    }
  },
  playbackType: PlaybackType.NEXT,
});

export const currentChart = computed(() => {
  return StorySettings.currentStory?.getCharts()[0];
});

export function handlePlay(
  config: PlaybackSettingsConfig,
  svg?: string,
  startKeyframe?: number,
  endKeyframe?: number
) {
  let selector: string | undefined;
  if (svg) {
    selector = "#st0";
    d3.select("#st0").attr("d", svg);
  }

  const args =
    currentChart.value?.state.controller?.processPlaybackSubscriptionData(
      config,
      endKeyframe,
      startKeyframe,
      selector
    );
  if (args) {
    currentChart.value?.state.controller?.play(
      args as AnimatedElementPlaybackArgs
    );
  }
}
