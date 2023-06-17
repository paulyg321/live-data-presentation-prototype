<script lang="ts" setup>
import { StorySettings } from "@/state";
import { type Text, easeOptions } from "@/utils";
import _ from "lodash";
import { onMounted, reactive, ref, watch, watchEffect } from "vue";

const currentWidget = ref<Text>();
const textSettings = reactive<{
  state: {
    animationDuration: number;
    animationEase: string;
    color: string;
    fontSize: number;
    text: string;
    maxOpacity: number;
    isPermanent: boolean;
  };
}>({
  state: {
    animationEase: "none",
    animationDuration: 1,
    color: "white",
    fontSize: 16,
    text: "Text",
    maxOpacity: 1,
    isPermanent: false,
  },
});

watchEffect(() => {
  currentWidget.value = StorySettings.currentStory?.currentWidget
    ?.layer as Text;
});

watch(currentWidget, handleUpdateTextSettings);
onMounted(handleUpdateTextSettings);

function handleUpdateTextSettings() {
  if (!currentWidget.value) return;

  textSettings.state = _.mergeWith(
    textSettings.state,
    currentWidget.value.state,
    (objValue, srcValue) => (srcValue ? srcValue : objValue)
  );
}

watch(
  () => {
    return {
      animationEase: textSettings.state.animationEase,
      animationDuration: textSettings.state.animationDuration,
      color: textSettings.state.color,
      fontSize: textSettings.state.fontSize,
      text: textSettings.state.text,
      maxOpacity: textSettings.state.maxOpacity,
      isPermanent: textSettings.state.isPermanent,
    };
  },
  (state) => {
    currentWidget.value?.updateState(state);
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
      <v-checkbox
        label="Keep Permanent"
        v-model="textSettings.state.isPermanent"
      ></v-checkbox>
    </v-col>
    <v-col lg="12">
      <v-text-field
        v-model="textSettings.state.animationDuration"
        type="number"
        label="Animation Duration"
        hint="How long the animation plays"
      ></v-text-field>
    </v-col>
    <v-col lg="12">
      <v-text-field
        label="Text"
        v-model="textSettings.state.text"
      ></v-text-field>
    </v-col>
    <v-col lg="12">
      <v-autocomplete
        v-model="textSettings.state.animationEase"
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
        v-model="textSettings.state.maxOpacity"
      ></v-slider>
    </v-col>
    <v-col lg="12">
      <v-text-field
        max="100"
        min="0"
        label="Font Size"
        type="number"
        v-model="textSettings.state.fontSize"
      ></v-text-field>
    </v-col>
    <v-col lg="12" class="d-flex justify-center">
      <v-color-picker
        v-model="textSettings.state.color"
        label="Color"
        mode="hex"
      ></v-color-picker>
    </v-col>
  </v-row>
</template>
<style></style>
