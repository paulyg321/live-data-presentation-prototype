<script setup lang="ts">
import {
  VideoCanvas,
  AppCanvas,
  CanvasWrapper,
  MainPortal,
} from "@/components";
import { CanvasSettings } from "@/state";

type PresenterViewsProps = {
  open: boolean;
  handleClose: () => void;
  id: string;
};

defineProps<PresenterViewsProps>();
</script>

<template>
  <MainPortal :open="open" @on-close="handleClose">
    <CanvasWrapper
      :width="CanvasSettings.dimensions.width"
      :height="CanvasSettings.dimensions.height"
      v-slot="{ className }"
    >
      <VideoCanvas :id="id" :className="className" />
      <AppCanvas :id="id" :className="className" />
    </CanvasWrapper>
  </MainPortal>
</template>

<style></style>
