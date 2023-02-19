<script setup lang="ts">
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
    <VideoViews />
  </WindowPortal>
</template>

<style></style>
