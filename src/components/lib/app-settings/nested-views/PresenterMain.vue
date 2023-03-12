<script setup lang="ts">
import {
  emphasisSubject,
  playbackSubject,
  PlaybackSubjectType,
  ForeshadowingAreaSubjectType,
  foreshadowingAreaSubject,
  Effect,
  type AnimatedLine,
  legendSubject,
  AnimatedCircle,
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
  gestureCanvasKeys,
  LegendSettings,
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
      ChartSettings.handlePlay("next", value);
    }
  },
});

// Foreshadowing area
foreshadowingAreaSubject.subscribe({
  next(foreshadowingAreaValue: any) {
    const { type, value: foreshadowingArea } = foreshadowingAreaValue;

    ChartSettings.iterateOverChartItems(
      (item: AnimatedLine | AnimatedCircle) => {
        // Sets foreshdowing area for the chart item
        const triggerForeshadow = () => {
          item.setForeshadowingArea(type, foreshadowingArea);

          if (type === ForeshadowingAreaSubjectType.RANGE) {
            const resetTo =
              Math.abs(
                ChartSettings.position.x - foreshadowingArea?.position.x
              ) / ChartSettings.dimensions.width;
            item.drawCurrentState({
              end: resetTo,
            });
          } else {
            item.drawCurrentState({
              end: ChartSettings.playbackExtent,
            });
          }
        };

        const isSelected =
          ChartSettings.isItemSelected(item.key) ||
          ChartSettings.isItemSelected(item.group);

        if (ChartSettings.selectedChartItems.length > 0) {
          if (isSelected) {
            triggerForeshadow();
          }
        } else {
          triggerForeshadow();
        }
      }
    );
  },
});

legendSubject.subscribe({
  next(key: any) {
    if (ChartSettings.isItemSelected(key)) {
      ChartSettings.removeSelectedChartItem(key);
    } else {
      ChartSettings.addSelectedChartItem(key);
    }
  },
});

watch(
  () => ChartSettings.selectedChartItems,
  (selectedItems: string[]) => {
    ChartSettings.iterateOverChartItems(
      (item: AnimatedLine | AnimatedCircle) => {
        let lineEffect;

        const isSelected =
          ChartSettings.isItemSelected(item.key) ||
          ChartSettings.isItemSelected(item.group);
        // No selected items then all lines should have default values
        if (selectedItems.length === 0) {
          lineEffect = Effect.DEFAULT;
        } else if (isSelected) {
          lineEffect = Effect.FOCUSED;
        } else {
          lineEffect = Effect.BACKGROUND;
          item.setForeshadowingArea(
            ForeshadowingAreaSubjectType.CLEAR,
            undefined
          );
        }

        item.setAppearanceFromEffect(lineEffect);
        item.drawCurrentState({
          end: ChartSettings.playbackExtent,
        });
      }
    );
  }
);

watch(
  () => ChartSettings.playbackExtent,
  (newValue, oldValue) => {
    ChartSettings.iterateOverChartItems(
      (item: AnimatedLine | AnimatedCircle) => {
        const isSelected =
          ChartSettings.isItemSelected(item.key) ||
          ChartSettings.isItemSelected(item.group);

        if (ChartSettings.selectedChartItems.length === 0) {
          item.drawCurrentState({
            start: oldValue,
            end: newValue,
          });
        } else if (isSelected) {
          item.drawCurrentState({
            start: oldValue,
            end: newValue,
          });
        }
      }
    );
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
          :ref="(el) => CanvasSettings.setCanvas(el, key as unknown as string)"
        ></canvas>
      </CanvasWrapper>
    </v-col>
  </v-row>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style></style>
