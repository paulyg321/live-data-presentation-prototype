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

const selector = ref<string | undefined>();
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
    console.log(config);
    if (config.type === "keyframe") {
      endKeyframe.value = config.data;
    } else {
      playbackConfig.value = config.data;
      if (config.data.svg) {
        selector.value = "#st0";
        d3.select("#st0").attr("d", config.data.svg);
      } else {
        selector.value = undefined;
      }

      const charts = StorySettings.currentStory?.getCharts();
      if (!charts) return;

      charts.forEach((chart) => {
        const args = chart.state.chart?.processPlaybackSubscriptionData(
          playbackConfig.value,
          endKeyframe.value,
          selector.value ? "#st0" : undefined
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
          StorySettings.currentStory?.canvasEventListener(event, { x, y }, () =>
            StorySettings.saveStories()
          );
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
      <path
        id="circle"
        d="M256,0C114.837,0,0,114.837,0,256s114.837,256,256,256s256-114.837,256-256S397.163,0,256,0z"
      ></path>
      <path id="st0"></path>
      <!-- <path
        id="st0"
        fill="#231F20"
        d="M60,20h-4v-4.031c0-2.211-1.789-4-4-4H4c-2.211,0-4,1.789-4,4V48c0,2.211,1.789,4,4,4h48 c2.211,0,4-1.789,4-4v-4h4c2.211,0,4-1.789,4-4V24C64,21.789,62.211,20,60,20z M32,40H12V24h28L32,40z"
        HEART = "M48,5c-4.418,0-8.418,1.791-11.313,4.687l-3.979,3.961c-0.391,0.391-1.023,0.391-1.414,0
	c0,0-3.971-3.97-3.979-3.961C24.418,6.791,20.418,5,16,5C7.163,5,0,12.163,0,21c0,3.338,1.024,6.436,2.773,9
	c0,0,0.734,1.164,1.602,2.031s24.797,24.797,24.797,24.797C29.953,57.609,30.977,58,32,58s2.047-0.391,2.828-1.172
	c0,0,23.93-23.93,24.797-24.797S61.227,30,61.227,30C62.976,27.436,64,24.338,64,21C64,12.163,56.837,5,48,5z M57,22
	c-0.553,0-1-0.447-1-1c0-4.418-3.582-8-8-8c-0.553,0-1-0.447-1-1s0.447-1,1-1c5.522,0,10,4.478,10,10C58,21.553,57.553,22,57,22z"
        CLOCK = "M32,0C14.328,0,0,14.328,0,32s14.328,32,32,32s32-14.328,32-32S49.672,0,32,0z M42.844,42.844
	c-1.566,1.566-4.168,1.488-5.734-0.078l-7.934-7.934c-0.371-0.367-0.664-0.812-0.867-1.305C28.105,33.039,28,32.523,28,32V16
	c0-2.211,1.789-4,4-4s4,1.789,4,4v14.344l6.859,6.859C44.426,38.77,44.406,41.281,42.844,42.844z"
        CLOUD = "M55.938,32.707C55.945,32.465,56,32.234,56,31.992
	c0-13.258-10.742-24-24-24s-24,10.742-24,24c0,0.242,0.055,0.473,0.062,0.715C3.379,34.344,0,38.754,0,43.992
	c0,6.625,5.371,12,12,12V56h40v-0.008c6.625,0,12-5.371,12-12C64,38.75,60.617,34.344,55.938,32.707z"
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
