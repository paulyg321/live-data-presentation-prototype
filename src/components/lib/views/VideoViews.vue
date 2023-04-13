<script setup lang="ts">
// import { onMounted } from "vue";
import { CanvasSettings } from "../app-settings/settings-state";

type VideoViewsProps = {
  className?: string;
  id: string;
};
const props = defineProps<VideoViewsProps>();
</script>

<template>
  <canvas
    :width="CanvasSettings.dimensions.width"
    :height="CanvasSettings.dimensions.height"
    :class="className"
    :ref="(el) => CanvasSettings.setCanvas(el, `video-${id}`)"
  ></canvas>
</template>

<style></style>
