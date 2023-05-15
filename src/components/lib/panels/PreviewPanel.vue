<script setup lang="ts">
import {
  playbackSubject,
  foreshadowingAreaSubject,
  snackbarSubject,
  CanvasEvent,
  selectionSubject,
  type PlaybackSettingsConfig,
  StateUpdateType,
  type AnimatedElementPlaybackArgs,
} from "@/utils";
import { onMounted, ref } from "vue";
import { ChartSettings, CanvasSettings, StorySettings } from "@/state";
import { CanvasWrapper, VideoCanvas, AppCanvas } from "@/components";
import * as d3 from "d3";
import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
gsap.registerPlugin(MorphSVGPlugin);
gsap.registerPlugin(CustomEase);

const path = ref<string>("");
const snackbar = ref<boolean>(false);
const snackbarText = ref<string>("");
const snackbarVariant = ref<string>("");
const endKeyframe = ref<number>();
const playbackConfig = ref<PlaybackSettingsConfig>({
  duration: 5,
  easeFn: "none",
  playbackMode: StateUpdateType.GROUP_TIMELINE,
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
  next(config: any) {
    if (config.type === "keyframe") {
      endKeyframe.value = config.data;
    } else {
      playbackConfig.value = config.data;
      if (config.data.svg) {
        path.value = config.data.svg;
        const element = d3
          .select("path")
          .attr("id", "st0")
          .attr("d", config.data.svg);
      }

      const charts = StorySettings.currentStory?.getCharts();
      if (!charts) return;

      charts.forEach((chart) => {
        const args = chart.state.chart?.processPlaybackSubscriptionData(
          playbackConfig.value,
          endKeyframe.value,
          path.value ? "#st0" : undefined
        );
        if (args) {
          chart.state.chart?.play(args as AnimatedElementPlaybackArgs);
        }
      });
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
  <!-- <v-btn @click="() => ChartSettings.handlePlay()">HII</v-btn> -->
  <CanvasWrapper
    :width="CanvasSettings.dimensions.width"
    :height="CanvasSettings.dimensions.height"
    v-slot="{ className }"
  >
    <svg
      id="drawing-board"
      :width="CanvasSettings.dimensions.width"
      :height="CanvasSettings.dimensions.height"
      :className="className"
      ref="svg"
    >
      <rect id="rect" />
      <circle id="circle" />

      <path />
      <!-- <path
        id="st0"
        fill="#231F20"
        d="M60,20h-4v-4.031c0-2.211-1.789-4-4-4H4c-2.211,0-4,1.789-4,4V48c0,2.211,1.789,4,4,4h48 c2.211,0,4-1.789,4-4v-4h4c2.211,0,4-1.789,4-4V24C64,21.789,62.211,20,60,20z M32,40H12V24h28L32,40z"
      ></path> -->
    </svg>
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

#drawing-board {
  opacity: 0;
}
</style>
