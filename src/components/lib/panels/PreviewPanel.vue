<script setup lang="ts">
import {
  playbackSubject,
  foreshadowingAreaSubject,
  snackbarSubject,
  CanvasEvent,
  selectionSubject,
  type PlaybackSettingsConfig,
  StateUpdateType,
  annotationSubject,
} from "@/utils";
import { onMounted, ref, watchEffect } from "vue";
import {
  ChartSettings,
  CanvasSettings,
  StorySettings,
  playbackSliderRange,
  currentChart,
  handlePlay,
} from "@/state";
import { CanvasWrapper, VideoCanvas, AppCanvas } from "@/components";

import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(MorphSVGPlugin);
gsap.registerPlugin(CustomEase);

const snackbar = ref<boolean>(false);
const snackbarText = ref<string>("");
const snackbarVariant = ref<string>("");
const endKeyframe = ref<number>();
const playbackConfig = ref<PlaybackSettingsConfig>({
  duration: 5,
  easeFn: "none",
  playbackMode: StateUpdateType.GROUP_TIMELINE,
});
const keyframes = ref<string[]>();

watchEffect(() => {
  keyframes.value = currentChart.value?.state.keyframes;
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

annotationSubject.subscribe({
  next(annotationSettings: any) {
    let keys = [];
    if (annotationSettings) {
      keys = annotationSettings.keys;
    }

    StorySettings.currentStory?.revealAnnotations(keys);
  },
});

// PLAYBACK CONTROLS
playbackSubject.subscribe({
  next(config: any) {
    if (config.type === "keyframe") {
      endKeyframe.value = config.data;
    } else {
      playbackConfig.value = config.data;

      handlePlay(
        playbackConfig.value,
        config.data.svg,
        undefined,
        endKeyframe.value
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
  <v-container>
    <v-row>
      <v-col>
        <v-range-slider
          v-model="playbackSliderRange"
          :ticks="Object.assign({}, keyframes)"
          :show-ticks="false"
          thumb-label="always"
          min="0"
          :max="(keyframes?.length ?? 1) - 1"
          :step="1"
          density="compact"
        >
          <template v-slot:thumb-label="{ modelValue }">
            <div class="text-body" v-if="keyframes">
              {{ keyframes[modelValue] }}
            </div>
          </template>
        </v-range-slider>
      </v-col>
    </v-row>
  </v-container>
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
