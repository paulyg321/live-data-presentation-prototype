<script setup lang="ts">
import {
  emphasisSubject,
  playbackSubject,
  PlaybackSubjectType,
  ForeshadowingAreaSubjectType,
  foreshadowingAreaSubject,
  Effect,
  // type AnimatedLine,
  legendSubject,
  ListenerType,
  CanvasEvent,
  // AnimatedCircle,
} from "@/utils";
import { onMounted, watch, watchEffect } from "vue";
import { useRoute } from "vue-router";
import CanvasWrapper from "../../CanvasWrapper.vue";
import {
  ChartSettings,
  PlaybackType,
  CanvasSettings,
  // radialPlaybackTracker,
  // foreshadowingTracker,
  gestureCanvasKeys,
  LegendSettings,
  StorySettings,
} from "../settings-state";
import VideoViews from "../../views/VideoViews.vue";
import { LayerSettings } from "../settings-state/layer-settings";

// EMPHASIS CONTROLS ANIMATION
// emphasisSubject.subscribe({
//   next(animation: any) {
//     ChartSettings.setAnimationMode(animation);
//   },
// });

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
    ChartSettings.currentChart?.chart?.setForeshadowing(foreshadowingAreaValue);
  },
});

legendSubject.subscribe({
  next(key: any) {
    ChartSettings.currentChart?.chart?.toggleSelection(key);
  },
});

watch(
  () => ChartSettings.playbackExtent,
  (newValue) => {
    ChartSettings.currentChart?.chart?.updateState({
      extent: newValue,
    });
  }
);

watch(
  () => ChartSettings.currentChart,
  () => {
    // Do whatever you need to do with canvasCtx after this
    ChartSettings.currentChart?.setContext(
      "chart",
      CanvasSettings.canvasCtx["chart"]
    );

    LegendSettings.initializeLegendItems();
  }
);

// TODO_Paul: Move all the draw functions in here
function draw() {
  StorySettings.currentStory?.draw();
  LegendSettings.drawLegendItems();
  requestAnimationFrame(() => draw());
}

function initializeCanvasListeners() {
  const eventsCanvas = CanvasSettings.canvas.events;
  if (eventsCanvas) {
    [
      CanvasEvent.MOUSE_DOWN,
      CanvasEvent.MOUSE_MOVE,
      CanvasEvent.MOUSE_UP,
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
  draw();
  initializeCanvasListeners();
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
          <VideoViews :className="className" />
          <canvas
            v-for="key in [...gestureCanvasKeys, 'chart', 'legend']"
            v-bind:key="key"
            :width="CanvasSettings.dimensions.width"
            :height="CanvasSettings.dimensions.height"
            :class="className"
            :ref="(el) => CanvasSettings.setCanvas(el, key as unknown as string)"
          ></canvas>
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
</template>
<!---------------------------------------------------------------------------------------------------------->
<style></style>
