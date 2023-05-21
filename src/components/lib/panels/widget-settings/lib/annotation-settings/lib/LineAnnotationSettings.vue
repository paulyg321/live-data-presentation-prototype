<script lang="ts" setup>
import { StorySettings } from "@/state";
import { type Line, easeOptions } from "@/utils";
import _ from "lodash";
import { onMounted, reactive, ref, watch, watchEffect } from "vue";

const currentWidget = ref<Line>();
const lineSettings = reactive<{
  state: {
    animationDuration: number;
    animationEase: string;
    color: string;
    lineWidth: number;
    arrow: boolean;
    opacity: number;
  };
}>({
  state: {
    animationEase: "none",
    animationDuration: 1,
    color: "white",
    lineWidth: 4,
    arrow: false,
    opacity: 1,
  },
});

watchEffect(() => {
  currentWidget.value = StorySettings.currentStory?.currentWidget
    ?.layer as Line;
});

watch(currentWidget, handleUpdateLineSettings);
onMounted(handleUpdateLineSettings);

function handleUpdateLineSettings() {
  if (!currentWidget.value) return;

  lineSettings.state = _.mergeWith(
    lineSettings.state,
    currentWidget.value.state,
    (objValue, srcValue) => (srcValue ? srcValue : objValue)
  );
}

watch(
  () => {
    return {
      animationEase: lineSettings.state.animationEase,
      animationDuration: lineSettings.state.animationDuration,
      color: lineSettings.state.color,
      lineWidth: lineSettings.state.lineWidth,
      arrow: lineSettings.state.arrow,
      opacity: lineSettings.state.opacity,
    };
  },
  (state) => {
    currentWidget.value?.updateState(state);
    StorySettings.saveStories();
  }
);
</script>
<template>
  <v-row>
    <v-col lg="6">
      <v-btn @click="() => currentWidget?.handleUnveil()">Unveil</v-btn>
    </v-col>
    <v-col lg="6">
      <v-btn @click="() => currentWidget?.handleHide()">Hide</v-btn>
    </v-col>
    <v-col lg="12">
      <v-text-field
        v-model="lineSettings.state.animationDuration"
        type="number"
        label="Animation Duration"
        hint="How long the animation plays"
      ></v-text-field>
    </v-col>
    <v-col lg="12">
      <v-checkbox
        label="Display Arrow"
        v-model="lineSettings.state.arrow"
      ></v-checkbox>
    </v-col>
    <v-col lg="12">
      <v-select
        v-model="lineSettings.state.animationEase"
        label="Ease Fn"
        :items="easeOptions"
        hint="Applies ease functions and playback duration to each Individual tween or to the group"
      ></v-select>
    </v-col>
    <v-col>
      <v-text-field
        label="Color"
        v-model="lineSettings.state.color"
      ></v-text-field>
    </v-col>
    <v-col lg="12">
      <v-slider
        max="1"
        min="0"
        label="Opacity"
        v-model="lineSettings.state.opacity"
      ></v-slider>
    </v-col>
    <v-col lg="12">
      <v-slider
        max="15"
        min="0"
        label="Line Width"
        v-model="lineSettings.state.lineWidth"
      ></v-slider>
    </v-col>
  </v-row>
</template>
<style></style>
