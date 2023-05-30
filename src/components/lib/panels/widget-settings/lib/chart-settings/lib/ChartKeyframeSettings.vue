<script setup lang="ts">
import { StorySettings, currentChart } from "@/state";
import { onMounted, ref, watch, watchEffect } from "vue";

const keyframes = ref<string[]>();
const playbackSliderRange = ref<number[]>([0, 1]);

watchEffect(() => {
  keyframes.value = currentChart.value?.state.keyframes;
});

function handleUpdateChart() {
  currentChart.value?.updateState({
    startKeyframeIndex: playbackSliderRange.value[0],
    endKeyframeIndex: playbackSliderRange.value[1],
  });
  StorySettings.saveStories();
};

watch(currentChart, handleUpdateForm);

onMounted(handleUpdateForm);

function handleUpdateForm() {
  if (currentChart.value) {
    playbackSliderRange.value = [
      currentChart.value.state.startKeyframeIndex,
      currentChart.value.state.endKeyframeIndex,
    ];
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
