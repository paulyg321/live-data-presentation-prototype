<script setup lang="ts">
import { StorySettings, currentChart } from "@/state";
import { onMounted, ref, watch, watchEffect } from "vue";

const keyframes = ref<string[]>();

watchEffect(() => {
  keyframes.value = currentChart.value?.state.keyframes;
});

const beginningKeyframe = ref();

watch(beginningKeyframe, () => {
  currentChart.value?.updateState({
    beginningKeyframeIndex: keyframes.value?.indexOf(beginningKeyframe.value),
  });
  StorySettings.saveStories();
});

watch(currentChart, handleUpdateForm);

onMounted(handleUpdateForm);

function handleUpdateForm() {
  if (keyframes.value && currentChart.value) {
    beginningKeyframe.value =
      keyframes.value[currentChart.value.state.beginningKeyframeIndex];
  }
}
</script>
<template>
  <v-container>
    <v-row>
      <v-col>
        <v-select
          v-model="beginningKeyframe"
          label="Animation End Keyframe"
          :items="keyframes"
          hint="Select the final keyframe you to set playback to"
        ></v-select>
      </v-col>
    </v-row>
  </v-container>
</template>
<style></style>
