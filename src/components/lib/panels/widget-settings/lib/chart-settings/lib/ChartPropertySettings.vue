<script setup lang="ts">
import {  currentChart } from "@/state";
import { onMounted, ref, watch, watchEffect } from "vue";

const keyframes = ref<string[]>();
const playbackSliderRange = ref<number[]>([0, 1]);
const selectedOpacity = ref<number>(1);
const unselectedOpacity = ref<number>(0.3);
const foreshadowOpacity = ref<number>(1);

watchEffect(() => {
  keyframes.value = currentChart.value?.state.keyframes;
});

function handleUpdateChart() {
  currentChart.value?.updateState({
    startKeyframeIndex: playbackSliderRange.value[0],
    endKeyframeIndex: playbackSliderRange.value[1],
    selectedOpacity: selectedOpacity.value,
    unselectedOpacity: unselectedOpacity.value,
    foreshadowOpacity: foreshadowOpacity.value,
  });
}

watch(currentChart, handleUpdateForm);

onMounted(handleUpdateForm);

function handleUpdateForm() {
  if (currentChart.value) {
    playbackSliderRange.value = [
      currentChart.value.state.startKeyframeIndex,
      currentChart.value.state.endKeyframeIndex,
    ];
    selectedOpacity.value = currentChart.value.state.selectedOpacity;
    unselectedOpacity.value = currentChart.value.state.unselectedOpacity;
    foreshadowOpacity.value = currentChart.value.state.foreshadowOpacity;
  }
}
</script>
<template>
  <v-container>
    <v-form @submit.prevent="handleUpdateChart">
      <v-row class="pt-6">
        <v-col lg="12">
          <v-range-slider
            v-model="playbackSliderRange"
            :ticks="Object.assign({}, keyframes)"
            :show-ticks="false"
            thumb-label="always"
            min="0"
            :max="(keyframes?.length ?? 1) - 1"
            :step="1"
            density="compact"
            label="Start & End Keyframes"
          >
            <template v-slot:thumb-label="{ modelValue }">
              <div class="text-body" v-if="keyframes">
                {{ keyframes[modelValue] }}
              </div>
            </template>
          </v-range-slider>
        </v-col>
        <v-row>
          <v-col lg="12">
            <v-slider
              max="1"
              min="0"
              label="Selected Opacity"
              thumb-label="always"
              v-model="selectedOpacity"
            ></v-slider>
          </v-col>
          <v-col lg="12">
            <v-slider
              max="1"
              min="0"
              label="Unselected Opacity"
              thumb-label="always"
              v-model="unselectedOpacity"
            ></v-slider>
          </v-col>
          <v-col lg="12">
            <v-slider
              max="1"
              min="0"
              label="Foreshadow Opacity"
              thumb-label="always"
              v-model="foreshadowOpacity"
            ></v-slider>
          </v-col>
        </v-row>
      </v-row>
      <v-row>
        <v-col lg="12">
          <v-btn type="submit" size="large" block color="primary"> Save </v-btn>
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>
<style></style>
