<script setup lang="ts">
import {
  emphasisSubject,
  playbackSubject,
  PlaybackSubjectType,
  ForeshadowingAreaSubjectType,
  foreshadowingAreaSubject,
  LineEffect,
  type AnimatedLine,
  legendSubject,
} from "@/utils";
import { onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import CanvasWrapper from "../../CanvasWrapper.vue";
import ChartAxes from "../../axes/ChartAxes.vue";
import {
  ChartSettings,
  CanvasSettings,
  radialPlaybackTracker,
  foreshadowingTracker,
  LegendSettings,
  gestureCanvasKeys,
} from "../settings-state";
import VideoViews from "../../views/VideoViews.vue";

const route = useRoute();
ChartSettings.setCurrentChart(parseInt(route.params.id as string));

// EMPHASIS CONTROLS ANIMATION
emphasisSubject.subscribe({
  next(animation: any) {
    ChartSettings.setAnimationMode(animation);
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
    const { type, value: foreshadowingArea } = foreshadowingAreaValue;

    ChartSettings.iterateOverChartItems((key: string, value: AnimatedLine) => {
      // Sets foreshdowing area for the chart item
      const triggerForeshadow = () => {
        value.setForeshadowingArea(type, foreshadowingArea);
        value.drawCurrentState({
          bounds: {
            end: ChartSettings.playbackExtent,
          },
        });
      };

      if (ChartSettings.selectedChartItems.length > 0) {
        if (ChartSettings.isItemSelected(key)) {
          triggerForeshadow();
        }
      } else {
        triggerForeshadow();
      }
    });
  },
});

legendSubject.subscribe({
  next(value: any) {
    if (ChartSettings.isItemSelected(value)) {
      ChartSettings.removeSelectedChartItem(value);
    } else {
      ChartSettings.addSelectedChartItem(value);
    }
  },
});

watch(
  () => ChartSettings.selectedChartItems,
  (selectedItems: string[]) => {
    ChartSettings.iterateOverChartItems((key: string, value: AnimatedLine) => {
      let lineEffect;

      // No selected items then all lines should have default values
      if (selectedItems.length === 0) {
        lineEffect = LineEffect.DEFAULT;
      } else if (ChartSettings.isItemSelected(key)) {
        lineEffect = LineEffect.FOCUSED;
      } else {
        lineEffect = LineEffect.BACKGROUND;
        value.setForeshadowingArea(
          ForeshadowingAreaSubjectType.CLEAR,
          undefined
        );
      }

      value.setLineAppearanceFromEffect(lineEffect);
      value.drawCurrentState({
        bounds: {
          end: ChartSettings.playbackExtent,
        },
      });
    });
  }
);

watch(
  () => ChartSettings.playbackExtent,
  (newValue, oldValue) => {
    ChartSettings.iterateOverChartItems((key: string, value: AnimatedLine) => {
      if (ChartSettings.selectedChartItems.length === 0) {
        value.drawCurrentState({
          bounds: {
            start: oldValue,
            end: newValue,
          },
        });
      } else if (ChartSettings.isItemSelected(key)) {
        value.drawCurrentState({
          bounds: {
            start: oldValue,
            end: newValue,
          },
        });
      }
    });
  }
);

onMounted(() => {
  // Do whatever you need to do with canvasCtx after this
  ChartSettings.currentChart?.setContext(CanvasSettings.canvasCtx);
  ChartSettings.currentChart?.drawAll();

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
  <v-row>
    <v-col lg="12">
      <div class="text-h6">
        Current Animation:
        <span class="font-italic font-weight-thin">{{
          ChartSettings.animationMode
        }}</span>
      </div>
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
        <ChartAxes :className="className" />
        <canvas
          v-for="key in [...gestureCanvasKeys, ...ChartSettings.canvasKeys]"
          v-bind:key="key"
          :width="CanvasSettings.dimensions.width"
          :height="CanvasSettings.dimensions.height"
          :class="className"
          :ref="(el) => CanvasSettings.setCanvas(el, key as unknown as string, false)"
        ></canvas>
      </CanvasWrapper>
    </v-col>
  </v-row>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style></style>
