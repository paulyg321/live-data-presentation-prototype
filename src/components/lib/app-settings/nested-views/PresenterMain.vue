<script setup lang="ts">
import { ThreePointBezierCurve } from "@/utils";
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

const route = useRoute();
ChartSettings.setCurrentChart(parseInt(route.params.id as string));

const threePointBezierCurve = new ThreePointBezierCurve();

const lines = computed(() => {
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
    Object.entries(lines.value).forEach(([key, value]: any) => {
      value.drawCurrentState({
        ctx: CanvasSettings.canvasCtx[key],
      });
    });
  }
);

function handlePlayState(direction: string) {
  function play({ line, ctx }: { line: any; ctx: any }) {
    if (direction === "prev") {
      line.animateToPreviousState({
        ctx,
        playRemainingStates: true,
        // Call like this so we don't lose the this context in ThreePointBezier
        transitionFunction: (time: number) =>
          threePointBezierCurve.easeOut(time),
      });
    } else {
      line.animateToNextState({
        ctx,
        playRemainingStates: true,
        // Call like this so we don't lose the this context in ThreePointBezier
        transitionFunction: (time: number) => threePointBezierCurve.easeOut(time),
      });
    }
  }

  Object.entries(lines.value).forEach(([key, value]: any) => {
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
  Object.entries(lines.value).forEach(([key, value]: any) => {
    CanvasSettings.initializeCanvas(key);
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
      <div v-for="(_, key) in lines" v-bind:key="key">
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
      <v-btn icon="mdi-play" color="primary"></v-btn>
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
          v-for="(_, key) in lines"
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
