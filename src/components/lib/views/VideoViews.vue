<script setup lang="ts">
import { onMounted } from "vue";
import { CanvasSettings } from "../app-settings/settings-state";

type VideoViewsProps = {
  className?: string;
};
const props = defineProps<VideoViewsProps>();

onMounted(() => {
  CanvasSettings.initializeCanvas("video", true);
});
</script>

<template>
  <canvas
    :width="CanvasSettings.canvasWidth"
    :height="CanvasSettings.canvasHeight"
    :class="className"
    :ref="(el) => CanvasSettings.setCanvas(el as HTMLCanvasElement, 'video')"
  ></canvas>
</template>

<style></style>
