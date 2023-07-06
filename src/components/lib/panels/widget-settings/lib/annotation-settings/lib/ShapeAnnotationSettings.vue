<script lang="ts" setup>
import { StorySettings } from "@/state";
import { easeOptions, type Circle, Rect } from "@/utils";
import _ from "lodash";
import { onMounted, reactive, ref, watch, watchEffect } from "vue";

const currentWidget = ref<Circle | Rect>();
const shapeSettings = reactive<{
  state: {
    animationDuration: number;
    animationEase: string;
    color: string;
    lineWidth: number;
    fill: boolean;
    maxOpacity: number;
    isPermanent: boolean;
  };
}>({
  state: {
    animationEase: "none",
    animationDuration: 1,
    color: "white",
    lineWidth: 4,
    fill: false,
    maxOpacity: 1,
    isPermanent: false,
  },
});

watchEffect(() => {
  currentWidget.value = StorySettings.currentStory?.currentWidget?.layer as
    | Circle
    | Rect;
});

watch(currentWidget, handleUpdateShapeSettings);
onMounted(handleUpdateShapeSettings);

function handleUpdateShapeSettings() {
  if (!currentWidget.value) return;

  shapeSettings.state = _.mergeWith(
    shapeSettings.state,
    currentWidget.value.state,
    (objValue, srcValue) => (srcValue ? srcValue : objValue)
  );
}

watch(
  () => {
    return {
      animationEase: shapeSettings.state.animationEase,
      animationDuration: shapeSettings.state.animationDuration,
      color: shapeSettings.state.color,
      lineWidth: shapeSettings.state.lineWidth,
      fill: shapeSettings.state.fill,
      maxOpacity: shapeSettings.state.maxOpacity,
      isPermanent: shapeSettings.state.isPermanent,
    };
  },
  (state) => {
    currentWidget.value?.updateState(state);
  },
  { immediate: false }
);
</script>
<template>
  <v-row>
    <v-col lg="6">
      <v-btn block @click="() => currentWidget?.handleUnveil()">Unveil</v-btn>
    </v-col>
    <v-col lg="6">
      <v-btn block @click="() => currentWidget?.handleHide()">Hide</v-btn>
    </v-col>
    <v-col lg="12">
      <v-checkbox
        label="Keep Permanent"
        v-model="shapeSettings.state.isPermanent"
      ></v-checkbox>
    </v-col>
    <v-col lg="12">
      <v-text-field
        v-model="shapeSettings.state.animationDuration"
        type="number"
        label="Animation Duration"
        hint="How long the animation plays"
      ></v-text-field>
    </v-col>
    <v-col lg="12">
      <v-checkbox
        label="Fill Shape"
        v-model="shapeSettings.state.fill"
      ></v-checkbox>
    </v-col>
    <v-col lg="12">
      <v-autocomplete
        v-model="shapeSettings.state.animationEase"
        label="Ease Fn"
        :items="easeOptions"
        hint="Applies ease functions and playback duration to each Individual tween or to the group"
      ></v-autocomplete>
    </v-col>
    <v-col lg="12">
      <v-slider
        max="1"
        min="0"
        label="Opacity"
        thumb-label="always"
        v-model="shapeSettings.state.maxOpacity"
      ></v-slider>
    </v-col>
    <v-col lg="12">
      <v-slider
        max="15"
        min="0"
        label="Line Width"
        thumb-label="always"
        v-model="shapeSettings.state.lineWidth"
      ></v-slider>
    </v-col>
    <v-col lg="12" class="d-flex justify-center">
      <v-color-picker
        v-model="shapeSettings.state.color"
        label="Color"
        mode="hex"
      ></v-color-picker>
    </v-col>
  </v-row>
</template>
<style></style>
