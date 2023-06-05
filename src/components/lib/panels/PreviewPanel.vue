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
  highlightSubject,
  HighlightListener,
} from "@/utils";
import { computed, onMounted, ref, watch, watchEffect } from "vue";
import {
  ChartSettings,
  CanvasSettings,
  StorySettings,
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
const highlightModeActive = ref<boolean>(false);
const _highlightListener = ref<HighlightListener | undefined>();
watch(highlightModeActive, () => {
  _highlightListener.value?.updateState({
    isActive: highlightModeActive.value,
  });
});
const snackbarText = ref<string>("");
const snackbarVariant = ref<string>("");
const playbackConfig = ref<PlaybackSettingsConfig>({
  duration: 5,
  easeFn: "none",
  playbackMode: StateUpdateType.GROUP_TIMELINE,
});
const keyframes = ref<string[]>();
const currentIndex = ref<number>(0);

watch(currentIndex, () => {
  currentChart.value?.updateState({
    currentKeyframeIndex: currentIndex.value,
  });
});

watchEffect(() => {
  keyframes.value = currentChart.value?.state.keyframes;
});

watch(currentChart, () => {
  currentIndex.value = currentChart.value?.state.startKeyframeIndex ?? 0;
  currentChart.value?.updateState({
    currentKeyframeIndex: currentIndex.value,
  });
});

highlightSubject.subscribe({
  next(value: any) {
    const charts = StorySettings.currentStory?.getCharts();
    if (!charts) return;

    console.log(value);
    charts.forEach((chart) => {
      chart.state.controller?.setSelection({
        bounds: {
          coordinates: value,
          radius: 10,
        },
      });
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
      chart.state.controller?.setSelection(selectionSettings);
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
    if (config.type === "pause") {
      currentChart.value?.state.controller?.pause();
    } else {
      playbackConfig.value = config.data;

      handlePlay(config.data, config.data.svg, undefined, undefined);
    }
  },
});

// Foreshadowing area
foreshadowingAreaSubject.subscribe({
  next(foreshadowingSettings: any) {
    const charts = StorySettings.currentStory?.getCharts();
    if (!charts) return;

    charts.forEach((chart) => {
      chart.state.controller?.setForeshadow(foreshadowingSettings);
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

function handleReset(type: string) {
  switch (type) {
    case "selection":
      selectionSubject.next(undefined);
      break;
    case "foreshadowing":
      foreshadowingAreaSubject.next(undefined);
      break;
    case "annotation":
      annotationSubject.next(undefined);
      break;
    default:
      break;
  }
}

onMounted(() => {
  initializeCanvasListeners();
  draw();
  ChartSettings.setExtentVisualizer();
  const drawingUtils = CanvasSettings.generalDrawingUtils;
  if (!drawingUtils) return;
  console.log("HERE");
  _highlightListener.value = new HighlightListener({
    position: {
      x: CanvasSettings.dimensions.width / 2 - 25,
      y: CanvasSettings.dimensions.height / 2 - 25,
    },
    dimensions: { width: 50, height: 50 },
    canvasDimensions: CanvasSettings.dimensions,
    drawingUtils,
    isActive: false,
  });
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
      :view-box="`0 0 ${CanvasSettings.dimensions.width} ${CanvasSettings.dimensions.height}`"
    >
      <path id="rect" d="M0 1750.176h1920V169H0z"></path>
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
      <v-col lg="12">
        <v-slider
          v-model="currentIndex"
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
        </v-slider>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="3">
        <v-btn block @click="() => handleReset('selection')"
          >Reset Selection</v-btn
        >
      </v-col>
      <v-col lg="3">
        <v-btn block @click="() => handleReset('foreshadowing')"
          >Reset Foreshadowing</v-btn
        >
      </v-col>
      <v-col lg="3">
        <v-btn block @click="() => handleReset('annotation')"
          >Reset Annotation</v-btn
        >
      </v-col>
      <v-col lg="3">
        <v-checkbox
          label="Highlight Mode"
          v-model="highlightModeActive"
        ></v-checkbox>
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
