<script setup lang="ts">
import {
  playbackSubject,
  PlaybackSubjectType,
  foreshadowingAreaSubject,
  legendSubject,
  snackbarSubject,
  CanvasEvent,
  highlightSubject,
  Chart,
} from "@/utils";
import { onMounted, onUnmounted, ref, watch } from "vue";
import CanvasWrapper from "../../CanvasWrapper.vue";
import {
  ChartSettings,
  PlaybackType,
  CanvasSettings,
  LegendSettings,
  StorySettings,
} from "../settings-state";
import VideoViews from "../../views/VideoViews.vue";
import AppCanvas from "../../AppCanvas.vue";

// EMPHASIS CONTROLS ANIMATION
// emphasisSubject.subscribe({
//   next(animation: any) {
//     ChartSettings.setAnimationMode(animation);
//   },
// });
const snackbar = ref<boolean>(false);
const snackbarText = ref<string>("");
const snackbarVariant = ref<string>("");

highlightSubject.subscribe({
  next(value: any) {
    StorySettings.currentStory?.getCharts().map((chart: Chart) => {
      chart.chart?.updateState({
        highlightPosition: value,
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
  next(foreshadowingAreaValue: any) {
    StorySettings.currentStory?.getCharts().forEach((chart: Chart) => {
      chart.chart?.setForeshadowing(foreshadowingAreaValue);
    });
  },
});

legendSubject.subscribe({
  next(key: any) {
    const charts = StorySettings.currentStory?.getCharts();
    if (!charts) return;

    charts[0].chart?.toggleSelection(key);
  },
});

watch(
  () => ChartSettings.playbackExtent,
  (newValue) => {
    StorySettings.currentStory?.getCharts().forEach((chart: Chart) => {
      chart.chart?.updateState({
        extent: newValue,
      });
    });
  }
);

// watch(
//   () => ChartSettings.currentChart,
//   () => {
//     LegendSettings.initializeLegendItems();
//   }
// );

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
    LegendSettings.drawLegendItems();
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
      CanvasSettings.canvas.events.addEventListener(
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
  <v-container class="pa-10">
    <v-row class="justify-center">
      <v-col lg="12">
        <v-slider
          v-model="ChartSettings.playbackExtent"
          :min="0"
          :max="1"
          thumb-label
        ></v-slider>
      </v-col>
    </v-row>
    <v-row class="justify-center">
      <v-col lg="3">
        <v-btn
          icon="mdi-skip-backward"
          @click="() => ChartSettings.handlePlay(PlaybackType.NEXT)"
        ></v-btn>
      </v-col>
      <v-col lg="3">
        <v-btn
          icon="mdi-play"
          color="primary"
          @click="() => ChartSettings.handlePlay(PlaybackType.ALL)"
        ></v-btn>
      </v-col>
      <v-col lg="3">
        <v-btn
          icon="mdi-skip-forward"
          @click="() => ChartSettings.handlePlay(PlaybackType.NEXT)"
        ></v-btn>
      </v-col>
    </v-row>
    <!-- <v-row>
    <v-col lg="12">
      <div class="text-h6">
        Current Animation:
        <span class="font-italic font-weight-thin">{{
          ChartSettings.animationMode
        }}</span>
      </div>
    </v-col>
  </v-row> -->
    <v-row>
      <v-col lg="12">
        <v-radio-group
          label="Playback Type"
          inline
          v-model="ChartSettings.playbackType"
        >
          <v-radio
            :label="PlaybackType.ALL"
            :value="PlaybackType.ALL"
          ></v-radio>
          <v-radio
            :label="PlaybackType.NEXT"
            :value="PlaybackType.NEXT"
          ></v-radio>
        </v-radio-group>
      </v-col>
    </v-row>
    <v-row class="mt-10">
      <v-col lg="12">
        <CanvasWrapper
          :width="CanvasSettings.dimensions.width"
          :height="CanvasSettings.dimensions.height"
          v-slot="{ className }"
        >
          <VideoViews id="default" :className="className" />
          <AppCanvas v-for="key in ['preview']" :id="key" v-bind:key="key" />
          <canvas
            :width="CanvasSettings.dimensions.width"
            :height="CanvasSettings.dimensions.height"
            :class="className"
            :ref="(el) => CanvasSettings.setCanvas(el, 'events')"
          ></canvas>
        </CanvasWrapper>
      </v-col>
    </v-row>
  </v-container>
  <v-snackbar :timeout="2000" :color="snackbarVariant" v-model="snackbar">
    {{ snackbarText }}
  </v-snackbar>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style></style>
