<script lang="ts" setup>
import { StorySettings } from "@/state";
import { easeOptions, SvgAnnotation, type SVGPrimitive } from "@/utils";
import _ from "lodash";
import { onMounted, reactive, ref, watch, watchEffect } from "vue";
import * as d3 from "d3";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

const currentWidget = ref<SvgAnnotation>();
const svgSettings = reactive<{
  state: {
    animationDuration: number;
    animationEase: string;
    color: string;
    alternateColor: string;
    lineWidth: number;
    fill: boolean;
    maxOpacity: number;
    path: string;
    isPermanent: boolean;
  };
}>({
  state: {
    animationEase: "none",
    animationDuration: 1,
    color: "white",
    alternateColor: "black",
    lineWidth: 4,
    fill: false,
    maxOpacity: 1,
    path: "",
    isPermanent: false,
  },
});

watchEffect(() => {
  currentWidget.value = StorySettings.currentStory?.currentWidget
    ?.layer as SvgAnnotation;
});

watch(currentWidget, handleUpdatesvgSettings);
onMounted(handleUpdatesvgSettings);

function handleUpdatesvgSettings() {
  if (!currentWidget.value) return;

  svgSettings.state = _.mergeWith(
    svgSettings.state,
    currentWidget.value.state,
    (objValue, srcValue) => (srcValue ? srcValue : objValue)
  );
}

watch(
  () => {
    return {
      animationEase: svgSettings.state.animationEase,
      animationDuration: svgSettings.state.animationDuration,
      color: svgSettings.state.color,
      alternateColor: svgSettings.state.alternateColor,
      lineWidth: svgSettings.state.lineWidth,
      fill: svgSettings.state.fill,
      maxOpacity: svgSettings.state.maxOpacity,
      isPermanent: svgSettings.state.isPermanent,
    };
  },
  (state) => {
    currentWidget.value?.updateState(state);
  }
);

function handleSavePath() {
  const element = d3
    .select("#st0")
    .attr("d", svgSettings.state.path)
    .clone()
    .attr("id", "remove")
    .node() as SVGPrimitive;

  if (element) {
    const newPath = MorphSVGPlugin.convertToPath(element)[0];
    currentWidget.value?.updateState({
      path: {
        parsedPath: MorphSVGPlugin.getRawPath(newPath),
        xSize: element.getBoundingClientRect().width,
        ySize: element.getBoundingClientRect().height,
      },
    });
  }

  d3.select("#drawing-board").selectAll("#remove").remove();
}
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
        v-model="svgSettings.state.isPermanent"
      ></v-checkbox>
    </v-col>
    <v-col lg="12">
      <v-text-field
        v-model="svgSettings.state.animationDuration"
        type="number"
        label="Animation Duration"
        hint="How long the animation plays"
      ></v-text-field>
    </v-col>
    <v-col lg="12">
      <v-autocomplete
        v-model="svgSettings.state.animationEase"
        label="Ease Fn"
        :items="easeOptions"
        hint="Applies ease functions and playback duration to each Individual tween or to the group"
      ></v-autocomplete>
    </v-col>
    <v-col>
      <v-text-field
        label="Color"
        v-model="svgSettings.state.color"
      ></v-text-field>
    </v-col>
    <v-col lg="12">
      <v-slider
        max="1"
        min="0"
        label="Opacity"
        thumb-label="always"
        v-model="svgSettings.state.maxOpacity"
      ></v-slider>
    </v-col>
    <v-col lg="12">
      <v-slider
        max="15"
        min="0"
        label="Line Width"
        thumb-label="always"
        v-model="svgSettings.state.lineWidth"
      ></v-slider>
    </v-col>
    <v-col lg="12">
      <v-textarea
        label="SVG Path"
        v-model="svgSettings.state.path"
      ></v-textarea>
      <v-btn :disabled="!svgSettings.state.path" @click="handleSavePath"
        >Save Path</v-btn
      >
    </v-col>
    <v-col lg="12" class="d-flex justify-center">
      <v-color-picker
        v-model="svgSettings.state.color"
        label="Color"
        mode="hex"
      ></v-color-picker>
    </v-col>
    <v-col lg="12" class="d-flex justify-center">
      <v-color-picker
        v-model="svgSettings.state.alternateColor"
        label="Color"
        mode="hex"
      ></v-color-picker>
    </v-col>
  </v-row>
</template>
<style></style>
