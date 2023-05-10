<script setup lang="ts">
import { CanvasSettings } from "@/state";

type VideoViewsProps = {
  className?: string;
  id: string;
};
defineProps<VideoViewsProps>();
</script>

<template>
  <canvas
    :width="CanvasSettings.dimensions.width"
    :height="CanvasSettings.dimensions.height"
    :class="className"
    :ref="(el) => CanvasSettings.setCanvas(el as HTMLCanvasElement, `video-${id}`)"
  ></canvas>
</template>

<style></style>
