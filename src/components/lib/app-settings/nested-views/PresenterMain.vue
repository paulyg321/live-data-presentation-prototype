<script setup lang="ts">
import {
  DrawingMode,
  LineEffect,
  type AnimatedLine,
  type Coordinate2D,
  type Dimensions,
} from "@/utils";
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import CanvasWrapper from "../../CanvasWrapper.vue";
import ChartAxes from "../../axes/ChartAxes.vue";
import {
  ChartSettings,
  CanvasSettings,
  animationTrack,
  linearTrackerSubject,
  radialDiscreteTrackerSubject,
  radialContinuousTrackerSubject,
  radialPlaybackTracker,
  emphasisTracker,
  foreshadowingTracker,
  foreshadowingTrackerSubject,
  LegendSettings,
  gestureCanvasKeys,
  foreshadowingAreaSubject,
} from "../settings-state";
import * as d3 from "d3";
import VideoViews from "../../views/VideoViews.vue";

const route = useRoute();
ChartSettings.setCurrentChart(parseInt(route.params.id as string));

const checkedLines = ref<string[]>([]);

LegendSettings.legendSubject.subscribe({
  next(value: any) {
    if (checkedLines.value.includes(value)) {
      checkedLines.value = checkedLines.value.filter((line: any) => {
        return line !== value;
      });
    } else {
      checkedLines.value = [...checkedLines.value, value];
    }
  },
});

linearTrackerSubject.value?.subscribe({
  next(value: any) {
    animationTrack.value = value;
  },
});

radialDiscreteTrackerSubject.value?.subscribe({
  next(value: any) {
    animationTrack.value = value;
  },
});

foreshadowingTrackerSubject.value?.subscribe({
  next(value: any) {
    animationTrack.value = value;
  },
});

foreshadowingAreaSubject.value?.subscribe({
  next(foreshadowingArea: { position: Coordinate2D; dimensions: Dimensions }) {
    Object.entries(
      ChartSettings.currentChart?.getAnimatedElements() ?? {}
    ).forEach(([key, value]: [string, AnimatedLine]) => {
      // Sets foreshdowing area for the chart item
      const triggerForeshadow = () => {
        value.setForeshadowingArea(foreshadowingArea);
        value.drawCurrentState({
          bounds: {
            end: animationTrack.value,
          },
          drawingMode: DrawingMode.CONCURRENT,
        });
      };

      if (checkedLines.value.length > 0) {
        if (checkedLines.value.includes(key)) {
          triggerForeshadow();
        }
      } else {
        triggerForeshadow();
      }
    });
  },
});

radialContinuousTrackerSubject.value?.subscribe({
  next(value: any) {
    if (value === true) {
      handlePlayState("next");
    }
  },
});

watch(checkedLines, () => {
  Object.entries(
    ChartSettings.currentChart?.getAnimatedElements() ?? {}
  ).forEach(([key, value]: [string, AnimatedLine]) => {
    let lineEffect = LineEffect.DEFAULT;
    if (checkedLines.value.length > 0) {
      if (checkedLines.value.includes(key)) {
        lineEffect = LineEffect.FOCUSED;
      } else {
        lineEffect = LineEffect.BACKGROUND;
      }
    }

    value.setLineAppearanceFromEffect(lineEffect);
    value.drawCurrentState({
      bounds: {
        end: animationTrack.value,
      },
      drawingMode: DrawingMode.CONCURRENT,
    });
  });
});

watch(
  () => animationTrack.value,
  (newValue, oldValue) => {
    Object.entries(
      ChartSettings.currentChart?.getAnimatedElements() ?? {}
    ).forEach(([key, value]: any) => {
      if (checkedLines.value.length === 0) {
        value.drawCurrentState({
          ctx: CanvasSettings.canvasCtx[key],
          bounds: {
            start: oldValue,
            end: newValue,
          },
        });
        return;
      } else if (checkedLines.value.includes(key)) {
        value.drawCurrentState({
          ctx: CanvasSettings.canvasCtx[key],
          bounds: {
            start: oldValue,
            end: newValue,
          },
        });
        return;
      }
    });
  }
);

function handlePlayState(type: string) {
  function play({ line }: { line: AnimatedLine }) {
    if (type === "prev") {
      line.animateToPreviousState({
        playRemainingStates: false,
        // Call like this so we don't lose the this context in ThreePointBezier
        transitionFunction: d3.easeElasticOut.amplitude(1).period(0.163),
        mode: ChartSettings.drawingMode,
      });
    } else if (type === "next") {
      line.animateToNextState({
        playRemainingStates: false,
        // Call like this so we don't lose the this context in ThreePointBezier
        transitionFunction: (time: number) =>
          d3.easeExpIn(Math.min(1, time + 0.5)),
        mode: ChartSettings.drawingMode,
      });
    } else if (type === "all") {
      line.animateToNextState({
        playRemainingStates: true,
        // Call like this so we don't lose the this context in ThreePointBezier
        transitionFunction: d3.easeElasticOut,
        mode: ChartSettings.drawingMode,
      });
    }
  }

  Object.entries(
    ChartSettings.currentChart?.getAnimatedElements() ?? {}
  ).forEach(([key, value]: any) => {
    if (checkedLines.value.length === 0) {
      play({
        line: value,
      });
      return;
    } else if (checkedLines.value.includes(key)) {
      play({
        line: value,
      });
      return;
    }
  });
}

onMounted(() => {
  /**
   * Get keys of all the lines/chart items to be plotted and create a legend key for them
   * This gets used to render the canvases needed for the items and their legend items
   *
   * the keys are used to access the canvas Contexts using CanvasSettings.canvasCtx[<key>]
   */

  // Do whatever you need to do with canvasCtx after this
  ChartSettings.currentChart?.setContext(CanvasSettings.canvasCtx);
  ChartSettings.currentChart?.draw();

  LegendSettings.initializeLegendItems();
  LegendSettings.drawLegendItems();

  // Possibly move these to gesture-settings state
  if (CanvasSettings.canvasCtx["dialing"]) {
    radialPlaybackTracker.value.setContext(CanvasSettings.canvasCtx["dialing"]);
    radialPlaybackTracker.value.renderReferencePoints();
  }

  if (CanvasSettings.canvasCtx["emphasis"]) {
    emphasisTracker.value.setContext(CanvasSettings.canvasCtx["emphasis"]);
    emphasisTracker.value.renderReferencePoints();
  }

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
        v-model="animationTrack"
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
        @click="() => handlePlayState('prev')"
      ></v-btn>
    </v-col>
    <v-col lg="3">
      <v-btn
        icon="mdi-play"
        color="primary"
        @click="() => handlePlayState('all')"
      ></v-btn>
    </v-col>
    <v-col lg="3">
      <v-btn
        icon="mdi-skip-forward"
        @click="() => handlePlayState('next')"
      ></v-btn>
    </v-col>
  </v-row>
  <v-row>
    <v-col lg="12">
      <CanvasWrapper
        :width="CanvasSettings.dimensions.width"
        :height="CanvasSettings.dimensions.height"
        v-slot="{ className }"
      >
        <VideoViews :className="className" />
        <ChartAxes :className="className" />
        <canvas
          v-for="key in [...ChartSettings.canvasKeys, ...gestureCanvasKeys]"
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
