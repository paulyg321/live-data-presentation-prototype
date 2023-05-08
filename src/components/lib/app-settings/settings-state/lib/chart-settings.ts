import * as d3 from "d3";
import { reactive } from "vue";
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
} from "@/utils";
import { StorySettings } from "./stories-settings";
import { CanvasSettings } from "./canvas-settings";

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
  // animationMode: DrawingMode;
  // setAnimationMode: (mode: DrawingMode) => void;
  handlePlay: (
    type: string,
    callbackFn?: any,
    affect?: Affect,
    duration?: number
  ) => void;
  selectedChartItems: string[];
  addSelectedChartItem: (itemKey: string) => void;
  removeSelectedChartItem: (itemKey: string) => void;
  // isItemSelected: (itemKey: AnimatedCircle | AnimatedLine | string) => boolean;
  playbackExtent: number;
  setPlaybackExtent: (value: number) => void;
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
  handlePlay(type: string, callbackFn?: any, affect?: Affect) {
    const charts = StorySettings.currentStory?.getCharts();
    if (!charts) return;

    charts[0].state.chart?.play({
      // keys: ["Coca-Cola", "Intel", "IBM", "GE"],
      states: [
        {
          index: 0,
        },
        {
          index: 1,
        },
        {
          index: 3,
        },
        {
          index: 4,
        },
        {
          index: 5,
        },
        {
          index: 6,
        },
      ],
      duration: 5,
      updateType: StateUpdateType.INDIVIDUAL_TWEENS,
    });
    // const affectPlaybackSettings = {
    //   [Affect.JOY]: { duration: 2000, easeFn: d3.easeBounce },
    //   [Affect.EXCITEMENT]: { duration: 3000, easeFn: d3.easeLinear },
    //   [Affect.TENDERNESS]: { duration: 5000, easeFn: d3.easeQuadIn },
    // };

    // this.resetTimer();
    // const play = (timestep: number) => {
    //   this.setPlaybackExtent(timestep);
    //   if (timestep === 1) {
    //     this.extentVisualizer?.updateState({
    //       extent: 0,
    //     });
    //   } else {
    //     this.extentVisualizer?.updateState({
    //       extent: timestep,
    //     });
    //   }
    //   if (callbackFn) {
    //     callbackFn(timestep);
    //   }
    // };

    // if (type === "prev") {
    //   /**
    //    * TODO: Determine if it makes sense to animate to previouss state
    //    * this might be a rewind or something
    //    * (starting from 1 and going to 0 - then decrementing state)
    //    * */
    // } else if (type === PlaybackType.NEXT) {
    //   this.playbackTimer = d3.timer((elapsed: number) => {
    //     // TODO_Paul - Try this!
    //     // const startingPoint = this.playbackExtent + elapsed / playbackDuration;
    //     const playbackSettings = affect
    //       ? affectPlaybackSettings[affect]
    //       : { duration: 3000, easeFn: d3.easeLinear };
    //     const startingPoint = Math.max(
    //       this.playbackExtent,
    //       elapsed / playbackSettings.duration
    //     );

    //     const boundedTimeStep = Math.min(startingPoint, 1);

    //     play(playbackSettings.easeFn(boundedTimeStep));
    //     if (boundedTimeStep === 1) {
    //       StorySettings.currentStory?.getCharts().map((chart: Chart) => {
    //         chart.chart?.setStates("increment");
    //       });
    //       this.setPlaybackExtent(0);
    //       this.resetTimer();
    //     }
    //   });
    // } else if (type === PlaybackType.ALL) {
    //   this.playbackTimer = d3.timer((elapsed: number) => {
    //     const playbackSettings = affect
    //       ? affectPlaybackSettings[affect]
    //       : { duration: 3000, easeFn: d3.easeLinear };

    //     const startingPoint = Math.max(
    //       this.playbackExtent,
    //       elapsed / playbackSettings.duration
    //     );
    //     const boundedTimeStep = Math.min(startingPoint, 1);
    //     play(playbackSettings.easeFn(boundedTimeStep));
    //     if (boundedTimeStep === 1) {
    //       StorySettings.currentStory?.getCharts().map((chart: Chart) => {
    //         chart.chart?.setStates("increment");
    //       });
    //       this.setPlaybackExtent(0);
    //       this.handlePlay("all", callbackFn);
    //     }
    //   });
    // }
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
  playbackExtent: 0,
  setPlaybackExtent(value: number) {
    if (value > 1 || value < 0) {
      return;
    }

    StorySettings.currentStory?.getCharts().map((chart: Chart) => {
      chart.chart?.updateState({
        extent: value,
      });
    });
    this.playbackExtent = value;
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
