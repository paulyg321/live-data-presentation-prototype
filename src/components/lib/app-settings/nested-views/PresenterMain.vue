<script setup lang="ts">
import { AnimatedLine, DrawingMode } from "@/utils";
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
} from "../settings-state";
import * as d3 from "d3";

const route = useRoute();
ChartSettings.setCurrentChart(parseInt(route.params.id as string));

const animationBounds = ref(1);
const drawingMode = ref(DrawingMode.SEQUENTIAL);

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
  () => animationBounds.value,
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
        mode: drawingMode.value,
      });
    } else if (type === "next") {
      line.animateToNextState({
        ctx,
        playRemainingStates: false,
        // Call like this so we don't lose the this context in ThreePointBezier
        transitionFunction: (time: number) =>
          d3.easeExpIn(Math.min(1, time + 0.5)),
        mode: drawingMode.value,
      });
    } else if (type === "all") {
      line.animateToNextState({
        ctx,
        playRemainingStates: true,
        // Call like this so we don't lose the this context in ThreePointBezier
        transitionFunction: d3.easeElasticOut,
        mode: drawingMode.value,
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
  Object.entries(animation.value).forEach(([key, value]: any) => {
    CanvasSettings.initializeCanvas(key, false);
    value.drawCurrentState({
      ctx: CanvasSettings.canvasCtx[key],
    });
  });
});
</script>
<!---------------------------------------------------------------------------------------------------------->
<template>
  <v-row class="justify-center">
    <v-col lg="12">
      <v-select
        label="Animation"
        :items="[
          DrawingMode.CONCURRENT,
          DrawingMode.DROP,
          DrawingMode.SEQUENTIAL,
          DrawingMode.SEQUENTIAL_TRANSITION,
        ]"
        v-model="drawingMode"
      ></v-select>
    </v-col>
    <v-col lg="12">
      <v-slider
        v-model="animationBounds"
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
        <ChartAxes
          :width="CanvasSettings.canvasWidth"
          :height="CanvasSettings.canvasWidth"
          :xAxis="xAxis"
          :yAxis="yAxis"
          :chartBounds="chartBounds"
          :chartSize="0.75"
        />
        <canvas
          v-for="(_, key) in animation"
          v-bind:key="key"
          :width="CanvasSettings.canvasWidth"
          :height="CanvasSettings.canvasHeight"
          :class="className"
          :ref="(el) => CanvasSettings.setCanvas(el as HTMLCanvasElement, key as unknown as string)"
        ></canvas>
      </CanvasWrapper>
    </v-col>
  </v-row>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style></style>
