<script setup lang="ts">
import {
  playbackSubject,
  PlaybackSubjectType,
  foreshadowingAreaSubject,
  snackbarSubject,
  CanvasEvent,
  highlightSubject,
  Chart,
  selectionSubject,
} from "@/utils";
import { onMounted, ref, watch } from "vue";
import {
  ChartSettings,
  PlaybackType,
  CanvasSettings,
  StorySettings,
} from "@/state";
import { CanvasWrapper, VideoCanvas, AppCanvas } from "@/components";

import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
gsap.registerPlugin(MorphSVGPlugin);

const snackbar = ref<boolean>(false);
const snackbarText = ref<string>("");
const snackbarVariant = ref<string>("");

highlightSubject.subscribe({
  next(value: any) {
    StorySettings.currentStory?.getCharts().map((chart: Chart) => {
      // chart.chart?.updateState({
      //   highlightPosition: value,
      // });
    });
  },
});

snackbarSubject.subscribe({
  next(value: any) {
    snackbar.value = value.open;
    snackbarText.value = value.text;
    // success, info, warning, error
    snackbarVariant.value = value.variant;
  },
});

selectionSubject.subscribe({
  next(selectionSettings: any) {
    const charts = StorySettings.currentStory?.getCharts();
    if (!charts) return;

    charts.forEach((chart) => {
      chart.state.chart?.setSelection(selectionSettings);
    });
  },
});

// PLAYBACK CONTROLS
playbackSubject.subscribe({
  next(playbackValue: any) {
    if (!playbackValue) {
      if (ChartSettings.playbackTimer) {
        ChartSettings.resetTimer();
      }
      return;
    }

    const { type, value } = playbackValue;

    if (type === PlaybackSubjectType.DISCRETE) {
      ChartSettings.setPlaybackExtent(value);
    }

    if (type === PlaybackSubjectType.CONTINUOUS) {
      // USE CHECKBOX TO CHANGE ALL TO NEXT AND VICE VERSA
      const affect = playbackValue.affect;
      const duration = playbackValue.duration;
      ChartSettings.handlePlay(
        ChartSettings.playbackType,
        value,
        affect,
        duration
      );
    }
  },
});

// Foreshadowing area
foreshadowingAreaSubject.subscribe({
  next(foreshadowingSettings: any) {
    const charts = StorySettings.currentStory?.getCharts();
    if (!charts) return;

    charts.forEach((chart) => {
      chart.state.chart?.setForeshadow(foreshadowingSettings);
    });
  },
});

// TODO_Paul: Move all the draw functions in here
function draw() {
  const generalDrawingUtils = CanvasSettings.generalDrawingUtils;
  if (generalDrawingUtils) {
    generalDrawingUtils.drawInContext((context: CanvasRenderingContext2D) => {
      generalDrawingUtils.clearArea({
        coordinates: { x: 0, y: 0 },
        dimensions: CanvasSettings.dimensions,
        context,
      });
    });
    StorySettings.currentStory?.draw();
    ChartSettings.extentVisualizer?.draw();
  }
  requestAnimationFrame(() => draw());
}

function initializeCanvasListeners() {
  const eventsCanvas = CanvasSettings.canvas.events;
  if (eventsCanvas) {
    [
      CanvasEvent.MOUSE_DOWN,
      CanvasEvent.MOUSE_MOVE,
      CanvasEvent.MOUSE_UP,
      CanvasEvent.CLICK,
    ].forEach((event: CanvasEvent) => {
      CanvasSettings.canvas.events?.addEventListener(
        event,
        (mouseEvent: MouseEvent) => {
          const rect = eventsCanvas.getBoundingClientRect();
          const x = mouseEvent.clientX - rect.left;
          const y = mouseEvent.clientY - rect.top;
          StorySettings.currentStory?.canvasEventListener(event, { x, y });
        }
      );
    });
  }
}

onMounted(() => {
  initializeCanvasListeners();
  draw();
  ChartSettings.setExtentVisualizer();
});
</script>
<!---------------------------------------------------------------------------------------------------------->
<template>
  <CanvasWrapper
    :width="CanvasSettings.dimensions.width"
    :height="CanvasSettings.dimensions.height"
    v-slot="{ className }"
  >
    <svg
      id="test-svg"
      :width="CanvasSettings.dimensions.width"
      :height="CanvasSettings.dimensions.height"
      :class="className"
    ></svg>
    <VideoCanvas id="default" :className="className" />
    <AppCanvas
      v-for="key in ['preview']"
      :id="key"
      v-bind:key="key"
      :class="className"
    />
    <canvas
      :width="CanvasSettings.dimensions.width"
      :height="CanvasSettings.dimensions.height"
      :class="className"
      :ref="(el) => CanvasSettings.setCanvas(el as HTMLCanvasElement, 'events')"
    ></canvas>
  </CanvasWrapper>
  <v-snackbar :timeout="2000" :color="snackbarVariant" v-model="snackbar">
    {{ snackbarText }}
  </v-snackbar>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style>
.panel-container {
  width: 100%;
  height: 100%;
}

canvas {
  border: 2px solid #9e9e9e;
}
</style>
