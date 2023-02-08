<script setup lang="ts">
import { AnimatedLine, Legend } from "@/utils";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import CanvasWrapper from "../../CanvasWrapper.vue";
import ChartAxes from "../../axes/ChartAxes.vue";
import {
  ChartSettings,
  CanvasSettings,
  xScale,
  yScale,
  xAxis,
  yAxis,
  chartBounds,
  gestureTracker,
  LegendSettings,
  radialPlaybackTracker,
  temporalPlaybackTracker,
animationTrack,
} from "../settings-state";
import * as d3 from "d3";
import VideoViews from "../../views/VideoViews.vue";
import { Subject } from "rxjs";

const route = useRoute();
ChartSettings.setCurrentChart(parseInt(route.params.id as string));
const legendSubject = new Subject();

legendSubject.subscribe({
  next(value: any) {
    if (checkedLines.value.includes(value)) {
      checkedLines.value = checkedLines.value.filter((line: any) => {
        return line !== value;
      });
    } else {
      checkedLines.value.push(value);
    }
  },
});

// Watch each tracker for the values they emit
radialPlaybackTracker.value.playbackSubject.subscribe({
  next(value) {
    if (value === true) {
      handlePlayState("next");
    }
  },
});

radialPlaybackTracker.value.trackingSubject.subscribe({
  next(value: any) {
    animationTrack.value = value;
  },
});

temporalPlaybackTracker.value.trackingSubject.subscribe({
  next(value: any) {
    animationTrack.value = value;
  },
});

const animation = computed(() => {
  return ChartSettings.currentChart?.getAnimatedChartItems({
    xScale: xScale.value,
    yScale: yScale.value,
    chartDimensions: {
      width: ChartSettings.chartWidth,
      height: ChartSettings.chartHeight,
    },
    canvasDimensions: {
      width: CanvasSettings.canvasWidth,
      height: CanvasSettings.canvasHeight,
    },
    duration: 3000,
  });
});

const canvasKeys = computed(() => {
  // to create canvases for both the legend and the lines
  return Object.entries(animation.value).reduce((keys, [key]: any) => {
    return [...keys, key, `${key}-legend`];
  }, [] as string[]);
});

// TODO: Watch for changes in legend and redraw to allow settings modification
const legend = computed(() => {
  return Object.entries(animation.value).reduce(
    (legends, [key, animation]: any, index: number) => {
      return {
        ...legends,
        [`${key}-legend`]: new Legend({
          label: key,
          color: animation.color,
          position: {
            x: LegendSettings.xPosition,
            y: LegendSettings.yPosition + index * LegendSettings.height,
          },
          line: animation,
          gestureTracker: gestureTracker.value,
          legendSubject,
        }),
      };
    },
    {} as { [key: string]: Legend }
  );
});

watch(
  () => chartBounds.value,
  () => {
    Object.entries(animation.value).forEach(([key, value]: any) => {
      value.drawCurrentState({
        ctx: CanvasSettings.canvasCtx[key],
      });
    });
  }
);

watch(
  () => animationTrack.value,
  (newValue, oldValue) => {
    Object.entries(animation.value).forEach(([key, value]: any) => {
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
  function play({ line, ctx }: { line: AnimatedLine; ctx: any }) {
    if (type === "prev") {
      line.animateToPreviousState({
        ctx,
        playRemainingStates: false,
        // Call like this so we don't lose the this context in ThreePointBezier
        transitionFunction: d3.easeElasticOut.amplitude(1).period(0.163),
        mode: ChartSettings.drawingMode,
      });
    } else if (type === "next") {
      line.animateToNextState({
        ctx,
        playRemainingStates: false,
        // Call like this so we don't lose the this context in ThreePointBezier
        transitionFunction: (time: number) =>
          d3.easeExpIn(Math.min(1, time + 0.5)),
        mode: ChartSettings.drawingMode,
      });
    } else if (type === "all") {
      line.animateToNextState({
        ctx,
        playRemainingStates: true,
        // Call like this so we don't lose the this context in ThreePointBezier
        transitionFunction: d3.easeElasticOut,
        mode: ChartSettings.drawingMode,
      });
    }
  }

  Object.entries(animation.value).forEach(([key, value]: any) => {
    if (checkedLines.value.length === 0) {
      play({
        line: value,
        ctx: CanvasSettings.canvasCtx[key],
      });
      return;
    } else if (checkedLines.value.includes(key)) {
      play({
        line: value,
        ctx: CanvasSettings.canvasCtx[key],
      });
      return;
    }
  });
}

const checkedLines = ref<string[]>([]);

onMounted(() => {
  CanvasSettings.initializeCanvas("dialing", false);
  CanvasSettings.initializeCanvas("emphasis", false);
  CanvasSettings.initializeCanvas("foreshadowing", false);
  if (CanvasSettings.canvasCtx["dialing"]) {
    radialPlaybackTracker.value.renderReferencePoints({
      ctx: CanvasSettings.canvasCtx["dialing"],
      canvasDim: {
        width: CanvasSettings.canvasWidth,
        height: CanvasSettings.canvasHeight,
      },
    });
  }

  canvasKeys.value.forEach((key: string) => {
    CanvasSettings.initializeCanvas(key, false);
    if (key.includes("legend")) {
      legend.value[key].drawLegend({
        ctx: CanvasSettings.canvasCtx[key],
      });
    } else {
      animation.value[key].drawCurrentState({
        ctx: CanvasSettings.canvasCtx[key],
      });
    }
  });
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
    <v-col lg="12">
      <div v-for="(_, key) in animation" v-bind:key="key">
        <input
          type="checkbox"
          :id="`${key}`"
          :value="key"
          v-model="checkedLines"
        />
        <label :for="`${key}`">{{ key }}</label>
      </div>
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
        :width="CanvasSettings.canvasWidth"
        :height="CanvasSettings.canvasHeight"
        v-slot="{ className }"
      >
        <VideoViews :className="className" />
        <ChartAxes
          :width="CanvasSettings.canvasWidth"
          :height="CanvasSettings.canvasWidth"
          :xAxis="xAxis"
          :yAxis="yAxis"
          :chartBounds="chartBounds"
          :chartSize="0.75"
        />
        <canvas
          v-for="key in canvasKeys"
          v-bind:key="key"
          :width="CanvasSettings.canvasWidth"
          :height="CanvasSettings.canvasHeight"
          :class="className"
          :ref="(el) => CanvasSettings.setCanvas(el, key as unknown as string)"
        ></canvas>
        <canvas
          :width="CanvasSettings.canvasWidth"
          :height="CanvasSettings.canvasHeight"
          :class="className"
          :ref="(el) => CanvasSettings.setCanvas(el, 'dialing')"
        ></canvas>
        <canvas
          :width="CanvasSettings.canvasWidth"
          :height="CanvasSettings.canvasHeight"
          :class="className"
          :ref="(el) => CanvasSettings.setCanvas(el, 'emphasis')"
        ></canvas>
        <canvas
          :width="CanvasSettings.canvasWidth"
          :height="CanvasSettings.canvasHeight"
          :class="className"
          :ref="(el) => CanvasSettings.setCanvas(el, 'foreshadowing')"
        ></canvas>
      </CanvasWrapper>
    </v-col>
  </v-row>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style></style>
