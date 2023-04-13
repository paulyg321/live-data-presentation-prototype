<script setup lang="ts">
import WindowPortal from "../window-portal/WindowPortal.vue";
import VideoViews from "./VideoViews.vue";
import AppCanvas from "../AppCanvas.vue";
import CanvasWrapper from "../CanvasWrapper.vue";
import { CanvasSettings } from "../app-settings/settings-state";

type PresenterViewsProps = {
  open: boolean;
  handleClose: () => void;
  id: string;
};

defineProps<PresenterViewsProps>();
</script>

<template>
  <WindowPortal :open="open" @on-close="handleClose">
    <CanvasWrapper
      :width="CanvasSettings.dimensions.width"
      :height="CanvasSettings.dimensions.height"
      v-slot="{ className }"
    >
      <VideoViews :id="id" :className="className" />
      <AppCanvas :id="id" :className="className" />
    </CanvasWrapper>
  </WindowPortal>
</template>

<style></style>
