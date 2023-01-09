<script setup lang="ts">
import { CanvasSettings } from "../app-settings/settings-state";
import WindowPortal from "../window-portal/WindowPortal.vue";
import VideoViews from "./VideoViews.vue";

type PresenterViewsProps = {
  open: boolean;
  handleClose: () => void;
};

defineProps<PresenterViewsProps>();
</script>

<template>
  <WindowPortal :open="open" @on-close="handleClose">
    <VideoViews
      :width="CanvasSettings.canvasWidth"
      :height="CanvasSettings.canvasHeight"
      :canvas="CanvasSettings.canvas['video']"
      :canvasCtx="CanvasSettings.canvasCtx['video']"
    />
  </WindowPortal>
</template>

<style></style>
