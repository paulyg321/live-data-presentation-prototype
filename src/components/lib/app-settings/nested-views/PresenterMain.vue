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
  // AnimatedCircle,
} from "@/utils";
import { onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import CanvasWrapper from "../../CanvasWrapper.vue";
// import ChartAxes from "../../axes/ChartAxes.vue";
import {
  ChartSettings,
  CanvasSettings,
  radialPlaybackTracker,
  foreshadowingTracker,
  gestureCanvasKeys,
  LegendSettings,
} from "../settings-state";
import VideoViews from "../../views/VideoViews.vue";

const route = useRoute();
ChartSettings.setCurrentChart(parseInt(route.params.id as string));

// EMPHASIS CONTROLS ANIMATION
emphasisSubject.subscribe({
  next(animation: any) {
    // ChartSettings.setAnimationMode(animation);
  },
});

// PLAYBACK CONTROLS
playbackSubject.subscribe({
  next(playbackValue: any) {
    const { type, value } = playbackValue;

    if (type === PlaybackSubjectType.DISCRETE) {
      ChartSettings.setPlaybackExtent(value);
    }

    if (type === PlaybackSubjectType.CONTINUOUS) {
      ChartSettings.handlePlay("next");
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
    // ChartSettings.iterateOverChartItems(
    //   (item: AnimatedLine | AnimatedCircle) => {
    //     const isSelected =
    //       ChartSettings.isItemSelected(item.key) ||
    //       ChartSettings.isItemSelected(item.group);

    //     if (ChartSettings.selectedChartItems.length === 0) {
    //       item.drawState({
    //         bounds: {
    //           start: oldValue,
    //           end: newValue,
    //         }
    //       });
    //     } else if (isSelected) {
    //       item.drawState({
    //         bounds: {
    //           start: oldValue,
    //           end: newValue,
    //         }
    //       });
    //     }
    //   }
    // );
  }
);

onMounted(() => {
  // Do whatever you need to do with canvasCtx after this
  ChartSettings.currentChart?.setContext(
    "chart",
    CanvasSettings.canvasCtx["chart"]
  );
  ChartSettings.currentChart?.chart?.draw();

  LegendSettings.initializeLegendItems();
  LegendSettings.drawLegendItems();

  // Possibly move these to gesture-settings state
  if (CanvasSettings.canvasCtx["dialing"]) {
    radialPlaybackTracker.value.setContext(CanvasSettings.canvasCtx["dialing"]);
    radialPlaybackTracker.value.renderReferencePoints();
  }

  // if (CanvasSettings.canvasCtx["emphasis"]) {
  //   emphasisTracker.value.setContext(CanvasSettings.canvasCtx["emphasis"]);
  //   emphasisTracker.value.renderReferencePoints();
  // }

  if (CanvasSettings.canvasCtx["foreshadowing"]) {
    foreshadowingTracker.value.setContext(
      CanvasSettings.canvasCtx["foreshadowing"]
    );
    foreshadowingTracker.value.renderReferencePoints();
  }
});
</script>
<!---------------------------------------------------------------------------------------------------------->
<template>
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
  <v-row class="mt-10">
    <v-col lg="12">
      <CanvasWrapper
        :width="CanvasSettings.dimensions.width"
        :height="CanvasSettings.dimensions.height"
        v-slot="{ className }"
      >
        <VideoViews :className="className" />
        <!-- <ChartAxes :className="className" /> -->
        <canvas
          v-for="key in [...gestureCanvasKeys, ...ChartSettings.canvasKeys]"
          v-bind:key="key"
          :width="CanvasSettings.dimensions.width"
          :height="CanvasSettings.dimensions.height"
          :class="className"
          :ref="(el) => CanvasSettings.setCanvas(el, key as unknown as string)"
        ></canvas>
      </CanvasWrapper>
    </v-col>
  </v-row>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style></style>
